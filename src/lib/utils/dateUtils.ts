/**
 * Centralized Date Utilities using date-fns
 * All date formatting and manipulation should use these utilities
 */
import { 
  format, 
  formatDistanceToNow, 
  formatDistanceToNowStrict,
  formatDistance,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  addDays, 
  addHours,
  addMinutes,
  subDays,
  subHours,
  parseISO, 
  isValid,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

// Common date format patterns
export const DATE_FORMATS = {
  SHORT: 'MMM d, yyyy',           // Jan 1, 2024
  LONG: 'MMMM d, yyyy',           // January 1, 2024
  FULL: 'EEEE, MMMM d, yyyy',     // Monday, January 1, 2024
  TIME: 'h:mm a',                 // 3:30 PM
  DATETIME: 'MMM d, yyyy h:mm a', // Jan 1, 2024 3:30 PM
  ISO: "yyyy-MM-dd'T'HH:mm:ss",   // 2024-01-01T15:30:00
  DATE_ONLY: 'yyyy-MM-dd',        // 2024-01-01
  MONTH_YEAR: 'MMMM yyyy',        // January 2024
  SHORT_MONTH_YEAR: 'MMM yyyy',   // Jan 2024
} as const;

/**
 * Format a date using a standard pattern
 */
export function formatDate(date: Date | string | null | undefined, pattern: string = DATE_FORMATS.SHORT): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, pattern);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format as "3 days ago", "2 hours ago", etc.
 */
export function formatRelative(date: Date | string | null | undefined, addSuffix = true): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return formatDistanceToNow(dateObj, { addSuffix });
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return '';
  }
}

/**
 * Format as strict relative time (no "about", "over", etc.)
 */
export function formatRelativeStrict(date: Date | string | null | undefined, addSuffix = true): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return formatDistanceToNowStrict(dateObj, { addSuffix });
  } catch (error) {
    console.error('Error formatting strict relative date:', error);
    return '';
  }
}

/**
 * Format distance between two dates
 */
export function formatDateDistance(startDate: Date | string, endDate: Date | string): string {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    if (!isValid(start) || !isValid(end)) return '';
    return formatDistance(start, end);
  } catch (error) {
    console.error('Error formatting date distance:', error);
    return '';
  }
}

/**
 * Parse ISO string to Date object
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj);
  } catch (error) {
    return false;
  }
}

// Re-export commonly used date-fns functions
export {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  addDays,
  addHours,
  addMinutes,
  subDays,
  subHours,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
};

/**
 * Get human-readable time difference
 * e.g., "2 days", "3 hours", "45 minutes"
 */
export function getTimeDifference(date: Date | string): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    
    const now = new Date();
    const days = differenceInDays(now, dateObj);
    const hours = differenceInHours(now, dateObj);
    const minutes = differenceInMinutes(now, dateObj);
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    return 'just now';
  } catch (error) {
    console.error('Error getting time difference:', error);
    return '';
  }
}

/**
 * Format for display in tables (combines date and relative time)
 * e.g., "Jan 1, 2024 (3 days ago)"
 */
export function formatTableDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const formatted = formatDate(date, DATE_FORMATS.SHORT);
  const relative = formatRelative(date);
  
  return `${formatted} (${relative})`;
}
