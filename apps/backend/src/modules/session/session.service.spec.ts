import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('SessionService (B3 Session Retention & Lifecycle)', () => {
    let service: SessionService;
    let prisma: {
        session: {
            deleteMany: jest.Mock;
            create: jest.Mock;
            update: jest.Mock;
            findUnique: jest.Mock;
            findMany: jest.Mock;
        };
        user: {
            findUnique: jest.Mock;
        };
    };
    let configService: { get: jest.Mock };

    beforeEach(async () => {
        prisma = {
            session: {
                deleteMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
            },
            user: {
                findUnique: jest.fn(),
            },
        };

        configService = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionService,
                { provide: PrismaService, useValue: prisma },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<SessionService>(SessionService);
    });

    afterEach(() => {
        service.onModuleDestroy();
        delete process.env.SESSION_RETENTION_DAYS;
    });

    describe('onModuleInit and retention policy', () => {
        it('preserves all session history when retention is not configured (default)', async () => {
            configService.get.mockReturnValue(undefined);

            await service.onModuleInit();

            expect(prisma.session.deleteMany).not.toHaveBeenCalled();
        });

        it('cleans up sessions older than configured retention days when set', async () => {
            configService.get.mockReturnValue('14');
            prisma.session.deleteMany.mockResolvedValue({ count: 5 });

            await service.onModuleInit();

            expect(prisma.session.deleteMany).toHaveBeenCalledWith({
                where: {
                    createdAt: {
                        lt: expect.any(Date),
                    },
                },
            });
        });

        it('ignores negative or invalid retention days', async () => {
            configService.get.mockReturnValue('-5');

            await service.onModuleInit();

            expect(prisma.session.deleteMany).not.toHaveBeenCalled();
        });
    });

    describe('createSession', () => {
        it('creates a session if mentor user exists', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: 'mentor-1' });
            prisma.session.create.mockResolvedValue({ id: 'sess-100', mentorId: 'mentor-1' });

            const result = await service.createSession('mentor-1');

            expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'mentor-1' } });
            expect(result).toEqual({ id: 'sess-100', mentorId: 'mentor-1' });
        });

        it('throws NotFoundException if mentor user does not exist', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(service.createSession('non-existent')).rejects.toThrow(NotFoundException);
            expect(prisma.session.create).not.toHaveBeenCalled();
        });
    });

    describe('getUserSessions', () => {
        it('queries sessions strictly filtered by mentorId with default pagination', async () => {
            const mockSessions = [{ id: 's1', mentorId: 'mentor-1' }];
            prisma.session.findMany.mockResolvedValue(mockSessions);

            const result = await service.getUserSessions('mentor-1');

            expect(prisma.session.findMany).toHaveBeenCalledWith({
                where: { mentorId: 'mentor-1' },
                orderBy: { createdAt: 'desc' },
                take: 50,
                skip: 0,
                include: { _count: { select: { transcripts: true, questions: true } } },
            });
            expect(result).toEqual(mockSessions);
        });

        it('applies custom limit and offset pagination parameters', async () => {
            const mockSessions = [{ id: 's2', mentorId: 'mentor-1' }];
            prisma.session.findMany.mockResolvedValue(mockSessions);

            const result = await service.getUserSessions('mentor-1', 20, 40);

            expect(prisma.session.findMany).toHaveBeenCalledWith({
                where: { mentorId: 'mentor-1' },
                orderBy: { createdAt: 'desc' },
                take: 20,
                skip: 40,
                include: { _count: { select: { transcripts: true, questions: true } } },
            });
            expect(result).toEqual(mockSessions);
        });
    });
});
