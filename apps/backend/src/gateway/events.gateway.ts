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

@WebSocketGateway({
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3000'],
        credentials: true,
    },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(EventsGateway.name);

    constructor(private readonly transcriptionService: TranscriptionService) { }

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
    handleJoinSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string },
    ) {
        this.logger.log(`📡 Client ${client.id} joining session ${data.sessionId}`);
        client.join(`session:${data.sessionId}`);
        client.emit('session:status', {
            status: 'joined',
            sessionId: data.sessionId,
        });
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
            const text = await this.transcriptionService.transcribe(buffer);

            if (text) {
                // Emit real transcript
                this.server.to(`session:${data.sessionId}`).emit('transcript:update', {
                    id: `t_${Date.now()}`,
                    speaker: 'Speaker', // TODO: Speaker diarization
                    text,
                    timestamp: new Date(),
                });
            }
        } catch (error) {
            this.logger.error(`Error processing audio chunk: ${error}`);
        }
    }


    @SubscribeMessage('question:ask')
    handleQuestion(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string; text: string; language?: string },
    ) {
        this.logger.log(`❓ Question from ${client.id}: "${data.text}"`);
        // Phase 5+: Forward to reasoning engine
        client.emit('answer:response', {
            questionId: 'placeholder',
            text: '[Phase 5] AI reasoning not yet implemented.',
            confidence: 0,
        });
    }
}
