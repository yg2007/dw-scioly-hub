import { useState, useEffect, useCallback, useRef } from "react";

// ─── Simple in-memory cache for queries ───────────────────────
const queryCache = new Map();
const inFlightRequests = new Map();

/**
 * Invalidate cache by key
 * @param {string} key - Cache key to invalidate
 */
export function invalidateCache(key) {
  queryCache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  queryCache.clear();
}

/**
 * Custom hook for fetching data with caching and deduplication
 * @param {string} key - Unique cache key
 * @param {Function} queryFn - Async function that returns data
 * @param {Object} options - Configuration options
 * @param {number} options.staleTime - Cache TTL in milliseconds (default: 0, never stale)
 * @param {boolean} options.enabled - Whether to run the query (default: true)
 * @returns {Object} { data, error, loading, refetch }
 *
 * @example
 * const { data: events, error, loading, refetch } = useQuery(
 *   'events',
 *   () => supabase.from('events').select('*'),
 *   { staleTime: 60000 }
 * )
 */
export function useQuery(key, queryFn, options = {}) {
  const { staleTime = 0, enabled = true } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < staleTime) {
      if (isMountedRef.current) {
        setData(cached.data);
        setError(null);
        setLoading(false);
      }
      return;
    }

    // Check if request already in flight (deduplication)
    if (inFlightRequests.has(key)) {
      try {
        const result = await inFlightRequests.get(key);
        if (isMountedRef.current) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err?.message || "An error occurred while fetching data");
          setData(null);
          setLoading(false);
        }
      }
      return;
    }

    // Safety timeout — prevent infinite loading (15 seconds max)
    const safetyTimeout = setTimeout(() => {
      inFlightRequests.delete(key);
      if (isMountedRef.current) {
        setError("Request timed out");
        setLoading(false);
      }
    }, 15000);

    // Start new request
    const promise = (async () => {
      try {
        const result = await queryFn();

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
          setData(null);
        }
        throw err;
      } finally {
        clearTimeout(safetyTimeout);
        inFlightRequests.delete(key);
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    })();

    inFlightRequests.set(key, promise);
  }, [key, queryFn, staleTime, enabled]);

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
    fetchData();
  }, [key, fetchData]);

  return { data, error, loading, refetch };
}

/**
 * Custom hook for mutations (write operations)
 * @param {Function} mutationFn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback on success
 * @param {Function} options.onError - Callback on error
 * @returns {Object} { mutate, loading, error, reset }
 *
 * @example
 * const { mutate, loading, error } = useMutation(
 *   (data) => supabase.from('events').insert(data),
 *   { onSuccess: () => invalidateCache('events') }
 * )
 *
 * // Later:
 * mutate({ name: 'Event 1', type: 'trial' })
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
