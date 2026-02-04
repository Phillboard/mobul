/**
 * Logging Module
 * 
 * Provides unified logging services for the platform.
 */

export { 
  activityLogger, 
  logActivity,
  type ActivityCategory,
  type ActivityStatus,
  type Severity,
  type RetentionClass,
  type LogActivityParams,
  type ActivityLogParams,
} from './activityLogger';

export { useActivityLogger } from './useActivityLogger';
