import { useState, useEffect } from "react";

/**
 * Custom Hook useDebounce
 * Sesuai aturan AGENTS.md: Minimal debounce 300ms untuk realtime search
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
