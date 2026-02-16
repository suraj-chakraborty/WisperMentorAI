import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    // TODO: Phase 5 — Implement RAG pipeline + Tone Adapter
    async generateAnswer(_question: string, _mentorId: string): Promise<string> {
        this.logger.debug('AI reasoning not yet implemented (Phase 5)');
        return '[Phase 5] AI reasoning engine coming soon.';
    }
}
