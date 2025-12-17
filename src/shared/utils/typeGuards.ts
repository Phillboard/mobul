/**
 * Type Guards and Safe Data Access Utilities
 * 
 * Provides type-safe utilities for working with potentially undefined/null data
 * to prevent "Cannot read properties of undefined" errors.
 */

/**
 * Safely map an array, filtering out undefined/null items and results
 * 
 * @example
 * const ids = safeMap(users, user => user.id);
 * // Returns string[] even if users is undefined or contains undefined items
 */
export function safeMap<T, R>(
  array: T[] | undefined | null,
  mapper: (item: T, index: number) => R | undefined | null
): NonNullable<R>[] {
  if (!array) return [];
  return array
    .filter((item): item is T => item != null)
    .map(mapper)
    .filter((result): result is NonNullable<R> => result != null);
}

/**
 * Safely filter an array, handling undefined/null arrays
 * 
 * @example
 * const activeUsers = safeFilter(users, user => user.isActive);
 */
export function safeFilter<T>(
  array: T[] | undefined | null,
  predicate: (item: T, index: number) => boolean
): T[] {
  if (!array) return [];
  return array.filter((item): item is T => item != null).filter(predicate);
}

/**
 * Safely find an item in an array
 * 
 * @example
 * const user = safeFind(users, u => u.id === userId);
 */
export function safeFind<T>(
  array: T[] | undefined | null,
  predicate: (item: T, index: number) => boolean
): T | undefined {
  if (!array) return undefined;
  return array.filter((item): item is T => item != null).find(predicate);
}

/**
 * Check if an object has a specific property with a non-null value
 * 
 * @example
 * if (hasProperty(obj, 'id')) {
 *   console.log(obj.id); // TypeScript knows obj.id exists
 * }
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T | undefined | null,
  key: K
): obj is T & Record<K, unknown> {
  return obj != null && key in obj && (obj as Record<K, unknown>)[key] != null;
}

/**
 * Safely access a nested property path
 * 
 * @example
 * const brandName = getNestedValue(gc, ['brand', 'brand_name']);
 */
export function getNestedValue<T>(
  obj: unknown,
  path: string[]
): T | undefined {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current as T | undefined;
}

/**
 * Check if a value is defined (not null or undefined)
 * Useful as a type guard in filter operations
 * 
 * @example
 * const definedItems = items.filter(isDefined);
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value != null;
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a non-empty array
 */
export function isNonEmptyArray<T>(value: T[] | undefined | null): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Safely get array length, returning 0 for undefined/null
 */
export function safeLength(array: unknown[] | undefined | null): number {
  return array?.length ?? 0;
}

/**
 * Create a safe version of an object that returns undefined for missing properties
 * instead of throwing an error
 */
export function createSafeObject<T extends object>(obj: T | undefined | null): Partial<T> {
  if (obj == null) return {};
  return obj;
}

/**
 * Safely get the first item from an array
 */
export function safeFirst<T>(array: T[] | undefined | null): T | undefined {
  return array?.[0];
}

/**
 * Safely get the last item from an array
 */
export function safeLast<T>(array: T[] | undefined | null): T | undefined {
  if (!array || array.length === 0) return undefined;
  return array[array.length - 1];
}
