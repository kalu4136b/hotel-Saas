import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ChannelEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const secret =
      process.env.CHANNEL_SECRET_KEY ||
      'hotel-saas-channel-manager-master-secret-key-32-chars!!';
    // Derive a fixed 32-byte key using SHA-256
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(plainText: string): string {
    if (!plainText) return '';
    const iv = crypto.randomBytes(12); // GCM standard 12-byte IV
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) {
        // Fallback if plaintext was saved unencrypted
        return cipherText;
      }
      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('Failed to decrypt channel credentials:', err);
      return '';
    }
  }

  encryptObject<T extends object>(data: T): string {
    return this.encrypt(JSON.stringify(data));
  }

  decryptObject<T extends object>(cipherText: string): T | null {
    const decrypted = this.decrypt(cipherText);
    if (!decrypted) return null;
    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return null;
    }
  }
}
