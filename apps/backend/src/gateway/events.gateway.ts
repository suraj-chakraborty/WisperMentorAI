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
    handleAudioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { sessionId: string; chunk: ArrayBuffer },
    ) {
        this.logger.debug(`🎙 Audio chunk from ${client.id} for session ${data.sessionId}`);
        // Phase 2+: Forward to transcription service
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
