import { encryptCredential, decryptCredential, isEncrypted } from './crypto.utils';

describe('crypto.utils (AES-256-GCM)', () => {
  const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const apiKey = 'sk-proj-abc123xyzSecretKey987654321';

  it('encrypts and decrypts string correctly', () => {
    const encrypted = encryptCredential(apiKey, testKey);
    expect(encrypted).not.toBe(apiKey);
    expect(isEncrypted(encrypted)).toBe(true);
    expect(encrypted.startsWith('enc:v1:')).toBe(true);

    const decrypted = decryptCredential(encrypted, testKey);
    expect(decrypted).toBe(apiKey);
  });

  it('produces different ciphertexts for the same plaintext due to random IV', () => {
    const enc1 = encryptCredential(apiKey, testKey);
    const enc2 = encryptCredential(apiKey, testKey);
    expect(enc1).not.toBe(enc2);

    expect(decryptCredential(enc1, testKey)).toBe(apiKey);
    expect(decryptCredential(enc2, testKey)).toBe(apiKey);
  });

  it('returns plaintext unchanged if already decrypted or not encrypted', () => {
    const raw = 'legacy_plaintext_key';
    expect(isEncrypted(raw)).toBe(false);
    expect(decryptCredential(raw, testKey)).toBe(raw);
  });

  it('does not double encrypt if already encrypted', () => {
    const enc = encryptCredential(apiKey, testKey);
    const doubleEnc = encryptCredential(enc, testKey);
    expect(doubleEnc).toBe(enc);
  });

  it('throws on tampered ciphertext or wrong key', () => {
    const enc = encryptCredential(apiKey, testKey);
    const wrongKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    expect(() => decryptCredential(enc, wrongKey)).toThrow(/Failed to decrypt credential/);
  });
});
