interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheOptions {
  ttlSeconds: number;
  maxSize?: number;
}

const DEFAULT_TTL = 300;
const DEFAULT_MAX_SIZE = 1000;

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest() {
    if (this.cache.size >= this.maxSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  set<T>(key: string, data: T, ttlSeconds = DEFAULT_TTL): void {
    this.evictOldest();
    
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  stats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

const globalCache = new MemoryCache();

export const cache = {
  gmail: {
    labels: (userId: string, accountId: number) => `gmail:labels:${userId}:${accountId}`,
    messages: (userId: string, accountId: number, filter: string) => `gmail:messages:${userId}:${accountId}:${filter}`,
    message: (userId: string, accountId: number, messageId: string) => `gmail:message:${userId}:${accountId}:${messageId}`,
  },
  calendar: {
    events: (userId: string, start: string, end: string) => `calendar:events:${userId}:${start}:${end}`,
  },
  user: {
    preferences: (userId: string) => `user:preferences:${userId}`,
    profile: (userId: string) => `user:profile:${userId}`,
  },
  slack: {
    channels: (userId: string) => `slack:channels:${userId}`,
    messages: (userId: string, channelId: string) => `slack:messages:${userId}:${channelId}`,
  },
};

export const TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 900,
  VERY_LONG: 3600,
  LABELS: 600,
  EVENTS: 120,
  PREFERENCES: 300,
  MESSAGES: 60,
};

export function getCached<T>(key: string): T | null {
  return globalCache.get<T>(key);
}

export function setCache<T>(key: string, data: T, ttlSeconds = DEFAULT_TTL): void {
  globalCache.set(key, data, ttlSeconds);
}

export function invalidateCache(key: string): boolean {
  return globalCache.delete(key);
}

export function invalidateCachePattern(pattern: string): number {
  return globalCache.deletePattern(pattern);
}

export function invalidateUserCache(userId: string): void {
  globalCache.deletePattern(`*:${userId}:*`);
  globalCache.deletePattern(`*:${userId}`);
}

export function invalidateGmailCache(userId: string, accountId?: number): void {
  if (accountId) {
    globalCache.deletePattern(`gmail:*:${userId}:${accountId}*`);
  } else {
    globalCache.deletePattern(`gmail:*:${userId}:*`);
  }
}

export function invalidateCalendarCache(userId: string): void {
  globalCache.deletePattern(`calendar:*:${userId}:*`);
}

export function getCacheStats() {
  return globalCache.stats();
}

export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = DEFAULT_TTL
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetcher();
  setCache(key, data, ttlSeconds);
  return data;
}

export { globalCache };
