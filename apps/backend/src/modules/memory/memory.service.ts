
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import { int } from 'neo4j-driver';

interface QueuedTranscript {
    sessionId: string;
    text: string;
    speaker: string;
    language: string;
}

@Injectable()
export class MemoryService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MemoryService.name);
    private readonly aiServiceUrl: string;
    private transcriptQueue: QueuedTranscript[] = [];
    private flushTimer: NodeJS.Timeout | null = null;
    private readonly BATCH_MAX_SIZE = 10;
    private readonly BATCH_DEBOUNCE_MS = 2000;

    constructor(
        private readonly neo4jService: Neo4jService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://127.0.0.1:8000';
        this.httpService.axiosRef.defaults.httpAgent = new http.Agent({ keepAlive: true });
    }

    async onModuleInit() {
        await this.ensureVectorIndex();
    }

    async onModuleDestroy() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flushTranscripts();
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

    async saveTranscript(sessionId: string, text: string, speaker: string = 'User', language: string = 'en'): Promise<void> {
        if (!text || !text.trim()) return;

        this.transcriptQueue.push({
            sessionId,
            text: text.trim(),
            speaker,
            language,
        });

        // If buffer reached batch threshold, flush immediately; otherwise debounce
        if (this.transcriptQueue.length >= this.BATCH_MAX_SIZE) {
            await this.flushTranscripts();
        } else if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => {
                this.flushTranscripts().catch(err => {
                    this.logger.error(`Error in scheduled transcript flush: ${err}`);
                });
            }, this.BATCH_DEBOUNCE_MS);
        }
    }

    async flushTranscripts(): Promise<void> {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }

        if (this.transcriptQueue.length === 0) return;

        const batch = this.transcriptQueue.splice(0, this.transcriptQueue.length);
        const texts = batch.map(b => b.text);

        try {
            // 1. Fetch batch embeddings in a single HTTP request (BTN-8)
            const embeddings = await this.getBatchEmbeddings(texts);

            // 2. Prepare items with embeddings for Neo4j UNWIND
            const items = batch.map((item, idx) => ({
                sessionId: item.sessionId,
                text: item.text,
                speaker: item.speaker,
                language: item.language,
                embedding: embeddings[idx] || [],
            }));

            // 3. Save batch to Neo4j in single UNWIND query
            const session = this.neo4jService.getSession();
            try {
                await session.run(
                    `
                    UNWIND $items AS item
                    MERGE (s:Session {id: item.sessionId})
                    CREATE (t:Transcript {
                        text: item.text,
                        speaker: item.speaker,
                        sessionId: item.sessionId,
                        timestamp: datetime(),
                        embedding: item.embedding,
                        language: item.language
                    })
                    MERGE (s)-[:HAS_TRANSCRIPT]->(t)
                    `,
                    { items }
                );
                this.logger.log(`Batched & saved ${items.length} transcripts to Neo4j`);
            } finally {
                await session.close();
            }
        } catch (error) {
            this.logger.error(`Failed to flush transcript batch: ${error}`);
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
                MERGE (s:Session {id: $sessionId})
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

                WITH c, con, sessionId
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
                MERGE (s:Session {id: $sessionId})
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
        try {
            const internalToken = this.configService.get<string>('AI_SERVICE_INTERNAL_TOKEN') || 'whispermentor_internal_service_secret_token';
            const { data } = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/embed`, { text }, {
                    timeout: 60000,
                    headers: {
                        'X-Internal-Token': internalToken,
                    },
                })
            );
            return data.embedding;
        } catch (error) {
            this.logger.error(`Embedding failed: ${error}`);
            // Return empty or throw? Empty for now to convert to null or handle gracefully
            return [];
        }
    }

    private async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
        if (!texts || texts.length === 0) return [];
        try {
            const internalToken = this.configService.get<string>('AI_SERVICE_INTERNAL_TOKEN') || 'whispermentor_internal_service_secret_token';
            const { data } = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/embed`, { texts }, {
                    timeout: 60000,
                    headers: {
                        'X-Internal-Token': internalToken,
                    },
                })
            );
            return data.embeddings || texts.map(() => []);
        } catch (error) {
            this.logger.error(`Batch embedding failed: ${error}`);
            return texts.map(() => []);
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
