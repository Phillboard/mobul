/**
 * Webhook Utilities
 * 
 * Shared utilities for webhook signature verification, payload parsing,
 * and consistent webhook response formatting.
 */

// ============================================================================
// Types
// ============================================================================

export interface WebhookPayload {
  raw: string;
  parsed: unknown;
  contentType: string;
  params: URLSearchParams;
}

export interface WebhookResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  event_id?: string;
}

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Verify Stripe webhook signature using the stripe-signature header
 */
export async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<SignatureVerificationResult> {
  try {
    // Parse the signature header
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts['t'];
    const v1Signature = parts['v1'];

    if (!timestamp || !v1Signature) {
      return { valid: false, error: 'Invalid signature format' };
    }

    // Check timestamp tolerance (5 minutes)
    const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (timestampAge > 300) {
      return { valid: false, error: 'Signature timestamp expired' };
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = await computeHmacSha256(signedPayload, secret);

    if (expectedSignature === v1Signature) {
      return { valid: true };
    }

    return { valid: false, error: 'Signature mismatch' };
  } catch (error) {
    return { valid: false, error: `Verification failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Verify generic HMAC signature
 */
export async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'SHA-256' | 'SHA-1' = 'SHA-256',
  encoding: 'hex' | 'base64' = 'hex'
): Promise<SignatureVerificationResult> {
  try {
    const expectedSignature = algorithm === 'SHA-256'
      ? await computeHmacSha256(payload, secret, encoding)
      : await computeHmacSha1(payload, secret, encoding);

    // Handle signature prefixes (e.g., "sha256=..." or "sha1=...")
    const cleanSignature = signature.replace(/^sha(1|256)=/, '');

    if (expectedSignature === cleanSignature) {
      return { valid: true };
    }

    return { valid: false, error: 'Signature mismatch' };
  } catch (error) {
    return { valid: false, error: `Verification failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Compute HMAC-SHA256 signature
 */
export async function computeHmacSha256(
  payload: string,
  secret: string,
  encoding: 'hex' | 'base64' = 'hex'
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const bytes = new Uint8Array(signature);

  if (encoding === 'base64') {
    return btoa(String.fromCharCode(...bytes));
  }

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute HMAC-SHA1 signature
 */
export async function computeHmacSha1(
  payload: string,
  secret: string,
  encoding: 'hex' | 'base64' = 'hex'
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const bytes = new Uint8Array(signature);

  if (encoding === 'base64') {
    return btoa(String.fromCharCode(...bytes));
  }

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// Payload Parsing
// ============================================================================

/**
 * Parse webhook payload from request
 * Handles JSON, form-urlencoded, and query parameters
 */
export async function parseWebhookPayload(req: Request): Promise<WebhookPayload> {
  const url = new URL(req.url);
  const contentType = req.headers.get('content-type') || '';
  const params = url.searchParams;

  // Clone request to read body multiple times if needed
  const clonedReq = req.clone();
  const raw = await clonedReq.text();

  let parsed: unknown = null;

  // Try JSON first
  if (contentType.includes('application/json')) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Not valid JSON
    }
  }
  // Form URL-encoded
  else if (contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const formParams = new URLSearchParams(raw);
      parsed = Object.fromEntries(formParams.entries());
    } catch {
      // Not valid form data
    }
  }
  // Try to auto-detect
  else if (raw) {
    // Try JSON
    if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Not JSON
      }
    }

    // Try URL-encoded
    if (!parsed) {
      try {
        const formParams = new URLSearchParams(raw);
        // Check if it looks like valid URL-encoded data
        if (formParams.toString().length > 0) {
          parsed = Object.fromEntries(formParams.entries());
        }
      } catch {
        // Not URL-encoded
      }
    }
  }

  // If no body, check query params
  if (!parsed && params.toString().length > 0) {
    parsed = Object.fromEntries(params.entries());
  }

  return {
    raw,
    parsed,
    contentType,
    params,
  };
}

/**
 * Extract specific fields from payload with fallback keys
 */
export function extractWebhookField<T = string>(
  payload: Record<string, unknown>,
  keys: string[],
  defaultValue: T | null = null
): T | null {
  for (const key of keys) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      return payload[key] as T;
    }
  }
  return defaultValue;
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create standardized webhook success response
 */
export function createWebhookResponse<T>(
  data: T,
  options: {
    statusCode?: number;
    headers?: Record<string, string>;
    eventId?: string;
  } = {}
): Response {
  const { statusCode = 200, headers = {}, eventId } = options;

  const response: WebhookResponse<T> = {
    success: true,
    data,
  };

  if (eventId) {
    response.event_id = eventId;
  }

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create standardized webhook error response
 */
export function createWebhookErrorResponse(
  error: string,
  statusCode: number = 400,
  headers: Record<string, string> = {}
): Response {
  const response: WebhookResponse = {
    success: false,
    error,
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

// ============================================================================
// Phone Number Utilities
// ============================================================================

/**
 * Normalize phone number for database lookup
 * Returns last 10 digits
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return normalized.length === 10;
}

// ============================================================================
// Webhook Event Types
// ============================================================================

export const WEBHOOK_EVENT_TYPES = {
  // CRM Events
  CRM_CONTACT_CREATED: 'crm.contact.created',
  CRM_CONTACT_UPDATED: 'crm.contact.updated',
  CRM_DEAL_WON: 'crm.deal.won',
  CRM_DEAL_LOST: 'crm.deal.lost',

  // Payment Events
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // SMS Events
  SMS_RECEIVED: 'sms.received',
  SMS_OPT_IN: 'sms.opt_in',
  SMS_OPT_OUT: 'sms.opt_out',

  // Zapier Events
  ZAPIER_ACTION: 'zapier.action',
} as const;

export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[keyof typeof WEBHOOK_EVENT_TYPES];

// ============================================================================
// Opt-In/Opt-Out Keywords
// ============================================================================

export const OPT_IN_KEYWORDS = [
  'YES', 'Y', 'YEA', 'YEAH', 'YEP', 'YUP', 'OK', 'OKAY', 'SURE', 'ACCEPT'
];

export const OPT_OUT_KEYWORDS = [
  'STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'NO', 'OPTOUT', 'OPT OUT', 'STOP ALL'
];

/**
 * Determine SMS response status based on message content
 */
export function determineSmsResponseStatus(
  message: string
): 'opted_in' | 'opted_out' | 'invalid_response' {
  const upperMessage = message.toUpperCase().trim();

  if (OPT_IN_KEYWORDS.includes(upperMessage)) {
    return 'opted_in';
  }

  if (OPT_OUT_KEYWORDS.includes(upperMessage)) {
    return 'opted_out';
  }

  return 'invalid_response';
}

/**
 * Get reply message based on opt-in status
 */
export function getOptInReplyMessage(status: 'opted_in' | 'opted_out' | 'invalid_response'): string {
  switch (status) {
    case 'opted_in':
      return "Thanks! You're all set to receive your gift card.";
    case 'opted_out':
      return "You have been unsubscribed. No further messages will be sent.";
    case 'invalid_response':
      return "We didn't understand your response. Please reply YES to opt in or STOP to opt out.";
  }
}
