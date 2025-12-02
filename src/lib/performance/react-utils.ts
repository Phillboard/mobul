/**
 * React Performance Utilities
 * 
 * Provides memoization and optimization helpers for React components
 * to reduce unnecessary re-renders and improve UI responsiveness.
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Compare function for React.memo
 * Compares objects by their ID and updated_at timestamp
 * 
 * Usage:
 * export const MyComponent = React.memo(Component, propsAreEqual);
 */
export function propsAreEqual<T extends { id: string; updated_at?: string }>(
  prevProps: { data: T },
  nextProps: { data: T }
): boolean {
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.updated_at === nextProps.data.updated_at
  );
}

/**
 * Compare function for list items
 * Useful for virtualized lists
 */
export function listItemsAreEqual<T extends { id: string }>(
  prevProps: { items: T[] },
  nextProps: { items: T[] }
): boolean {
  if (prevProps.items.length !== nextProps.items.length) {
    return false;
  }
  
  return prevProps.items.every(
    (item, index) => item.id === nextProps.items[index]?.id
  );
}

/**
 * Debounced value hook
 * Delays updating a value until user stops changing it
 * 
 * Usage:
 * const debouncedSearch = useDebouncedValue(searchTerm, 300);
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Need to import useState for the hook above
import { useState } from 'react';

/**
 * Throttled callback hook
 * Ensures a callback is only called once per interval
 * 
 * Usage:
 * const throttledScroll = useThrottledCallback(handleScroll, 100);
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef(0);
  const lastArgs = useRef<Parameters<T> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs.current = args;

    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    } else if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        timeoutRef.current = null;
        if (lastArgs.current) {
          callback(...lastArgs.current);
        }
      }, delay - (now - lastCall.current));
    }
  }, [callback, delay]) as T;
}

/**
 * Previous value hook
 * Tracks the previous value of a variable
 * 
 * Usage:
 * const prevCount = usePrevious(count);
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

/**
 * Stable callback hook
 * Creates a callback that always references the latest function
 * without causing re-renders when passed as a prop
 * 
 * Usage:
 * const stableCallback = useStableCallback(handleChange);
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Intersection observer hook for lazy loading
 * Triggers callback when element enters viewport
 * 
 * Usage:
 * const { ref, isVisible } = useIntersectionObserver({ threshold: 0.1 });
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): { ref: React.RefCallback<Element>; isVisible: boolean } {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState<Element | null>(null);

  const ref = useCallback((node: Element | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, options.threshold, options.root, options.rootMargin]);

  return { ref, isVisible };
}

/**
 * Memoized selector hook
 * Creates a memoized derived value from multiple dependencies
 * 
 * Usage:
 * const filteredItems = useMemoizedSelector(
 *   [items, filter],
 *   (items, filter) => items.filter(item => item.status === filter)
 * );
 */
export function useMemoizedSelector<T, D extends unknown[]>(
  dependencies: D,
  selector: (...deps: D) => T
): T {
  return useMemo(() => selector(...dependencies), dependencies);
}

/**
 * Batch updates helper
 * Groups multiple state updates to minimize re-renders
 * 
 * Usage:
 * batchUpdates(() => {
 *   setCount(1);
 *   setName('test');
 *   setItems([]);
 * });
 * 
 * Note: React 18+ automatically batches updates, but this can be useful
 * for explicit control in event handlers
 */
export function batchUpdates(callback: () => void): void {
  // React 18+ batches by default, so this is just a pass-through
  // In older versions, you might use unstable_batchedUpdates from react-dom
  callback();
}

/**
 * Performance mark helpers for debugging
 */
export const perfMark = {
  start: (name: string) => {
    if (typeof performance !== 'undefined' && import.meta.env.DEV) {
      performance.mark(`${name}-start`);
    }
  },
  end: (name: string) => {
    if (typeof performance !== 'undefined' && import.meta.env.DEV) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measures = performance.getEntriesByName(name, 'measure');
        const lastMeasure = measures[measures.length - 1];
        if (lastMeasure) {
          console.log(`[Perf] ${name}: ${lastMeasure.duration.toFixed(2)}ms`);
        }
      } catch (e) {
        // Marks might not exist
      }
    }
  },
};

