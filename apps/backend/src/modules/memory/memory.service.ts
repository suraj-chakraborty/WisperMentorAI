
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

    async saveConcepts(sessionId: string, concepts: any[]) {
        if (!concepts || !concepts.length) return;

        const session = this.neo4jService.getSession();
        try {
            await session.run(
                `
                MATCH (s:Session {id: $sessionId})
                UNWIND $concepts as c
                MERGE (con:Concept {name: c.name})
                SET con.definition = c.definition
                MERGE (s)-[:MENTIONS]->(con)
                
                FOREACH (ex IN c.examples | 
                    MERGE (e:Example {text: ex}) 
                    MERGE (con)-[:HAS_EXAMPLE]->(e)
                )
                
                FOREACH (rule IN c.rules | 
                    MERGE (r:Rule {text: rule}) 
                    MERGE (con)-[:HAS_RULE]->(r)
                )
                `,
                { sessionId, concepts }
            );
            this.logger.log(`Saved ${concepts.length} concepts for session ${sessionId}`);
        } catch (error) {
            this.logger.error(`Failed to save concepts: ${error}`);
        } finally {
            await session.close();
        }
    }

    async saveQA(sessionId: string, qaPairs: any[]) {
        if (!qaPairs || !qaPairs.length) return;

        const session = this.neo4jService.getSession();
        try {
            await session.run(
                `
                MATCH (s:Session {id: $sessionId})
                UNWIND $qaPairs as pair
                MERGE (q:Question {text: pair.question})
                SET q.speaker = pair.speaker_q
                
                MERGE (a:Answer {text: pair.answer})
                SET a.speaker = pair.speaker_a
                
                MERGE (s)-[:INCLUDES_QA]->(q)
                MERGE (q)-[:HAS_ANSWER]->(a)
                `,
                { sessionId, qaPairs }
            );
            this.logger.log(`Saved ${qaPairs.length} Q&A pairs for session ${sessionId}`);
        } catch (error) {
            this.logger.error(`Failed to save Q&A pairs: ${error}`);
        } finally {
            await session.close();
        }
    }

    async getStyleExamples(sessionId: string, limit: number = 3): Promise<string[]> {
        const session = this.neo4jService.getSession();
        try {
            const result = await session.run(
                `
                MATCH (s:Session {id: $sessionId})-[:HAS_TRANSCRIPT]->(t:Transcript)
                WHERE t.speaker = 'You' OR t.speaker = 'User'
                RETURN t.text as text
                ORDER BY t.timestamp DESC
                LIMIT $limit
                `,
                { sessionId, limit: int(limit) }
            );
            return result.records.map(r => r.get('text'));
        } catch (error) {
            this.logger.error(`Failed to get style examples: ${error}`);
            return [];
        } finally {
            await session.close();
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
