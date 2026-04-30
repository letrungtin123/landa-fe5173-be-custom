import { useState, useEffect } from "react";

/**
 * Debounce một giá trị — chỉ update sau khi user ngừng gõ `delay`ms.
 * Dùng cho search input để tránh spam API mỗi keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
