/**
 * Offline Service - Request Queue & Cache
 *
 * Handles offline scenarios gracefully
 * Skills: 24 (Offline-first patterns), 4 (Caching), 27 (Agent Architecture)
 *
 * Features:
 * - Queue failed requests for retry (ReAct pattern)
 * - Cache API responses (stale-while-revalidate)
 * - Sync when back online with exponential backoff
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import api from './api';

// Storage keys
const QUEUE_KEY = 'rgfl_request_queue';
const CACHE_PREFIX = 'rgfl_cache_';

// Request queue item
interface QueuedRequest {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  timestamp: number;
  retries: number;
}

// Cache item
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Default cache TTL (5 minutes)
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

// Max retries for queued requests
const MAX_RETRIES = 3;

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected ?? false;
}

/**
 * Add network state listener
 * Note: expo-network doesn't have a built-in listener, so we poll
 */
let networkListenerInterval: NodeJS.Timeout | null = null;
let lastNetworkState: boolean | null = null;

export function addNetworkListener(
  callback: (isConnected: boolean) => void
): () => void {
  // Poll every 3 seconds for network changes
  networkListenerInterval = setInterval(async () => {
    const state = await Network.getNetworkStateAsync();
    const isConnected = state.isConnected ?? false;
    if (lastNetworkState !== isConnected) {
      lastNetworkState = isConnected;
      callback(isConnected);
    }
  }, 3000);

  // Return unsubscribe function
  return () => {
    if (networkListenerInterval) {
      clearInterval(networkListenerInterval);
      networkListenerInterval = null;
    }
  };
}

// ============ REQUEST QUEUE ============

/**
 * Get queued requests
 */
async function getQueue(): Promise<QueuedRequest[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save queue
 */
async function saveQueue(queue: QueuedRequest[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Add request to queue (for offline retry)
 */
export async function queueRequest(
  method: QueuedRequest['method'],
  url: string,
  data?: any
): Promise<void> {
  const queue = await getQueue();
  const request: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    method,
    url,
    data,
    timestamp: Date.now(),
    retries: 0,
  };
  queue.push(request);
  await saveQueue(queue);
  console.log(`📥 Queued ${method} ${url} for retry`);
}

/**
 * Calculate exponential backoff delay (Skill 27: graceful error recovery)
 */
function getBackoffDelay(retries: number): number {
  return Math.min(1000 * Math.pow(2, retries), 30000); // Max 30s
}

/**
 * Sleep helper
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Process queued requests (call when back online)
 * Uses ReAct pattern: iterate → try action → observe result → decide next step
 */
export async function processQueue(): Promise<{ success: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { success: 0, failed: 0 };

  console.log(`🔄 Processing ${queue.length} queued requests...`);

  let success = 0;
  let failed = 0;
  const remaining: QueuedRequest[] = [];

  for (const request of queue) {
    // Apply exponential backoff for retried requests
    if (request.retries > 0) {
      const delay = getBackoffDelay(request.retries);
      console.log(`⏳ Backoff ${delay}ms before retry...`);
      await sleep(delay);
    }

    try {
      await api.request({
        method: request.method,
        url: request.url,
        data: request.data,
      });
      success++;
      console.log(`✅ Synced: ${request.method} ${request.url}`);
    } catch (error) {
      request.retries++;
      if (request.retries < MAX_RETRIES) {
        remaining.push(request);
        console.log(`⚠️ Retry ${request.retries}/${MAX_RETRIES}: ${request.url}`);
      } else {
        failed++;
        console.error(`❌ Failed permanently: ${request.url}`);
      }
    }
  }

  await saveQueue(remaining);
  return { success, failed };
}

/**
 * Get queue size
 */
export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Clear queue
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

// ============ RESPONSE CACHE ============

/**
 * Get cached data
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!data) return null;

    const cached: CacheItem<T> = JSON.parse(data);

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
}

/**
 * Set cached data
 */
export async function setCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<void> {
  const item: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  };
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item));
}

/**
 * Clear specific cache
 */
export async function clearCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  await AsyncStorage.multiRemove(cacheKeys);
}

// ============ CACHED API HELPERS ============

/**
 * Fetch with cache (stale-while-revalidate pattern)
 */
export async function fetchWithCache<T>(
  url: string,
  options?: {
    ttl?: number;
    forceRefresh?: boolean;
  }
): Promise<{ data: T; fromCache: boolean }> {
  const cacheKey = url.replace(/\//g, '_');
  const { ttl = DEFAULT_CACHE_TTL, forceRefresh = false } = options || {};

  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCache<T>(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${url}`);
      // Revalidate in background
      refreshCache<T>(url, cacheKey, ttl);
      return { data: cached, fromCache: true };
    }
  }

  // Fetch fresh data
  try {
    const response = await api.get<T>(url);
    await setCache(cacheKey, response.data, ttl);
    return { data: response.data, fromCache: false };
  } catch (error) {
    // If offline, try to return stale cache
    const staleCache = await getCache<T>(cacheKey);
    if (staleCache) {
      console.log(`📦 Using stale cache: ${url}`);
      return { data: staleCache, fromCache: true };
    }
    throw error;
  }
}

/**
 * Background cache refresh
 */
async function refreshCache<T>(
  url: string,
  cacheKey: string,
  ttl: number
): Promise<void> {
  try {
    const response = await api.get<T>(url);
    await setCache(cacheKey, response.data, ttl);
    console.log(`🔄 Cache refreshed: ${url}`);
  } catch {
    // Silently fail background refresh
  }
}

export default {
  isOnline,
  addNetworkListener,
  queueRequest,
  processQueue,
  getQueueSize,
  clearQueue,
  getCache,
  setCache,
  clearCache,
  clearAllCache,
  fetchWithCache,
};
