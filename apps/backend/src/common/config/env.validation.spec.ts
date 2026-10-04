import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validBase = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test_db',
    JWT_SECRET: 'test_super_secret_key_1234567890',
  };

  it('passes with valid environment variables', () => {
    const result = validateEnv(validBase);
    expect(result.DATABASE_URL).toBe(validBase.DATABASE_URL);
    expect(result.JWT_SECRET).toBe(validBase.JWT_SECRET);
    expect(result.PORT).toBe(3001);
    expect(result.NODE_ENV).toBe('development');
  });

  it('fails if DATABASE_URL is missing', () => {
    expect(() => validateEnv({ JWT_SECRET: '1234567890123456' })).toThrow(
      /DATABASE_URL is required/,
    );
  });

  it('fails if JWT_SECRET is shorter than 16 chars', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://localhost:5432/db',
        JWT_SECRET: 'short',
      }),
    ).toThrow(/JWT_SECRET must be at least 16 characters long/);
  });

  it('fails if JWT_SECRET is the default placeholder in production', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://localhost:5432/db',
        JWT_SECRET: 'dev_secret_key_change_me',
        NODE_ENV: 'production',
      }),
    ).toThrow(/Cannot use default JWT_SECRET in production/);
  });
});
