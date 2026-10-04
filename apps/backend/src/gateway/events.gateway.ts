import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TranscriptionService } from '../transcription/transcription.service';
import { TranscriptService } from '../modules/transcript/transcript.service';
import { MemoryService } from '../modules/memory/memory.service';
import { ReasoningService } from '../modules/ai/reasoning.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../modules/session/session.service';
import { PrismaService } from '../prisma/prisma.service';
import { WsEvent } from '@whispermentor/shared';

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
    },
    maxHttpBufferSize: 1e7, // 10MB to handle large audio chunks
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(EventsGateway.name);

    constructor(
        private readonly transcriptionService: TranscriptionService,
        private readonly transcriptService: TranscriptService,
        private readonly memoryService: MemoryService,
        private readonly reasoningService: ReasoningService,
        private readonly jwtService: JwtService,
        private readonly sessionService: SessionService,
        private readonly prisma: PrismaService,
    ) { }

    private sessionSettings = new Map<string, { translate: boolean }>();

    @SubscribeMessage('session:config')
    handleSessionConfig(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string; translate: boolean }
    ) {
        this.logger.log(`⚙️ Session ${data.sessionId} config update: Translate=${data.translate}`);
        const current = this.sessionSettings.get(data.sessionId) || { translate: false };
        this.sessionSettings.set(data.sessionId, { ...current, translate: data.translate });

        // Broadcast config to other clients in session? 
        // For now, it's global for the session.
    }

    handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                this.logger.warn(`🔌 Client ${client.id} tried to connect without token`);
                client.disconnect();
                return;
            }
            const user = this.jwtService.verify(token);
            client.data.user = user;
            this.logger.log(`🔌 Client connected: ${client.id} (${user.email})`);

            client.emit(WsEvent.SESSION_STATUS, {
                status: 'connected',
                sessionId: null,
            });
        } catch (e: any) {
            this.logger.error(`Authentication failed for ${client.id}: ${e.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`🔌 Client disconnected: ${client.id}`);
    }

    @SubscribeMessage(WsEvent.JOIN_SESSION)
    async handleJoinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string },
    ) {
        if (!data?.sessionId) {
            client.emit(WsEvent.ERROR, { code: 'INVALID_REQUEST', message: 'Session ID is required' });
            return;
        }

        const userId = client.data?.user?.userId || client.data?.user?.sub;
        if (!userId) {
            this.logger.warn(`Client ${client.id} unauthenticated during session:join`);
            client.emit(WsEvent.ERROR, { code: 'UNAUTHORIZED', message: 'User not authenticated' });
            return;
        }

        const session = await this.sessionService.getSession(data.sessionId);
        if (!session) {
            this.logger.warn(`Client ${client.id} tried to join non-existent session ${data.sessionId}`);
            client.emit(WsEvent.ERROR, { code: 'NOT_FOUND', message: 'Session not found' });
            return;
        }

        if (session.mentorId !== userId) {
            this.logger.warn(`IDOR blocked: User ${userId} tried to join unauthorized session ${data.sessionId}`);
            client.emit(WsEvent.ERROR, { code: 'FORBIDDEN', message: 'Access denied to this session' });
            return;
        }

        this.logger.log(`📡 Client ${client.id} (user ${userId}) authorized and joining session ${data.sessionId}`);
        client.join(`session:${data.sessionId}`);

        // Emit Status
        client.emit(WsEvent.SESSION_STATUS, {
            status: 'joined',
            sessionId: data.sessionId,
        });

        // Emit History (Context Backfill)
        try {
            const history = await this.transcriptService.getTranscripts(data.sessionId);
            client.emit('session:history', {
                sessionId: data.sessionId,
                transcripts: history.map((t: any) => ({
                    id: t.id,
                    speaker: t.speaker,
                    text: t.text,
                    timestamp: t.createdAt // Ensure Transcript model has createdAt
                }))
            });
            this.logger.log(`📜 Sent ${history.length} transcripts to ${client.id}`);
        } catch (error) {
            this.logger.error(`Failed to fetch history for ${data.sessionId}: ${error}`);
        }
    }

    @SubscribeMessage(WsEvent.LEAVE_SESSION)
    handleLeaveSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string },
    ) {
        this.logger.log(`📡 Client ${client.id} leaving session ${data.sessionId}`);
        client.leave(`session:${data.sessionId}`);
    }

    @SubscribeMessage(WsEvent.AUDIO_CHUNK)
    async handleAudioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string; chunk: ArrayBuffer },
    ) {
        if (!data?.sessionId || !data?.chunk) return;

        if (client.rooms && !client.rooms.has(`session:${data.sessionId}`)) {
            this.logger.warn(`Rejected audio chunk: Client ${client.id} has not joined session ${data.sessionId}`);
            client.emit('session:warning', {
                message: 'Must join session room before streaming audio'
            });
            return;
        }

        const size = data.chunk.byteLength;
        this.logger.debug(`🎙 Audio chunk: ${size} bytes for session ${data.sessionId}`);

        // Echo a fake transcript update periodically to show activity
        // Always emit for demo purposes
        // Process audio with AI Service
        try {
            const buffer = Buffer.from(data.chunk);
            const settings = this.sessionSettings.get(data.sessionId);
            const task = settings?.translate ? 'translate' : 'transcribe';

            const result = await this.transcriptionService.transcribe(buffer, task);

            // Clear any previous warnings since this succeeded
            this.server.to(`session:${data.sessionId}`).emit('session:warning:clear');

            if (result.text) {
                // 1. Persist to Postgres database (Required for Dashboard, Summary, and History)
                let savedTranscript: any = null;
                try {
                    savedTranscript = await this.transcriptService.addTranscript(
                        data.sessionId,
                        result.speaker,
                        result.text,
                        result.language
                    );
                } catch (dbError: any) {
                    this.logger.error(`Failed to save transcript to DB for session ${data.sessionId}: ${dbError.message || dbError}`);
                    this.server.to(`session:${data.sessionId}`).emit('session:warning', {
                        message: 'Failed to save transcript to database.'
                    });
                }

                // 2. Broadcast transcript with actual DB ID and timestamp (or fallback if DB failed)
                this.server.to(`session:${data.sessionId}`).emit(WsEvent.TRANSCRIPT_UPDATE, {
                    id: savedTranscript ? savedTranscript.id : `t_${Date.now()}`,
                    speaker: result.speaker,
                    text: result.text,
                    language: result.language,
                    timestamp: savedTranscript ? savedTranscript.createdAt : new Date(),
                });

                // 3. Save to Semantic Memory (Neo4j) with structured error logging
                this.memoryService.saveTranscript(data.sessionId, result.text, result.speaker, result.language)
                    .catch(memError => this.logger.warn(`Failed to save semantic memory for session ${data.sessionId}: ${memError.message || memError}`));
            }
        } catch (error: any) {
            this.logger.error(`Error processing audio chunk: ${error}`);
            this.server.to(`session:${data.sessionId}`).emit('session:warning', {
                message: error.message || 'Error processing audio'
            });
        }
    }

    @SubscribeMessage(WsEvent.ASK_QUESTION)
    async handleQuestion(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string; text: string; language?: string },
    ) {
        this.logger.log(`❓ Question from ${client.id}: "${data.text}"`);

        // Notify client that we are thinking
        client.emit('answer:thinking', { question: data.text });

        let questionId = `q_${Date.now()}`;
        try {
            const userId = client.data?.user?.userId || client.data?.user?.sub;
            const onChunk = (chunk: string) => {
                client.emit(WsEvent.ANSWER_CHUNK, {
                    questionId,
                    chunk,
                });
            };

            const answer = await this.reasoningService.ask(data.text, data.sessionId, data.language, userId, onChunk);

            // Persist Question and Answer to PostgreSQL via Prisma
            if (userId) {
                try {
                    const savedQuestion = await this.prisma.question.create({
                        data: {
                            userId,
                            sessionId: data.sessionId,
                            text: data.text,
                            language: data.language || 'en',
                            answers: {
                                create: {
                                    text: answer,
                                    confidence: 1.0,
                                    language: data.language || 'en',
                                }
                            }
                        },
                        include: { answers: true }
                    });
                    if (savedQuestion.answers?.[0]?.id) {
                        questionId = savedQuestion.answers[0].id;
                    }
                } catch (dbErr: any) {
                    this.logger.error(`Failed to persist question/answer to DB: ${dbErr.message || dbErr}`);
                }
            }

            client.emit(WsEvent.ANSWER_RESPONSE, {
                questionId,
                text: answer,
                confidence: 1.0,
            });
        } catch (error) {
            this.logger.error(`Failed to answer question: ${error}`);
            client.emit('answer:error', { message: 'I could not generate an answer.' });
        }
    }
}
