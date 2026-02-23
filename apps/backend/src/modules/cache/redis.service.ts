import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly client: Redis;

    constructor(private readonly configService: ConfigService) {
        const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        this.client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            retryStrategy: (times) => {
                if (times > 5) {
                    this.logger.warn('Redis connection failed after 5 retries. Operating without cache.');
                    return null; // Stop retrying
                }
                return Math.min(times * 200, 2000);
            },
        });

        this.client.on('connect', () => this.logger.log('✅ Redis connected'));
        this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));

        // Connect (non-blocking)
        this.client.connect().catch(() => {
            this.logger.warn('⚠️ Redis unavailable — translation cache disabled');
        });
    }

    async onModuleDestroy() {
        await this.client.quit().catch(() => { });
    }

    /** Check if Redis is connected */
    get isReady(): boolean {
        return this.client.status === 'ready';
    }

    /** Get a cached value */
    async get(key: string): Promise<string | null> {
        if (!this.isReady) return null;
        try {
            return await this.client.get(key);
        } catch {
            return null;
        }
    }

    /** Set a cached value with TTL in seconds */
    async set(key: string, value: string, ttlSeconds: number = 86400): Promise<void> {
        if (!this.isReady) return;
        try {
            await this.client.set(key, value, 'EX', ttlSeconds);
        } catch {
            // Silently fail — cache is best-effort
        }
    }

    /** Append an item to a Redis list and refresh its TTL */
    async rpush(key: string, value: string, ttlSeconds: number = 7200): Promise<void> {
        if (!this.isReady) return;
        try {
            await this.client.rpush(key, value);
            await this.client.expire(key, ttlSeconds);
        } catch {
            // best-effort
        }
    }

    /** Read all items from a Redis list */
    async lrange(key: string): Promise<string[]> {
        if (!this.isReady) return [];
        try {
            return await this.client.lrange(key, 0, -1);
        } catch {
            return [];
        }
    }

    /** Generate a cache key for translations */
    translationKey(text: string, targetLang: string): string {
        const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);
        return `trans:${hash}:${targetLang}`;
    }

    /** Generate a cache key for embeddings */
    embeddingKey(text: string): string {
        const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);
        return `embed:${hash}`;
    }

    /** Generate a cache key for RAG responses */
    ragKey(sessionId: string, question: string): string {
        const hash = createHash('sha256').update(question).digest('hex').slice(0, 16);
        return `rag:${sessionId.slice(0, 12)}:${hash}`;
    }

    /** Generate a cache key for session summaries */
    summaryKey(sessionId: string): string {
        return `summary:${sessionId}`;
    }

    /** Generate a cache key for transcript lists */
    transcriptKey(sessionId: string): string {
        return `transcript:${sessionId}`;
    }
}
