import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { TranscriptionService } from '../transcription/transcription.service';
import { TranscriptService } from '../modules/transcript/transcript.service';
import { MemoryService } from '../modules/memory/memory.service';
import { ReasoningService } from '../modules/ai/reasoning.service';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../modules/session/session.service';
import { PrismaService } from '../prisma/prisma.service';
import { Socket } from 'socket.io';

describe('EventsGateway Security & Connection Auth', () => {
    let gateway: EventsGateway;
    let jwtService: { verify: jest.Mock };
    let sessionService: { getSession: jest.Mock };
    let prismaService: { question: { create: jest.Mock } };
    let transcriptService: { getTranscripts: jest.Mock; addTranscript: jest.Mock };
    let reasoningService: { ask: jest.Mock };

    beforeEach(async () => {
        jwtService = {
            verify: jest.fn(),
        };
        sessionService = {
            getSession: jest.fn(),
        };
        prismaService = {
            question: {
                create: jest.fn(),
            },
        };
        transcriptService = {
            getTranscripts: jest.fn(),
            addTranscript: jest.fn(),
        };
        reasoningService = {
            ask: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsGateway,
                { provide: TranscriptionService, useValue: {} },
                { provide: TranscriptService, useValue: transcriptService },
                { provide: MemoryService, useValue: {} },
                { provide: ReasoningService, useValue: reasoningService },
                { provide: JwtService, useValue: jwtService },
                { provide: SessionService, useValue: sessionService },
                { provide: PrismaService, useValue: prismaService },
            ],
        }).compile();

        gateway = module.get<EventsGateway>(EventsGateway);
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    it('should disconnect client if no auth token is provided', () => {
        const mockSocket = {
            id: 'socket-no-token',
            handshake: {
                auth: {},
                headers: {},
            },
            disconnect: jest.fn(),
            emit: jest.fn(),
            data: {},
        } as unknown as Socket;

        gateway.handleConnection(mockSocket);

        expect(mockSocket.disconnect).toHaveBeenCalled();
        expect(mockSocket.emit).not.toHaveBeenCalled();
        expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('should disconnect client if jwt verification fails', () => {
        const mockSocket = {
            id: 'socket-bad-token',
            handshake: {
                auth: { token: 'invalid.jwt.token' },
                headers: {},
            },
            disconnect: jest.fn(),
            emit: jest.fn(),
            data: {},
        } as unknown as Socket;

        jwtService.verify.mockImplementation(() => {
            throw new Error('jwt expired or invalid');
        });

        gateway.handleConnection(mockSocket);

        expect(jwtService.verify).toHaveBeenCalledWith('invalid.jwt.token');
        expect(mockSocket.disconnect).toHaveBeenCalled();
        expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should authenticate client and emit connected status when valid token provided in auth', () => {
        const mockUser = { sub: 'user-1', email: 'test@example.com' };
        const mockSocket = {
            id: 'socket-valid-auth',
            handshake: {
                auth: { token: 'valid.token.here' },
                headers: {},
            },
            disconnect: jest.fn(),
            emit: jest.fn(),
            data: {} as any,
        } as unknown as Socket;

        jwtService.verify.mockReturnValue(mockUser);

        gateway.handleConnection(mockSocket);

        expect(jwtService.verify).toHaveBeenCalledWith('valid.token.here');
        expect(mockSocket.disconnect).not.toHaveBeenCalled();
        expect(mockSocket.data.user).toEqual(mockUser);
        expect(mockSocket.emit).toHaveBeenCalledWith('session:status', {
            status: 'connected',
            sessionId: null,
        });
    });

    it('should extract Bearer token from authorization header fallback', () => {
        const mockUser = { sub: 'user-2', email: 'header@example.com' };
        const mockSocket = {
            id: 'socket-header-token',
            handshake: {
                auth: {},
                headers: {
                    authorization: 'Bearer header.jwt.token',
                },
            },
            disconnect: jest.fn(),
            emit: jest.fn(),
            data: {} as any,
        } as unknown as Socket;

        jwtService.verify.mockReturnValue(mockUser);

        gateway.handleConnection(mockSocket);

        expect(jwtService.verify).toHaveBeenCalledWith('header.jwt.token');
        expect(mockSocket.disconnect).not.toHaveBeenCalled();
        expect(mockSocket.data.user).toEqual(mockUser);
    });

    describe('handleJoinSession Authorization & IDOR protection (SEC-WS-1)', () => {
        it('rejects if sessionId is missing', async () => {
            const mockSocket = { emit: jest.fn(), data: { user: { userId: 'user-1' } } } as any;
            await gateway.handleJoinSession(mockSocket, {} as any);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
                code: 'INVALID_REQUEST',
                message: 'Session ID is required',
            });
        });

        it('rejects if user is not authenticated', async () => {
            const mockSocket = { emit: jest.fn(), data: {} } as any;
            await gateway.handleJoinSession(mockSocket, { sessionId: 'sess-1' });

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
                code: 'UNAUTHORIZED',
                message: 'User not authenticated',
            });
        });

        it('rejects if session is not found', async () => {
            const mockSocket = { emit: jest.fn(), data: { user: { userId: 'user-1' } } } as any;
            sessionService.getSession.mockResolvedValue(null);

            await gateway.handleJoinSession(mockSocket, { sessionId: 'nonexistent' });

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
                code: 'NOT_FOUND',
                message: 'Session not found',
            });
        });

        it('blocks IDOR if authenticated user does not own the session', async () => {
            const mockSocket = {
                emit: jest.fn(),
                join: jest.fn(),
                data: { user: { userId: 'attacker-user' } },
            } as any;
            sessionService.getSession.mockResolvedValue({
                id: 'sess-123',
                mentorId: 'victim-user',
            });

            await gateway.handleJoinSession(mockSocket, { sessionId: 'sess-123' });

            expect(mockSocket.emit).toHaveBeenCalledWith('error', {
                code: 'FORBIDDEN',
                message: 'Access denied to this session',
            });
            expect(mockSocket.join).not.toHaveBeenCalled();
        });

        it('allows authorized mentor to join and streams history', async () => {
            const mockSocket = {
                emit: jest.fn(),
                join: jest.fn(),
                data: { user: { userId: 'mentor-123' } },
            } as any;
            sessionService.getSession.mockResolvedValue({
                id: 'sess-123',
                mentorId: 'mentor-123',
            });
            transcriptService.getTranscripts.mockResolvedValue([
                { id: 't-1', speaker: 'You', text: 'Hello', createdAt: new Date() },
            ]);

            await gateway.handleJoinSession(mockSocket, { sessionId: 'sess-123' });

            expect(mockSocket.join).toHaveBeenCalledWith('session:sess-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('session:status', {
                status: 'joined',
                sessionId: 'sess-123',
            });
            expect(mockSocket.emit).toHaveBeenCalledWith('session:history', expect.objectContaining({
                sessionId: 'sess-123',
            }));
        });
    });

    describe('handleQuestion live Q&A persistence (DATA-QA-1)', () => {
        it('generates answer, persists Question & Answer to Prisma, and emits response with real id', async () => {
            const mockSocket = {
                id: 'client-1',
                emit: jest.fn(),
                data: { user: { userId: 'mentor-1' } },
            } as any;

            reasoningService.ask.mockResolvedValue('Microservices are loosely coupled services.');
            prismaService.question.create.mockResolvedValue({
                id: 'q-db-123',
                userId: 'mentor-1',
                sessionId: 'sess-42',
                text: 'What are microservices?',
                answers: [
                    { id: 'ans-db-456', text: 'Microservices are loosely coupled services.' },
                ],
            });

            await gateway.handleQuestion(mockSocket, {
                sessionId: 'sess-42',
                text: 'What are microservices?',
                language: 'en',
            });

            expect(reasoningService.ask).toHaveBeenCalledWith(
                'What are microservices?',
                'sess-42',
                'en',
                'mentor-1',
                expect.any(Function)
            );
            expect(prismaService.question.create).toHaveBeenCalledWith({
                data: {
                    userId: 'mentor-1',
                    sessionId: 'sess-42',
                    text: 'What are microservices?',
                    language: 'en',
                    answers: {
                        create: {
                            text: 'Microservices are loosely coupled services.',
                            confidence: 1.0,
                            language: 'en',
                        },
                    },
                },
                include: { answers: true },
            });
            expect(mockSocket.emit).toHaveBeenCalledWith('answer:response', {
                questionId: 'ans-db-456',
                text: 'Microservices are loosely coupled services.',
                confidence: 1.0,
            });
        });

        it('streams answer chunks via onChunk callback during reasoning', async () => {
            const mockSocket = {
                id: 'client-1',
                emit: jest.fn(),
                data: { user: { userId: 'mentor-1' } },
            } as any;

            reasoningService.ask.mockImplementation(async (_text, _sessId, _lang, _uid, onChunk) => {
                if (onChunk) {
                    onChunk('Token 1 ');
                    onChunk('Token 2');
                }
                return 'Token 1 Token 2';
            });

            await gateway.handleQuestion(mockSocket, {
                sessionId: 'sess-42',
                text: 'Explain streaming',
            });

            expect(mockSocket.emit).toHaveBeenCalledWith('answer:chunk', expect.objectContaining({
                chunk: 'Token 1 ',
            }));
            expect(mockSocket.emit).toHaveBeenCalledWith('answer:chunk', expect.objectContaining({
                chunk: 'Token 2',
            }));
            expect(mockSocket.emit).toHaveBeenCalledWith('answer:response', expect.objectContaining({
                text: 'Token 1 Token 2',
            }));
        });
    });

    describe('handleAudioChunk DB persistence reliability (H2)', () => {
        let transcriptionService: { transcribe: jest.Mock };
        let memoryService: { saveTranscript: jest.Mock };
        let mockServerEmit: jest.Mock;

        beforeEach(async () => {
            transcriptionService = {
                transcribe: jest.fn(),
            };
            memoryService = {
                saveTranscript: jest.fn().mockResolvedValue(true),
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    EventsGateway,
                    { provide: TranscriptionService, useValue: transcriptionService },
                    { provide: TranscriptService, useValue: transcriptService },
                    { provide: MemoryService, useValue: memoryService },
                    { provide: ReasoningService, useValue: {} },
                    { provide: JwtService, useValue: jwtService },
                    { provide: SessionService, useValue: sessionService },
                    { provide: PrismaService, useValue: prismaService },
                ],
            }).compile();

            gateway = module.get<EventsGateway>(EventsGateway);

            mockServerEmit = jest.fn();
            gateway.server = {
                to: jest.fn().mockReturnValue({ emit: mockServerEmit }),
            } as any;
        });

        it('awaits database write and broadcasts transcript with persisted record id and timestamp', async () => {
            const createdAt = new Date('2026-10-03T12:00:00Z');
            transcriptionService.transcribe.mockResolvedValue({
                text: 'Testing audio persistence',
                speaker: 'User',
                language: 'en',
            });
            transcriptService.addTranscript.mockResolvedValue({
                id: 'db-transcript-123',
                sessionId: 'session-42',
                speaker: 'User',
                text: 'Testing audio persistence',
                language: 'en',
                createdAt,
            });

            const mockSocket = {
                id: 'client-1',
                rooms: new Set(['session:session-42']),
            } as any;
            const chunk = new Uint8Array([1, 2, 3, 4]).buffer;

            await gateway.handleAudioChunk(mockSocket, {
                sessionId: 'session-42',
                chunk,
            });

            expect(transcriptService.addTranscript).toHaveBeenCalledWith(
                'session-42',
                'User',
                'Testing audio persistence',
                'en'
            );
            expect(mockServerEmit).toHaveBeenCalledWith('transcript:update', {
                id: 'db-transcript-123',
                speaker: 'User',
                text: 'Testing audio persistence',
                language: 'en',
                timestamp: createdAt,
            });
            expect(memoryService.saveTranscript).toHaveBeenCalledWith(
                'session-42',
                'Testing audio persistence',
                'User',
                'en'
            );
        });

        it('catches DB write errors, emits session:warning, and does not crash or throw unhandled rejection', async () => {
            transcriptionService.transcribe.mockResolvedValue({
                text: 'Database write will fail',
                speaker: 'User',
                language: 'en',
            });
            transcriptService.addTranscript.mockRejectedValue(new Error('Connection lost to PostgreSQL'));

            const mockSocket = {
                id: 'client-2',
                rooms: new Set(['session:session-fail']),
            } as any;
            const chunk = new Uint8Array([5, 6, 7, 8]).buffer;

            await gateway.handleAudioChunk(mockSocket, {
                sessionId: 'session-fail',
                chunk,
            });

            expect(transcriptService.addTranscript).toHaveBeenCalled();
            expect(mockServerEmit).toHaveBeenCalledWith('session:warning', {
                message: 'Failed to save transcript to database.',
            });
            expect(mockServerEmit).toHaveBeenCalledWith('transcript:update', expect.objectContaining({
                text: 'Database write will fail',
            }));
        });
    });
});
