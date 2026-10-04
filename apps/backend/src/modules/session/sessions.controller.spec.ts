import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionService } from './session.service';
import { ReasoningService } from '../ai/reasoning.service';
import { MemoryService } from '../memory/memory.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SessionsController', () => {
    let controller: SessionsController;
    let sessionService: {
        getUserSessions: jest.Mock;
        createSession: jest.Mock;
        getSession: jest.Mock;
    };
    let reasoningService: {
        generateSessionSummary: jest.Mock;
        extractConcepts: jest.Mock;
        extractQA: jest.Mock;
    };
    let memoryService: {
        saveConcepts: jest.Mock;
        saveQA: jest.Mock;
        getKnowledgeGraph: jest.Mock;
        getGlossary: jest.Mock;
    };
    let prismaService: {
        session: {
            update: jest.Mock;
        };
    };

    beforeEach(async () => {
        sessionService = {
            getUserSessions: jest.fn(),
            createSession: jest.fn(),
            getSession: jest.fn(),
        };
        reasoningService = {
            generateSessionSummary: jest.fn(),
            extractConcepts: jest.fn(),
            extractQA: jest.fn(),
        };
        memoryService = {
            saveConcepts: jest.fn(),
            saveQA: jest.fn(),
            getKnowledgeGraph: jest.fn(),
            getGlossary: jest.fn(),
        };
        prismaService = {
            session: {
                update: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SessionsController],
            providers: [
                { provide: SessionService, useValue: sessionService },
                { provide: ReasoningService, useValue: reasoningService },
                { provide: MemoryService, useValue: memoryService },
                { provide: PrismaService, useValue: prismaService },
            ],
        }).compile();

        controller = module.get<SessionsController>(SessionsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getSessions', () => {
        it('should call getUserSessions with parsed pagination parameters', async () => {
            const req = { user: { userId: 'user-123' } };
            sessionService.getUserSessions.mockResolvedValue([{ id: 'sess-1' }]);

            const result = await controller.getSessions(req, '10', '20');

            expect(sessionService.getUserSessions).toHaveBeenCalledWith('user-123', 10, 20);
            expect(result).toEqual([{ id: 'sess-1' }]);
        });

        it('should call getUserSessions with undefined pagination when omitted', async () => {
            const req = { user: { userId: 'user-123' } };
            sessionService.getUserSessions.mockResolvedValue([]);

            await controller.getSessions(req);

            expect(sessionService.getUserSessions).toHaveBeenCalledWith('user-123', undefined, undefined);
        });
    });

    describe('createSession', () => {
        it('should delegate session creation to sessionService with authenticated user id', async () => {
            const req = { user: { userId: 'user-456' } };
            sessionService.createSession.mockResolvedValue({ id: 'sess-new', mentorId: 'user-456' });

            const result = await controller.createSession(req);

            expect(sessionService.createSession).toHaveBeenCalledWith('user-456');
            expect(result).toEqual({ id: 'sess-new', mentorId: 'user-456' });
        });
    });

    describe('summarizeSession', () => {
        it('should throw NotFoundException if session does not exist', async () => {
            sessionService.getSession.mockResolvedValue(null);

            await expect(
                controller.summarizeSession('non-existent', { user: { userId: 'user-1' } })
            ).rejects.toThrow(NotFoundException);
        });

        it('should execute summary, concept extraction, and qa extraction in parallel and update session', async () => {
            const session = { id: 'sess-1', mentorId: 'user-1' };
            sessionService.getSession.mockResolvedValue(session);
            reasoningService.generateSessionSummary.mockResolvedValue({
                summary: 'Great session discussing microservices.',
                actionItems: ['Read docs', 'Deploy canary'],
            });
            reasoningService.extractConcepts.mockResolvedValue([{ name: 'Microservices' }]);
            memoryService.saveConcepts.mockResolvedValue(undefined);
            reasoningService.extractQA.mockResolvedValue([{ question: 'What is gRPC?', answer: 'RPC framework' }]);
            memoryService.saveQA.mockResolvedValue(undefined);

            prismaService.session.update.mockResolvedValue({
                id: 'sess-1',
                summary: 'Great session discussing microservices.',
                actionItems: ['Read docs', 'Deploy canary'],
            });

            const result = await controller.summarizeSession('sess-1', { user: { userId: 'user-1' } });

            expect(reasoningService.generateSessionSummary).toHaveBeenCalledWith('sess-1', 'user-1');
            expect(reasoningService.extractConcepts).toHaveBeenCalledWith('sess-1', 'user-1');
            expect(reasoningService.extractQA).toHaveBeenCalledWith('sess-1', 'user-1');
            expect(prismaService.session.update).toHaveBeenCalledWith({
                where: { id: 'sess-1' },
                data: {
                    summary: 'Great session discussing microservices.',
                    actionItems: ['Read docs', 'Deploy canary'],
                },
            });
            expect(result.summary).toBe('Great session discussing microservices.');
        });

        it('should gracefully handle partial failures in summary generation', async () => {
            const session = { id: 'sess-1', mentorId: 'user-1' };
            sessionService.getSession.mockResolvedValue(session);
            reasoningService.generateSessionSummary.mockRejectedValue(new Error('LLM timeout'));
            reasoningService.extractConcepts.mockResolvedValue([]);
            reasoningService.extractQA.mockResolvedValue([]);

            prismaService.session.update.mockResolvedValue({
                id: 'sess-1',
                summary: '',
                actionItems: [],
            });

            const result = await controller.summarizeSession('sess-1', { user: { userId: 'user-1' } });

            expect(prismaService.session.update).toHaveBeenCalledWith({
                where: { id: 'sess-1' },
                data: {
                    summary: '',
                    actionItems: [],
                },
            });
            expect(result.summary).toBe('');
        });
    });

    describe('getSessionGraph and getSessionGlossary', () => {
        it('should delegate getSessionGraph to memoryService', async () => {
            memoryService.getKnowledgeGraph.mockResolvedValue({ nodes: [], edges: [] });

            const result = await controller.getSessionGraph('sess-1');

            expect(memoryService.getKnowledgeGraph).toHaveBeenCalledWith('sess-1');
            expect(result).toEqual({ nodes: [], edges: [] });
        });

        it('should delegate getSessionGlossary to memoryService', async () => {
            memoryService.getGlossary.mockResolvedValue([{ term: 'K8s', definition: 'Kubernetes' }]);

            const result = await controller.getSessionGlossary('sess-1');

            expect(memoryService.getGlossary).toHaveBeenCalledWith('sess-1');
            expect(result).toEqual([{ term: 'K8s', definition: 'Kubernetes' }]);
        });
    });
});
