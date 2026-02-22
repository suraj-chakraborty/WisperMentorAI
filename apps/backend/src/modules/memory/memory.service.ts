
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import { int } from 'neo4j-driver';
import { RedisService } from '../cache/redis.service';

@Injectable()
export class MemoryService implements OnModuleInit {
    private readonly logger = new Logger(MemoryService.name);
    private readonly aiServiceUrl: string;

    constructor(
        private readonly neo4jService: Neo4jService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly redisService: RedisService
    ) {
        this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://127.0.0.1:8000';
        this.httpService.axiosRef.defaults.httpAgent = new http.Agent({ keepAlive: true });
    }

    async onModuleInit() {
        await this.ensureVectorIndex();
    }

    private async ensureVectorIndex() {
        const session = this.neo4jService.getSession();
        try {
            // Check if index already exists
            const result = await session.run(`SHOW INDEXES WHERE name = 'transcript_embeddings'`);
            if (result.records.length > 0) {
                this.logger.log('✅ Vector index "transcript_embeddings" already exists');
                return;
            }

            // Create the vector index (384 dimensions for sentence-transformers)
            await session.run(`
                CALL db.index.vector.createNodeIndex(
                    'transcript_embeddings',
                    'Transcript',
                    'embedding',
                    384,
                    'cosine'
                )
            `);
            this.logger.log('✅ Created vector index "transcript_embeddings" (384-dim, cosine)');
        } catch (error: any) {
            // Index might already exist (race condition) or Neo4j version doesn't support it
            if (error.message?.includes('already exists')) {
                this.logger.log('✅ Vector index "transcript_embeddings" already exists');
            } else {
                this.logger.error(`Failed to create vector index: ${error.message}`);
            }
        } finally {
            await session.close();
        }
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
                SET con.definition = c.definition,
                    con.name_translated = c.name_translated,
                    con.definition_translated = c.definition_translated
                MERGE (s)-[:MENTIONS]->(con)
                
                FOREACH (ex IN c.examples | 
                    MERGE (e:Example {text: ex}) 
                    MERGE (con)-[:HAS_EXAMPLE]->(e)
                )
                
                FOREACH (rule IN c.rules | 
                    MERGE (r:Rule {text: rule}) 
                    MERGE (con)-[:HAS_RULE]->(r)
                )

                WITH c, con
                UNWIND c.related_concepts as related
                MERGE (rel:Concept {name: related})
                MERGE (con)-[:RELATED_TO]->(rel)
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
                SET q.speaker = pair.speaker_q,
                    q.text_translated = pair.question_translated
                
                MERGE (a:Answer {text: pair.answer})
                SET a.speaker = pair.speaker_a,
                    a.text_translated = pair.answer_translated
                
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
        // Redis Embedding Cache
        const cacheKey = this.redisService.embeddingKey(text);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            this.logger.debug(`⚡ [EMBED CACHE HIT] "${text.substring(0, 30)}..."`);
            return JSON.parse(cached);
        }

        try {
            const { data } = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/embed`, { text }, { timeout: 60000 })
            );
            // Cache embedding for 48h (embeddings are deterministic)
            await this.redisService.set(cacheKey, JSON.stringify(data.embedding), 172800);
            this.logger.debug(`📦 [EMBED CACHED] "${text.substring(0, 30)}..."`);
            return data.embedding;
        } catch (error) {
            this.logger.error(`Embedding failed: ${error}`);
            return [];
        }
    }

    async getKnowledgeGraph(sessionId?: string): Promise<{ nodes: any[], links: any[] }> {
        const session = this.neo4jService.getSession();
        try {
            // Fetch Concepts and relationships
            // Optional filter by session if sessionId provided
            // For now, we fetch the whole graph or subgraph connected to the session
            let query = `
                MATCH (c:Concept)
                OPTIONAL MATCH (c)-[r:RELATED_TO]->(target:Concept)
                RETURN c as source, target, type(r) as rel
                LIMIT 100
            `;

            if (sessionId) {
                query = `
                    MATCH (s:Session {id: $sessionId})-[:MENTIONS]->(c:Concept)
                    OPTIONAL MATCH (c)-[r:RELATED_TO]->(target:Concept)
                    RETURN c as source, target, type(r) as rel
                    LIMIT 200
                `;
            }

            const result = await session.run(query, { sessionId });

            const nodes = new Map();
            const links: any[] = [];

            result.records.forEach(record => {
                const source = record.get('source');
                const target = record.get('target'); // Can be null if OPTIONAL MATCH fails

                if (source && source.properties) {
                    nodes.set(source.properties.name, {
                        id: source.properties.name,
                        label: source.properties.name,
                        label_translated: source.properties.name_translated,
                        definition: source.properties.definition,
                        definition_translated: source.properties.definition_translated,
                        type: 'Concept'
                    });
                }

                if (target && target.properties) {
                    nodes.set(target.properties.name, {
                        id: target.properties.name,
                        label: target.properties.name,
                        label_translated: target.properties.name_translated,
                        definition: target.properties.definition,
                        definition_translated: target.properties.definition_translated,
                        type: 'Concept'
                    });
                    if (source) {
                        links.push({ source: source.properties.name, target: target.properties.name, label: 'RELATED_TO' });
                    }
                }
            });

            return {
                nodes: Array.from(nodes.values()),
                links
            };
        } catch (error) {
            this.logger.error(`Failed to get knowledge graph: ${error}`);
            return { nodes: [], links: [] };
        } finally {
            await session.close();
        }
    }

    async getGlossary(sessionId?: string): Promise<any[]> {
        const session = this.neo4jService.getSession();
        try {
            let query = `
                MATCH (c:Concept)
                RETURN c as concept
                LIMIT 100
            `;
            if (sessionId) {
                query = `
                    MATCH (s:Session {id: $sessionId})-[:MENTIONS]->(c:Concept)
                    RETURN c as concept
                `;
            }

            const result = await session.run(query, { sessionId });
            return result.records.map(r => {
                const props = r.get('concept').properties;
                return {
                    name: props.name,
                    name_translated: props.name_translated,
                    definition: props.definition,
                    definition_translated: props.definition_translated
                };
            });
        } catch (error) {
            this.logger.error(`Failed to get glossary: ${error}`);
            return [];
        } finally {
            await session.close();
        }
    }
}
