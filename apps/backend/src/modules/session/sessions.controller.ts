import { Controller, Post, Get, Param, NotFoundException } from '@nestjs/common';
import { SessionService } from './session.service';
import { ReasoningService } from '../ai/reasoning.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';

@Controller('sessions')
export class SessionsController {
    constructor(
        private readonly sessionService: SessionService,
        private readonly reasoningService: ReasoningService,
        private readonly memoryService: MemoryService,
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

        // Run AI tasks in parallel to avoid timeout
        const summaryPromise = this.reasoningService.generateSessionSummary(id);
        const conceptsPromise = this.reasoningService.extractConcepts(id)
            .then(concepts => this.memoryService.saveConcepts(id, concepts));
        const qaPromise = this.reasoningService.extractQA(id)
            .then(qa => this.memoryService.saveQA(id, qa));

        const results = await Promise.allSettled([summaryPromise, conceptsPromise, qaPromise]);

        // Get Summary Result (Index 0)
        let summaryData: { summary: string; actionItems: string[] } = { summary: '', actionItems: [] };
        if (results[0].status === 'fulfilled') {
            summaryData = results[0].value;
        } else {
            console.error('Summary generation failed:', results[0].reason);
        }

        // Update session with AI insights
        const updated = await this.prisma.session.update({
            where: { id },
            data: {
                summary: summaryData.summary,
                actionItems: summaryData.actionItems as any,
            }
        });

        return updated;
    }

    @Get(':id/graph')
    async getSessionGraph(@Param('id') id: string) {
        return this.memoryService.getKnowledgeGraph(id);
    }
}
