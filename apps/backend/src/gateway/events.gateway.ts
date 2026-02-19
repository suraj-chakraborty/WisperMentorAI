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
        private readonly reasoningService: ReasoningService
    ) { }

    handleConnection(client: Socket) {
        this.logger.log(`🔌 Client connected: ${client.id}`);
        client.emit('session:status', {
            status: 'connected',
            message: 'Welcome to WhisperMentor AI',
        });
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`🔌 Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('session:join')
    async handleJoinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string },
    ) {
        this.logger.log(`📡 Client ${client.id} joining session ${data.sessionId}`);
        client.join(`session:${data.sessionId}`);

        // Emit Status
        client.emit('session:status', {
            status: 'joined',
            sessionId: data.sessionId,
        });

        // Emit History (Context Backfill)
        try {
            const history = await this.transcriptService.getTranscripts(data.sessionId);
            client.emit('session:history', {
                sessionId: data.sessionId,
                transcripts: history.map(t => ({
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

    @SubscribeMessage('session:leave')
    handleLeaveSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string },
    ) {
        this.logger.log(`📡 Client ${client.id} leaving session ${data.sessionId}`);
        client.leave(`session:${data.sessionId}`);
    }

    @SubscribeMessage('audio:chunk')
    async handleAudioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string; chunk: ArrayBuffer },
    ) {
        const size = data.chunk.byteLength;
        // this.logger.debug(`🎙 Audio chunk: ${size} bytes for session ${data.sessionId}`);

        // Echo a fake transcript update periodically to show activity
        // Always emit for demo purposes
        // Process audio with AI Service
        try {
            const buffer = Buffer.from(data.chunk);
            const result = await this.transcriptionService.transcribe(buffer);

            if (result.text) {
                // Emit real transcript
                this.server.to(`session:${data.sessionId}`).emit('transcript:update', {
                    id: `t_${Date.now()}`,
                    speaker: result.speaker,
                    text: result.text,
                    language: result.language,
                    timestamp: new Date(),
                });

                // Save to Semantic Memory (Neo4j)
                this.memoryService.saveTranscript(data.sessionId, result.text, result.speaker, result.language)
                    .catch(e => this.logger.error(`Failed to save memory: ${e}`));

                // Save to Postgres (Prisma) - Required for Dashboard & Summary
                this.transcriptService.addTranscript(data.sessionId, result.speaker, result.text, result.language)
                    .catch(e => this.logger.error(`Failed to save transcript DB: ${e}`));
            }
        } catch (error) {
            this.logger.error(`Error processing audio chunk: ${error}`);
        }
    }


    @SubscribeMessage('question:ask')
    async handleQuestion(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string; text: string; language?: string },
    ) {
        this.logger.log(`❓ Question from ${client.id}: "${data.text}"`);

        // Notify client that we are thinking
        client.emit('answer:thinking', { question: data.text });

        try {
            const answer = await this.reasoningService.ask(data.text, data.sessionId);

            client.emit('answer:response', {
                questionId: `q_${Date.now()}`,
                text: answer,
                confidence: 1.0, // Placeholder
            });
        } catch (error) {
            this.logger.error(`Failed to answer question: ${error}`);
            client.emit('answer:error', { message: 'I could not generate an answer.' });
        }
    }
}
