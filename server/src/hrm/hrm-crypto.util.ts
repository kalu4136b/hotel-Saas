import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const rawSecret =
    process.env.HRM_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'ninth-hotel-hrm-default-encryption-secret-key-2026';
  return crypto.createHash('sha256').update(rawSecret).digest();
}

export function encryptSensitiveField(plainText?: string | null): string | null {
  if (!plainText || !plainText.trim()) return null;
  const trimmed = plainText.trim();
  if (trimmed.startsWith('enc:v1:')) return trimmed;

  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(trimmed, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSensitiveField(cipherText?: string | null): string | null {
  if (!cipherText) return null;
  if (!cipherText.startsWith('enc:v1:')) return cipherText;

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) return null;
    const iv = Buffer.from(parts[2], 'base64');
    const authTag = Buffer.from(parts[3], 'base64');
    const encrypted = Buffer.from(parts[4], 'base64');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export function maskSensitiveField(cipherOrPlain?: string | null): string | null {
  const plain = decryptSensitiveField(cipherOrPlain);
  if (!plain) return null;
  if (plain.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, plain.length - 4))}${plain.slice(-4)}`;
}

/**
 * Exact integer-cent financial arithmetic helpers to prevent IEEE-754 floating-point drift.
 */
export function toCents(amount: number | string | null | undefined): number {
  const num = Number(amount || 0);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function fromCents(cents: number): number {
  return Number((Math.round(cents) / 100).toFixed(2));
}

export function roundMoney(amount: number | string | null | undefined): number {
  return fromCents(toCents(amount));
}

export function multiplyMoney(
  amount: number | string,
  multiplier: number | string,
): number {
  const cents = toCents(amount);
  const factor = Number(multiplier || 0);
  return fromCents(Math.round(cents * factor));
}

export function percentageOfMoney(
  amount: number | string,
  percentage: number | string,
): number {
  const cents = toCents(amount);
  const pct = Number(percentage || 0);
  return fromCents(Math.round((cents * pct) / 100));
}

