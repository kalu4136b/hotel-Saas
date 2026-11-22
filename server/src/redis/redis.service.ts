import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number | null; // null means no expiration
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const port = Number(this.configService.get<number>('REDIS_PORT', 6379));
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 3) {
            // Stop aggressive retries if Redis isn't installed locally
            return null;
          }
          return Math.min(times * 300, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          this.logger.warn(`Redis connection error: ${err.message}. Using memory cache fallback.`);
        }
        this.isConnected = false;
      });

      this.client.on('close', () => {
        if (this.isConnected) {
          this.logger.warn('Redis connection closed. Falling back to in-memory cache.');
        }
        this.isConnected = false;
      });

      // Attempt initial connection
      await this.client.connect().catch(() => {
        this.logger.log('Redis server not reachable at startup. Active in-memory cache fallback enabled.');
      });
    } catch (err: any) {
      this.logger.warn(`Redis initialization skipped: ${err.message}. Active in-memory cache fallback enabled.`);
    }

    // Schedule cleanup of expired in-memory keys every 60s
    this.cleanupInterval = setInterval(() => this.pruneMemoryCache(), 60000);
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }

  get isReady(): boolean {
    return this.isConnected;
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err: any) {
        this.logger.debug(`Redis get failed (${key}): ${err.message}, checking memory fallback`);
      }
    }

    // Fallback: in-memory cache
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err: any) {
        this.logger.debug(`Redis set failed (${key}): ${err.message}, using memory fallback`);
      }
    }

    // Fallback: in-memory cache
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value, expiresAt });
  }

  async del(keys: string | string[]): Promise<void> {
    const keyList = Array.isArray(keys) ? keys : [keys];
    if (keyList.length === 0) return;

    if (this.isConnected && this.client) {
      try {
        await this.client.del(...keyList);
      } catch (err: any) {
        this.logger.debug(`Redis del failed: ${err.message}`);
      }
    }

    for (const k of keyList) {
      this.memoryCache.delete(k);
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        const result = await this.client.incr(key);
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.expire(key, ttlSeconds);
        }
        return result;
      } catch (err: any) {
        this.logger.debug(`Redis incr failed (${key}): ${err.message}`);
      }
    }

    // In-memory increment
    const entry = this.memoryCache.get(key);
    let currentVal = 0;
    if (entry && (!entry.expiresAt || entry.expiresAt > Date.now())) {
      const parsed = parseInt(entry.value, 10);
      currentVal = isNaN(parsed) ? 0 : parsed;
    }
    const newVal = currentVal + 1;
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value: String(newVal), expiresAt });
    return newVal;
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  private pruneMemoryCache() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
  }
}
