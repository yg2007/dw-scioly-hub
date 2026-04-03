import { useState, useEffect } from "react";

/**
 * Debounce a value by the given delay.
 * Returns the debounced value — only updates after `delay` ms of inactivity.
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Debounce delay in ms (default 250)
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
