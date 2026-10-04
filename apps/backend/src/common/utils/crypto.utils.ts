import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const PREFIX = 'enc:v1:';

function getDerivedKey(keyHexOrSecret: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(keyHexOrSecret)) {
    return Buffer.from(keyHexOrSecret, 'hex');
  }
  // If not 64 hex chars, derive 32-byte key via SHA-256
  return crypto.createHash('sha256').update(keyHexOrSecret).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptCredential(plaintext: string, key: string): string {
  if (!plaintext || plaintext.trim() === '') {
    return plaintext;
  }

  // Already encrypted?
  if (plaintext.startsWith(PREFIX)) {
    return plaintext;
  }

  const derivedKey = getDerivedKey(key);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted ciphertext.
 * If input is not encrypted (e.g. unmigrated legacy row), returns plaintext as-is.
 */
export function decryptCredential(ciphertext: string, key: string): string {
  if (!ciphertext || !ciphertext.startsWith(PREFIX)) {
    return ciphertext;
  }

  try {
    const parts = ciphertext.slice(PREFIX.length).split(':');
    if (parts.length !== 3) {
      throw new Error('Malformed encrypted payload');
    }

    const [ivHex, tagHex, encryptedHex] = parts;
    const derivedKey = getDerivedKey(key);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt credential: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function isEncrypted(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
