import { Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SessionService.name);
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor(
        private readonly prisma: PrismaService,
        @Optional() private readonly configService?: ConfigService
    ) { }

    async onModuleInit() {
        const retentionDays = this.getRetentionDays();
        if (retentionDays > 0) {
            this.logger.log(`Session retention policy active: Cleaning up sessions older than ${retentionDays} days.`);
            await this.cleanupOldSessions(retentionDays);
            this.cleanupTimer = setInterval(() => {
                this.cleanupOldSessions(retentionDays);
            }, 3600000);
            this.cleanupTimer.unref();
        } else {
            this.logger.log('Session auto-cleanup is disabled (SESSION_RETENTION_DAYS not configured or 0). All session history preserved.');
        }
    }

    onModuleDestroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    private getRetentionDays(): number {
        const raw = this.configService?.get<string>('SESSION_RETENTION_DAYS') || process.env.SESSION_RETENTION_DAYS;
        if (!raw) return 0;
        const days = parseInt(raw, 10);
        return isNaN(days) || days <= 0 ? 0 : days;
    }

    async cleanupOldSessions(retentionDays?: number): Promise<number> {
        const days = retentionDays ?? this.getRetentionDays();
        if (days <= 0) return 0;

        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        try {
            const result = await this.prisma.session.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoff,
                    },
                },
            });
            if (result.count > 0) {
                this.logger.log(`Automatic Cleanup: Deleted ${result.count} sessions older than ${days} days.`);
            }
            return result.count;
        } catch (error) {
            this.logger.error('Failed to run automatic cleanup of old sessions', error);
            return 0;
        }
    }

    async createSession(mentorId: string) {
        this.logger.log(`Creating session for mentor: ${mentorId}`);

        const user = await this.prisma.user.findUnique({
            where: { id: mentorId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${mentorId} does not exist`);
        }

        return this.prisma.session.create({
            data: {
                mentorId,
                startedAt: new Date(),
            },
        });
    }

    async endSession(sessionId: string) {
        this.logger.log(`Ending session: ${sessionId}`);
        return this.prisma.session.update({
            where: { id: sessionId },
            data: { endedAt: new Date() },
        });
    }

    async getSession(sessionId: string) {
        return this.prisma.session.findUnique({
            where: { id: sessionId },
            include: { transcripts: true },
        });
    }

    async getUserSessions(mentorId: string, limit = 50, offset = 0) {
        const take = Math.min(Math.max(limit, 1), 100);
        const skip = Math.max(offset, 0);

        return this.prisma.session.findMany({
            where: { mentorId },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
            include: { _count: { select: { transcripts: true, questions: true } } },
        });
    }

    async getAllSessions(limit = 50, offset = 0) {
        const take = Math.min(Math.max(limit, 1), 100);
        const skip = Math.max(offset, 0);

        return this.prisma.session.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            skip,
            include: { _count: { select: { transcripts: true, questions: true } } }
        });
    }
}
