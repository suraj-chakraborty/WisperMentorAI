import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService implements OnModuleInit {
    private readonly logger = new Logger(SessionService.name);

    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        // Run cleanup on startup
        this.cleanupOldSessions();
        // Run cleanup every hour (3600000 ms)
        setInterval(() => this.cleanupOldSessions(), 3600000);
    }

    private async cleanupOldSessions() {
        // Calculate the timestamp for 3 days ago
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        try {
            const result = await this.prisma.session.deleteMany({
                where: {
                    createdAt: {
                        lt: threeDaysAgo
                    }
                }
            });
            if (result.count > 0) {
                this.logger.log(`Automatic Cleanup: Deleted ${result.count} sessions older than 3 days.`);
            }
        } catch (error) {
            this.logger.error('Failed to run automatic cleanup of old sessions', error);
        }
    }

    async createSession(mentorId: string) {
        this.logger.log(`Creating session for mentor: ${mentorId}`);

        // Ensure user exists (Hackathon mode)
        await this.prisma.user.upsert({
            where: { id: mentorId },
            update: {},
            create: {
                id: mentorId,
                email: `${mentorId}@example.com`,
                name: 'Demo User',
                password: 'demo_password_hash_placeholder',
                settings: {},
            },
        });

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

    async getAllSessions() {
        return this.prisma.session.findMany({
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { transcripts: true, questions: true } } }
        });
    }
}
