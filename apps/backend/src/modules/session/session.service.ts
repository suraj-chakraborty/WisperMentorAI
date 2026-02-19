import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);

    constructor(private readonly prisma: PrismaService) { }

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
