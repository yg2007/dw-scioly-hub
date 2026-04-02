import { useState, useEffect, useCallback, useRef } from "react";
import { ensureFreshSession } from "./supabase";

// ─── Simple in-memory cache for queries ───────────────────────
const queryCache = new Map();
const inFlightRequests = new Map();

/**
 * Invalidate cache by key (exact match or prefix match)
 * @param {string} key - Cache key or prefix to invalidate
 */
export function invalidateCache(key) {
  // Exact match
  if (queryCache.has(key)) {
    queryCache.delete(key);
    return;
  }
  // Prefix match — invalidate all keys starting with this prefix
  for (const k of queryCache.keys()) {
    if (k.startsWith(key)) queryCache.delete(k);
  }
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  queryCache.clear();
}

/**
 * Read a cached value synchronously (for instant display)
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
export function readCache(key) {
  const cached = queryCache.get(key);
  return cached ? cached.data : null;
}

// ─── Auth error detection ─────────────────────────────────────
function isAuthError(err) {
  if (!err) return false;
  const msg = (err.message || err.msg || "").toLowerCase();
  const code = err.code || err.status || err.statusCode;
  return (
    code === 401 || code === 403 || code === "PGRST301" ||
    msg.includes("jwt expired") ||
    msg.includes("token is expired") ||
    msg.includes("invalid claim") ||
    msg.includes("not authenticated") ||
    msg.includes("permission denied")
  );
}

// ─── Retry helper with exponential backoff ────────────────────
const MAX_RETRIES = 2;
const BASE_DELAY = 1500; // 1.5s, 3s

async function fetchWithRetry(queryFn, retries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await queryFn();
    } catch (err) {
      lastError = err;
      // If it's an auth error, refresh the session before retrying
      if (isAuthError(err) && attempt < retries) {
        try {
          await ensureFreshSession();
        } catch (_) {
          // refresh failed — will retry the query anyway
        }
        // Short delay then retry with the fresh token
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      if (attempt < retries) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Custom hook for fetching data with caching, deduplication, and retry
 * @param {string} key - Unique cache key
 * @param {Function} queryFn - Async function that returns data
 * @param {Object} options - Configuration options
 * @param {number} options.staleTime - Cache TTL in milliseconds (default: 0, never stale)
 * @param {boolean} options.enabled - Whether to run the query (default: true)
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @returns {Object} { data, error, loading, isRefetching, refetch }
 */
export function useQuery(key, queryFn, options = {}) {
  const { staleTime = 0, enabled = true, timeout = 30000 } = options;

  // Initialize from cache synchronously for instant display (stale-while-revalidate)
  const [data, setData] = useState(() => {
    const c = queryCache.get(key);
    return c ? c.data : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(() => !queryCache.has(key));
  const [isRefetching, setIsRefetching] = useState(false);
  const isMountedRef = useRef(true);
  const prevKeyRef = useRef(key);

  // Reset state when key changes
  useEffect(() => {
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;
    const newCached = queryCache.get(key);
    if (newCached) {
      setData(newCached.data);
      setLoading(false);
      setError(null);
    } else {
      setData(null);
      setLoading(true);
      setError(null);
    }
  }, [key]);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Check cache freshness
    const cachedEntry = queryCache.get(key);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < staleTime) {
      if (isMountedRef.current) {
        setData(cachedEntry.data);
        setError(null);
        setLoading(false);
        setIsRefetching(false);
      }
      return;
    }

    // Stale-while-revalidate: if we have stale data, show it immediately
    // and fetch in the background
    if (cachedEntry && !isBackground) {
      if (isMountedRef.current) {
        setData(cachedEntry.data);
        setLoading(false);
        setIsRefetching(true);
      }
    }

    // Check if request already in flight (deduplication)
    if (inFlightRequests.has(key)) {
      try {
        const result = await inFlightRequests.get(key);
        if (isMountedRef.current) {
          setData(result);
          setError(null);
          setLoading(false);
          setIsRefetching(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err?.message || "An error occurred while fetching data");
          // Keep stale data on error instead of clearing
          if (!cachedEntry) setData(null);
          setLoading(false);
          setIsRefetching(false);
        }
      }
      return;
    }

    // Start new request with timeout + retry
    const promise = (async () => {
      try {
        // Race the query against a timeout
        const result = await Promise.race([
          fetchWithRetry(queryFn),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out — please try again")), timeout)
          ),
        ]);

        // Cache the result
        queryCache.set(key, {
          data: result,
          timestamp: Date.now(),
        });

        if (isMountedRef.current) {
          setData(result);
          setError(null);
        }
        return result;
      } catch (err) {
        const message = err?.message || "An error occurred while fetching data";
        console.error(`[useQuery ${key}]`, err);

        if (isMountedRef.current) {
          setError(message);
          // Keep stale data on error instead of clearing
          if (!cachedEntry) setData(null);
        }
        throw err;
      } finally {
        inFlightRequests.delete(key);
        if (isMountedRef.current) {
          setLoading(false);
          setIsRefetching(false);
        }
      }
    })();

    inFlightRequests.set(key, promise);
  }, [key, queryFn, staleTime, enabled, timeout]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [key, enabled, fetchData]);

  const refetch = useCallback(() => {
    invalidateCache(key);
    setLoading(true);
    setError(null);
    return fetchData();
  }, [key, fetchData]);

  return { data, error, loading, isRefetching, refetch };
}

/**
 * Custom hook for mutations (write operations)
 * @param {Function} mutationFn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * @returns {Object} { mutate, loading, error, reset }
 */
export function useMutation(mutationFn, options = {}) {
  const { onSuccess, onError } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (variables) => {
      setLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        if (isMountedRef.current) {
          setLoading(false);
        }
        if (onSuccess) onSuccess(result);
        return result;
      } catch (err) {
        const message = err?.message || "An error occurred";
        console.error("[useMutation]", err);

        if (isMountedRef.current) {
          setError(message);
          setLoading(false);
        }
        if (onError) onError(err);
        throw err;
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, loading, error, reset };
}
