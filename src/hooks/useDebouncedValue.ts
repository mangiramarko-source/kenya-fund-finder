import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Debounce a string value. Returns the debounced value that only updates
 * after the specified delay (ms) since the last change.
 */
export function useDebouncedValue(value: string, delay = 300): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
