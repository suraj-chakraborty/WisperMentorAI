
import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';

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

    async saveTranscript(sessionId: string, text: string, speaker: string = 'User') {
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
                        timestamp: datetime(),
                        embedding: $embedding
                    })
                    MERGE (s)-[:HAS_TRANSCRIPT]->(t)
                    RETURN t
                    `,
                    { sessionId, text, speaker, embedding }
                );
                this.logger.log(`Saved transcript for session ${sessionId}: "${text.substring(0, 30)}..."`);
            } finally {
                await session.close();
            }
        } catch (error) {
            this.logger.error(`Failed to save transcript: ${error}`);
        }
    }

    async search(query: string, limit: number = 3): Promise<any[]> {
        if (!query || !query.trim()) return [];

        try {
            // 1. Get embedding for query
            const embedding = await this.getEmbedding(query);
            if (!embedding || embedding.length === 0) return [];

            // 2. Search Neo4j Vector Index
            const session = this.neo4jService.getSession();
            try {
                // Ensure index exists (idempotent)
                // Note: In production, index creation should be a migration
                await session.run(`
                    CREATE VECTOR INDEX transcript_embeddings IF NOT EXISTS
                    FOR (t:Transcript) ON (t.embedding)
                    OPTIONS {indexConfig: {
                        ` + "`vector.dimensions`" + `: 384,
                        ` + "`vector.similarity_function`" + `: 'cosine'
                    }}
                `);

                // Query
                const result = await session.run(
                    `
                    CALL db.index.vector.queryNodes('transcript_embeddings', $limit, $embedding)
                    YIELD node, score
                    RETURN node.text as text, node.timestamp as timestamp, score
                    `,
                    { limit, embedding }
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
