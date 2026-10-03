import { Controller, Post, Get, Param, NotFoundException, UseGuards, Request } from '@nestjs/common';
import { SessionService } from './session.service';
import { ReasoningService } from '../ai/reasoning.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';

import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
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
    async createSession(@Request() req: any) {
        return this.sessionService.createSession(req.user.userId);
    }

    @Post(':id/summarize')
    async summarizeSession(@Param('id') id: string, @Request() req: any) {
        const session = await this.sessionService.getSession(id);
        if (!session) throw new NotFoundException('Session not found');
        const userId = req.user.userId;

        // Run AI tasks in parallel to avoid timeout
        const summaryPromise = this.reasoningService.generateSessionSummary(id, userId);
        const conceptsPromise = this.reasoningService.extractConcepts(id, userId)
            .then(concepts => this.memoryService.saveConcepts(id, concepts));
        const qaPromise = this.reasoningService.extractQA(id, userId)
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

    @Get(':id/glossary')
    async getSessionGlossary(@Param('id') id: string) {
        return this.memoryService.getGlossary(id);
    }
}
