
import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import { int } from 'neo4j-driver';

@Injectable()
export class MemoryService {
    private readonly logger = new Logger(MemoryService.name);
    private readonly aiServiceUrl: string;

    constructor(
        private readonly neo4jService: Neo4jService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://127.0.0.1:8000';
        this.httpService.axiosRef.defaults.httpAgent = new http.Agent({ keepAlive: true });
    }

    async saveTranscript(sessionId: string, text: string, speaker: string = 'User', language: string = 'en') {
        if (!text || !text.trim()) return;

        try {
            // 1. Get Embedding from AI Service
            const embedding = await this.getEmbedding(text);

            // 2. Save to Neo4j
            const session = this.neo4jService.getSession();
            try {
                await session.run(
                    `
                    MERGE (s:Session {id: $sessionId})
                    CREATE (t:Transcript {
                        text: $text,
                        speaker: $speaker,
                        sessionId: $sessionId,
                        timestamp: datetime(),
                        embedding: $embedding,
                        language: $language
                    })
                    MERGE (s)-[:HAS_TRANSCRIPT]->(t)
                    RETURN t
                    `,
                    { sessionId, text, speaker, embedding, language }
                );
                this.logger.log(`Saved transcript for session ${sessionId}: "${text.substring(0, 30)}..."`);
            } finally {
                await session.close();
            }
        } catch (error) {
            this.logger.error(`Failed to save transcript: ${error}`);
        }
    }

    async search(query: string, limit: number = 3, sessionId?: string): Promise<any[]> {
        if (!query || !query.trim()) return [];

        try {
            // 1. Get embedding for query
            const embedding = await this.getEmbedding(query);
            if (!embedding || embedding.length === 0) return [];

            // 2. Search Neo4j Vector Index
            const session = this.neo4jService.getSession();
            try {
                // ... index creation omitted for brevity ...

                // Query with Session Filter
                // We fetch more candidates (limit * 20) to account for filtering

                // ... (inside search method)
                const result = await session.run(
                    `
                    CALL db.index.vector.queryNodes('transcript_embeddings', $candidateLimit, $embedding)
                    YIELD node, score
                    MATCH (s:Session {id: $sessionId})-[:HAS_TRANSCRIPT]->(node)
                    RETURN node.text as text, node.timestamp as timestamp, score
                    LIMIT $limit
                    `,
                    {
                        limit: int(limit),
                        candidateLimit: int(limit * 20),
                        embedding,
                        sessionId
                    }
                );

                return result.records.map((r: any) => ({
                    text: r.get('text'),
                    timestamp: r.get('timestamp'),
                    score: r.get('score')
                }));
            } finally {
                await session.close();
            }
        } catch (error) {
            this.logger.error(`Search failed: ${error}`);
            return [];
        }
    }

    private async getEmbedding(text: string): Promise<number[]> {
        try {
            const { data } = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/embed`, { text }, { timeout: 5000 })
            );
            return data.embedding;
        } catch (error) {
            this.logger.error(`Embedding failed: ${error}`);
            // Return empty or throw? Empty for now to convert to null or handle gracefully
            return [];
        }
    }
}
