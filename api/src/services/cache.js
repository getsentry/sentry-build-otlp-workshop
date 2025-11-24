import { withSpan, addEvent } from '../utils/tracer.js';

/**
 * In-memory cache store
 * Structure: { key: { value: any, expiresAt: number } }
 */
const cacheStore = new Map();

/**
 * Initialize cache (no-op for in-memory, kept for API compatibility)
 */
export async function initializeRedis() {
  console.log('✅ In-memory cache initialized');
  return true;
}

/**
 * Clean up expired entries periodically
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt && entry.expiresAt < now) {
      cacheStore.delete(key);
    }
  }
}

// Run cleanup every 60 seconds
setInterval(cleanupExpired, 60000);

/**
 * Get value from cache with instrumentation
 */
export async function get(key) {
  return withSpan(
    'cache.get',
    async (span) => {
      span.setAttributes({
        'cache.key': key,
        'cache.operation': 'get',
        'cache.type': 'in-memory',
      });

      const entry = cacheStore.get(key);
      const now = Date.now();

      // Check if exists and not expired
      if (entry && (!entry.expiresAt || entry.expiresAt > now)) {
        addEvent('cache.hit', { key });
        span.setAttribute('cache.hit', true);
        return entry.value;
      }

      // Remove if expired
      if (entry && entry.expiresAt && entry.expiresAt <= now) {
        cacheStore.delete(key);
      }

      addEvent('cache.miss', { key });
      span.setAttribute('cache.hit', false);
      return null;
    }
  );
}

/**
 * Set value in cache with TTL
 */
export async function set(key, value, ttlSeconds = 300) {
  return withSpan(
    'cache.set',
    async (span) => {
      span.setAttributes({
        'cache.key': key,
        'cache.operation': 'set',
        'cache.ttl': ttlSeconds,
        'cache.type': 'in-memory',
      });

      const expiresAt = Date.now() + (ttlSeconds * 1000);
      cacheStore.set(key, { value, expiresAt });

      addEvent('cache.stored', { key, ttl: ttlSeconds });
      return true;
    }
  );
}

/**
 * Delete value from cache
 */
export async function del(key) {
  return withSpan(
    'cache.delete',
    async (span) => {
      span.setAttributes({
        'cache.key': key,
        'cache.operation': 'delete',
        'cache.type': 'in-memory',
      });

      const existed = cacheStore.has(key);
      cacheStore.delete(key);

      addEvent('cache.deleted', { key, existed });
      return existed ? 1 : 0;
    }
  );
}

/**
 * Delete all keys matching a pattern
 */
export async function deletePattern(pattern) {
  return withSpan(
    'cache.delete_pattern',
    async (span) => {
      span.setAttributes({
        'cache.pattern': pattern,
        'cache.operation': 'delete_pattern',
        'cache.type': 'in-memory',
      });

      // Convert Redis pattern to regex (basic support for *)
      const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

      let count = 0;
      for (const key of cacheStore.keys()) {
        if (regexPattern.test(key)) {
          cacheStore.delete(key);
          count++;
        }
      }

      addEvent('cache.pattern_deleted', { pattern, count });
      return count;
    }
  );
}

/**
 * Check cache health
 */
export async function checkHealth() {
  try {
    const size = cacheStore.size;
    return {
      status: 'healthy',
      size,
      type: 'in-memory',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

/**
 * Close cache (clear for in-memory)
 */
export async function close() {
  cacheStore.clear();
}

export default {
  initializeRedis,
  get,
  set,
  del,
  deletePattern,
  checkHealth,
  close,
};
