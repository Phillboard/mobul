/**
 * Error Handling Tests
 * 
 * Tests for the error handling utilities used in the AI Designer.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  classifyError,
  validateHTML,
  sanitizeHTML,
  withRetry,
  getUserFriendlyError,
} from '../utils/errorHandling';

describe('classifyError', () => {
  it('should classify rate limit errors', () => {
    const error = new Error('rate limit exceeded');
    const result = classifyError(error);
    expect(result.type).toBe('AI_RATE_LIMITED');
    expect(result.recoverable).toBe(true);
  });

  it('should classify timeout errors', () => {
    const error = new Error('Request timed out');
    const result = classifyError(error);
    expect(result.type).toBe('AI_TIMEOUT');
    expect(result.recoverable).toBe(true);
  });

  it('should classify network errors', () => {
    const error = new Error('Failed to fetch');
    const result = classifyError(error);
    expect(result.type).toBe('NETWORK_ERROR');
    expect(result.recoverable).toBe(true);
  });

  it('should classify authentication errors', () => {
    const error = new Error('Unauthorized');
    const result = classifyError(error);
    expect(result.type).toBe('AUTHENTICATION_ERROR');
    expect(result.recoverable).toBe(false);
  });

  it('should classify permission errors', () => {
    const error = new Error('403 Forbidden');
    const result = classifyError(error);
    expect(result.type).toBe('PERMISSION_DENIED');
    expect(result.recoverable).toBe(false);
  });

  it('should classify AI generation errors', () => {
    const error = new Error('Failed to generate with OpenAI');
    const result = classifyError(error);
    expect(result.type).toBe('AI_GENERATION_FAILED');
    expect(result.recoverable).toBe(true);
  });

  it('should handle string errors', () => {
    const result = classifyError('Something went wrong');
    expect(result.type).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('Something went wrong');
  });

  it('should classify unknown errors as recoverable', () => {
    const error = new Error('Some random error');
    const result = classifyError(error);
    expect(result.type).toBe('UNKNOWN_ERROR');
    expect(result.recoverable).toBe(true);
  });
});

describe('validateHTML', () => {
  it('should return invalid for empty HTML', () => {
    const result = validateHTML('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('HTML content is empty');
  });

  it('should return invalid for whitespace-only HTML', () => {
    const result = validateHTML('   ');
    expect(result.isValid).toBe(false);
  });

  it('should return valid for basic HTML', () => {
    const html = '<div><h1>Hello World</h1></div>';
    const result = validateHTML(html);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should warn about script tags', () => {
    const html = '<div><script>alert("xss")</script></div>';
    const result = validateHTML(html);
    expect(result.warnings.some(w => w.includes('script'))).toBe(true);
  });

  it('should warn about inline event handlers', () => {
    const html = '<button onclick="doSomething()">Click</button>';
    const result = validateHTML(html);
    expect(result.warnings.some(w => w.includes('event handlers'))).toBe(true);
  });

  it('should validate complex HTML structures', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <div class="container">
            <h1>Hello</h1>
            <p>World</p>
          </div>
        </body>
      </html>
    `;
    const result = validateHTML(html);
    expect(result.isValid).toBe(true);
  });
});

describe('sanitizeHTML', () => {
  it('should remove script tags', () => {
    const html = '<div><script>alert("xss")</script></div>';
    const result = sanitizeHTML(html);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should remove inline event handlers', () => {
    const html = '<button onclick="doSomething()">Click</button>';
    const result = sanitizeHTML(html);
    expect(result).not.toContain('onclick');
  });

  it('should add Tailwind CSS CDN if missing', () => {
    const html = '<html><head></head><body></body></html>';
    const result = sanitizeHTML(html);
    expect(result).toContain('tailwindcss');
  });

  it('should not duplicate Tailwind CSS CDN', () => {
    const html = '<html><head><script src="https://cdn.tailwindcss.com"></script></head><body></body></html>';
    const result = sanitizeHTML(html);
    const matches = result.match(/tailwindcss/g);
    expect(matches?.length).toBe(1);
  });

  it('should preserve normal HTML content', () => {
    const html = '<div class="container"><h1>Hello</h1></div>';
    const result = sanitizeHTML(html);
    expect(result).toContain('container');
    expect(result).toContain('Hello');
  });
});

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on recoverable errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValue('success');
    
    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-recoverable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Unauthorized'));
    
    await expect(withRetry(fn, { maxRetries: 3, baseDelay: 10 }))
      .rejects.toThrow('Unauthorized');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should exhaust retries and throw', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));
    
    await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10 }))
      .rejects.toThrow('network error');
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });
});

describe('getUserFriendlyError', () => {
  it('should convert Error to user-friendly message', () => {
    const error = new Error('rate limit exceeded');
    const result = getUserFriendlyError(error);
    
    expect(result.title).toBe('Rate Limited');
    expect(result.description).toBeTruthy();
    expect(result.canRetry).toBe(true);
  });

  it('should convert string to user-friendly message', () => {
    const result = getUserFriendlyError('Something went wrong');
    
    expect(result.title).toBe('Error');
    expect(result.description).toBe('Something went wrong');
    expect(result.canRetry).toBe(true);
  });

  it('should handle AIDesignerError directly', () => {
    const error = {
      type: 'AI_GENERATION_FAILED' as const,
      message: 'Custom message',
      suggestedAction: 'Try again',
      recoverable: true,
    };
    
    const result = getUserFriendlyError(error);
    
    expect(result.title).toBe('Generation Failed');
    expect(result.description).toBe('Custom message');
    expect(result.action).toBe('Try again');
    expect(result.canRetry).toBe(true);
  });

  it('should provide suggested actions for all error types', () => {
    const errorTypes = [
      'Unauthorized',
      'rate limit',
      'timeout',
      'network error',
      'Failed to fetch',
    ];

    errorTypes.forEach((errorMsg) => {
      const result = getUserFriendlyError(new Error(errorMsg));
      expect(result.action).toBeTruthy();
    });
  });
});



