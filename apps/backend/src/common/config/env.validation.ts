import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL cannot be empty'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  AI_SERVICE_URL: z.string().default('http://127.0.0.1:8000'),
  AI_SERVICE_INTERNAL_TOKEN: z.string().default('whispermentor_internal_service_secret_token'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_RETENTION_DAYS: z.coerce.number().default(30),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USER: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().default('whispermentor_neo4j'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => {
        const field = issue.path.join('.');
        if (issue.message.includes('expected string, received undefined') || issue.message.includes('Required')) {
          return ` - [${field}]: ${field} is required`;
        }
        return ` - [${field}]: ${issue.message}`;
      })
      .join('\n');
    throw new Error(`Environment validation failed at startup:\n${errorDetails}`);
  }

  // Reject fallback secret in production
  if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === 'dev_secret_key_change_me') {
    throw new Error('FATAL: Cannot use default JWT_SECRET in production mode.');
  }

  return parsed.data;
}
