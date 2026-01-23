import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('Cache Module', () => {
  let globalCache: any;
  let TTL: any;
  let getOrFetch: any;
  let invalidateGmailCache: any;
  let getCacheStats: any;
  let getCached: any;
  let setCache: any;

  beforeEach(async () => {
    vi.resetModules();
    const cacheModule = await import('../../../server/cache');
    globalCache = cacheModule.globalCache;
    TTL = cacheModule.TTL;
    getOrFetch = cacheModule.getOrFetch;
    invalidateGmailCache = cacheModule.invalidateGmailCache;
    getCacheStats = cacheModule.getCacheStats;
    getCached = cacheModule.getCached;
    setCache = cacheModule.setCache;
    globalCache.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('TTL Constants', () => {
    it('should have appropriate TTL values defined', () => {
      expect(TTL.SHORT).toBeDefined();
      expect(TTL.MEDIUM).toBeDefined();
      expect(TTL.LONG).toBeDefined();
      expect(TTL.SHORT).toBeLessThan(TTL.MEDIUM);
      expect(TTL.MEDIUM).toBeLessThan(TTL.LONG);
    });
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve values', () => {
      setCache('test-key', { data: 'test-value' });
      const result = getCached('test-key');
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for missing keys', () => {
      const result = getCached('nonexistent-key');
      expect(result).toBeNull();
    });

    it('should delete values', () => {
      setCache('delete-test', 'value');
      expect(getCached('delete-test')).toBe('value');
      globalCache.delete('delete-test');
      expect(getCached('delete-test')).toBeNull();
    });

    it('should clear all values', () => {
      setCache('key1', 'value1');
      setCache('key2', 'value2');
      globalCache.clear();
      expect(getCached('key1')).toBeNull();
      expect(getCached('key2')).toBeNull();
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value if available', async () => {
      const fetchFn = vi.fn().mockResolvedValue('fetched-value');
      setCache('cached-key', 'cached-value');
      
      const result = await getOrFetch('cached-key', fetchFn, TTL.SHORT);
      
      expect(result).toBe('cached-value');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if not cached', async () => {
      const fetchFn = vi.fn().mockResolvedValue('new-value');
      
      const result = await getOrFetch('new-key', fetchFn, TTL.SHORT);
      
      expect(result).toBe('new-value');
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(getCached('new-key')).toBe('new-value');
    });
  });

  describe('Gmail Cache Invalidation', () => {
    it('should invalidate gmail-related cache entries for a user', () => {
      const userId = 'user-123';
      setCache(`gmail:labels:${userId}:1`, ['label1', 'label2']);
      setCache(`gmail:messages:${userId}:1:inbox`, ['msg1', 'msg2']);
      setCache('other-key', 'other-value');
      
      invalidateGmailCache(userId);
      
      expect(getCached(`gmail:labels:${userId}:1`)).toBeNull();
      expect(getCached(`gmail:messages:${userId}:1:inbox`)).toBeNull();
      expect(getCached('other-key')).toBe('other-value');
    });
  });

  describe('Cache Stats', () => {
    it('should return cache statistics', () => {
      setCache('stat-key-1', 'value1');
      setCache('stat-key-2', 'value2');
      
      const stats = getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats.size).toBeGreaterThanOrEqual(2);
    });
  });
});
