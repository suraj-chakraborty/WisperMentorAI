/**
 * Redaction utilities to prevent accidental leakage of sensitive credentials,
 * API keys, or tokens in logs.
 */
export function redactSecret(secret?: string | null): string {
  if (!secret || secret.trim() === '') {
    return '[NOT SET]';
  }
  return '[CONFIGURED]';
}

/**
 * Redacts common sensitive keys from arbitrary objects before logging.
 */
export function sanitizeLogObject<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveFields = [
    'apikey',
    'api_key',
    'password',
    'secret',
    'token',
    'jwt_secret',
    'encryption_key',
    'access_token',
  ];

  const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some((field) => lowerKey.includes(field));

    if (isSensitive && typeof value === 'string') {
      sanitized[key] = redactSecret(value);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeLogObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
