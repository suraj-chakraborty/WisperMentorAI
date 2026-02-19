import { Controller, Post, Get, Param, NotFoundException } from '@nestjs/common';
import { SessionService } from './session.service';
import { ReasoningService } from '../ai/reasoning.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('sessions')
export class SessionsController {
    constructor(
        private readonly sessionService: SessionService,
        private readonly reasoningService: ReasoningService,
        private readonly prisma: PrismaService
    ) { }

    @Get()
    async getSessions() {
        return this.sessionService.getAllSessions();
    }

    @Post()
    async createSession() {
        // Use demo-user to match SettingsView
        return this.sessionService.createSession('demo-user');
    }

    @Post(':id/summarize')
    async summarizeSession(@Param('id') id: string) {
        const session = await this.sessionService.getSession(id);
        if (!session) throw new NotFoundException('Session not found');

        const { summary, actionItems, topics } = await this.reasoningService.generateSessionSummary(id);

        // Update session with AI insights
        const updated = await this.prisma.session.update({
            where: { id },
            data: {
                summary,
                actionItems: actionItems as any,
            }
        });

        return updated;
    }
}
