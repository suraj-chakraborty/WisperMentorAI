import { Controller, Post, Get, Param, Body, NotFoundException, UseGuards, Request, Logger } from '@nestjs/common';
import { SessionService } from './session.service';
import { ReasoningService } from '../ai/reasoning.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryService } from '../memory/memory.service';
import { RedisService } from '../cache/redis.service';

import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('sessions')
export class SessionsController {
    private readonly logger = new Logger(SessionsController.name);

    constructor(
        private readonly sessionService: SessionService,
        private readonly reasoningService: ReasoningService,
        private readonly memoryService: MemoryService,
        private readonly prisma: PrismaService,
        private readonly redisService: RedisService
    ) { }

    @Get()
    async getSessions() {
        return this.sessionService.getAllSessions();
    }

    @Post()
    async createSession(@Request() req: any) {
        return this.sessionService.createSession(req.user.userId);
    }

    @Post('meeting')
    async createMeetingSession(
        @Request() req: any,
        @Body() body: { meetingTitle: string }
    ) {
        return this.sessionService.createOrJoinMeetingSession(
            req.user.userId,
            body.meetingTitle
        );
    }

    @Post(':id/summarize')
    async summarizeSession(@Param('id') id: string, @Request() req: any) {
        const session = await this.sessionService.getSession(id);
        if (!session) throw new NotFoundException('Session not found');
        const userId = req.user.userId;

        // Redis Summary Cache
        const cacheKey = this.redisService.summaryKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            this.logger.log(`⚡ [SUMMARY CACHE HIT] session: ${id}`);
            return JSON.parse(cached);
        }
        this.logger.log(`[SUMMARY CACHE MISS] session: ${id}`);

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

        // Cache the result for 2h
        await this.redisService.set(cacheKey, JSON.stringify(updated), 7200);
        this.logger.log(`📦 [SUMMARY CACHED] session: ${id}`);

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
