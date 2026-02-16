import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MemoryService {
    private readonly logger = new Logger(MemoryService.name);

    // TODO: Phase 4 — Implement vector memory (FAISS/Pinecone) and Neo4j integration
    async storeEmbedding(_mentorId: string, _text: string): Promise<string> {
        this.logger.debug('Vector memory storage not yet implemented (Phase 4)');
        return 'placeholder-vector-id';
    }

    async searchSimilar(_query: string, _topK: number = 5): Promise<string[]> {
        this.logger.debug('Similarity search not yet implemented (Phase 4)');
        return [];
    }
}
