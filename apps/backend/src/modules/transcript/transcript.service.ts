import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TranscriptService {
    private readonly logger = new Logger(TranscriptService.name);

    constructor(private readonly prisma: PrismaService) { }

    // TODO: Phase 3 — Implement real-time transcription ingestion
    async addTranscript(sessionId: string, speaker: string, text: string) {
        this.logger.log(`📝 Transcript [${speaker}]: ${text.substring(0, 50)}...`);
        return this.prisma.transcript.create({
            data: { sessionId, speaker, text },
        });
    }

    async getTranscripts(sessionId: string) {
        return this.prisma.transcript.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
    }
}
