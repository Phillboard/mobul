import { useState, useCallback } from "react";

interface RateLimitState {
  submissions: number[];
  lastSubmission: number | null;
}

const MAX_SUBMISSIONS_PER_HOUR = 5;
const ONE_HOUR = 60 * 60 * 1000;

/**
 * Rate limiting hook for form submissions
 * Prevents spam by tracking submission timestamps per IP/device
 */
export function useFormSubmissionRateLimit() {
  const [state, setState] = useState<RateLimitState>(() => {
    // Try to load from localStorage
    try {
      const stored = localStorage.getItem('form_rate_limit');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore errors
    }
    return { submissions: [], lastSubmission: null };
  });

  const checkRateLimit = useCallback((): { allowed: boolean; remaining: number; resetTime: Date | null } => {
    const now = Date.now();
    
    // Filter out submissions older than 1 hour
    const recentSubmissions = state.submissions.filter(
      (timestamp) => now - timestamp < ONE_HOUR
    );

    // Update state with filtered submissions
    const newState = {
      submissions: recentSubmissions,
      lastSubmission: state.lastSubmission,
    };
    setState(newState);
    
    // Save to localStorage
    try {
      localStorage.setItem('form_rate_limit', JSON.stringify(newState));
    } catch (e) {
      // Ignore storage errors
    }

    const allowed = recentSubmissions.length < MAX_SUBMISSIONS_PER_HOUR;
    const remaining = Math.max(0, MAX_SUBMISSIONS_PER_HOUR - recentSubmissions.length);
    
    // Calculate reset time (when oldest submission expires)
    const resetTime = recentSubmissions.length > 0
      ? new Date(recentSubmissions[0] + ONE_HOUR)
      : null;

    return { allowed, remaining, resetTime };
  }, [state]);

  const recordSubmission = useCallback(() => {
    const now = Date.now();
    const newState = {
      submissions: [...state.submissions, now],
      lastSubmission: now,
    };
    
    setState(newState);
    
    // Save to localStorage
    try {
      localStorage.setItem('form_rate_limit', JSON.stringify(newState));
    } catch (e) {
      // Ignore storage errors
    }
  }, [state]);

  const reset = useCallback(() => {
    const newState = { submissions: [], lastSubmission: null };
    setState(newState);
    
    try {
      localStorage.removeItem('form_rate_limit');
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  return {
    checkRateLimit,
    recordSubmission,
    reset,
  };
}
