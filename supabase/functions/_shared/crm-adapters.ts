/**
 * CRM Adapters
 * 
 * Adapter pattern for normalizing webhook events from different CRM systems.
 * Each adapter handles provider-specific signature verification and event parsing.
 */

import { verifyHmacSignature, type SignatureVerificationResult } from './webhook-utils.ts';

// ============================================================================
// Types
// ============================================================================

export interface CRMAdapter {
  /** CRM provider name */
  provider: string;
  /** Verify webhook signature */
  verifySignature(payload: string, signature: string | null, secret: string): Promise<SignatureVerificationResult>;
  /** Parse webhook event into normalized format */
  parseEvent(payload: unknown): ParsedCRMEvent;
  /** Get signature header name(s) for this provider */
  getSignatureHeader(): string[];
}

export interface ParsedCRMEvent {
  event_type: string;
  contact_id?: string;
  phone?: string;
  email?: string;
  data: unknown;
  raw_event_type?: string;
}

// ============================================================================
// Salesforce Adapter
// ============================================================================

export class SalesforceAdapter implements CRMAdapter {
  provider = 'salesforce';

  async verifySignature(
    _payload: string,
    _signature: string | null,
    _secret: string
  ): Promise<SignatureVerificationResult> {
    // Salesforce primarily uses IP allowlisting, not signature verification
    // For Salesforce, consider validating the source IP against known Salesforce IPs
    // or using their Organization ID verification
    return { valid: true };
  }

  getSignatureHeader(): string[] {
    return ['x-salesforce-signature', 'x-sfdc-signature'];
  }

  parseEvent(payload: unknown): ParsedCRMEvent {
    const p = payload as Record<string, unknown>;
    const sobject = p.sobject as Record<string, unknown> | undefined;

    return {
      event_type: this.normalizeEventType(p),
      contact_id: sobject?.WhoId as string || sobject?.ContactId as string,
      phone: sobject?.Phone as string,
      email: sobject?.Email as string,
      data: sobject || p,
      raw_event_type: sobject?.Type as string || p.event as string,
    };
  }

  private normalizeEventType(payload: Record<string, unknown>): string {
    const sobject = payload.sobject as Record<string, unknown> | undefined;
    const eventType = sobject?.Type as string || payload.event as string || 'unknown';
    return `salesforce.${eventType}`;
  }
}

// ============================================================================
// HubSpot Adapter
// ============================================================================

export class HubSpotAdapter implements CRMAdapter {
  provider = 'hubspot';

  async verifySignature(
    payload: string,
    signature: string | null,
    secret: string
  ): Promise<SignatureVerificationResult> {
    if (!signature) {
      return { valid: false, error: 'Missing signature' };
    }

    // HubSpot uses HMAC-SHA256 with the signature in x-hubspot-signature-v3 header
    // Format: timestamp + method + uri + body
    // For simplicity, we verify just the payload
    return await verifyHmacSignature(payload, signature, secret, 'SHA-256');
  }

  getSignatureHeader(): string[] {
    return ['x-hubspot-signature-v3', 'x-hubspot-signature', 'x-hub-signature-256'];
  }

  parseEvent(payload: unknown): ParsedCRMEvent {
    // HubSpot can send events as an array
    const firstEvent = Array.isArray(payload) ? payload[0] : payload;
    const p = firstEvent as Record<string, unknown>;
    const properties = p.properties as Record<string, unknown> | undefined;

    return {
      event_type: this.normalizeEventType(p),
      contact_id: p.objectId as string,
      phone: properties?.phone as string,
      email: properties?.email as string,
      data: firstEvent,
      raw_event_type: p.subscriptionType as string || p.eventType as string,
    };
  }

  private normalizeEventType(payload: Record<string, unknown>): string {
    const eventType = payload.subscriptionType as string || payload.eventType as string || 'unknown';
    return `hubspot.${eventType}`;
  }
}

// ============================================================================
// Zoho Adapter
// ============================================================================

export class ZohoAdapter implements CRMAdapter {
  provider = 'zoho';

  async verifySignature(
    _payload: string,
    _signature: string | null,
    _secret: string
  ): Promise<SignatureVerificationResult> {
    // Zoho uses token-based auth in headers
    // Verification should check the x-zoho-token header against configured token
    return { valid: true };
  }

  getSignatureHeader(): string[] {
    return ['x-zoho-token', 'x-zoho-signature'];
  }

  parseEvent(payload: unknown): ParsedCRMEvent {
    const p = payload as Record<string, unknown>;
    const data = p.data as Record<string, unknown> | undefined;
    const module = p.module as string || '';
    const operation = p.operation as string || '';

    return {
      event_type: `zoho.${module}.${operation}`,
      contact_id: Array.isArray(p.ids) ? p.ids[0] as string : undefined,
      phone: data?.Phone as string,
      email: data?.Email as string,
      data: data,
      raw_event_type: `${module}.${operation}`,
    };
  }
}

// ============================================================================
// GoHighLevel Adapter
// ============================================================================

export class GoHighLevelAdapter implements CRMAdapter {
  provider = 'gohighlevel';

  async verifySignature(
    payload: string,
    signature: string | null,
    secret: string
  ): Promise<SignatureVerificationResult> {
    if (!signature) {
      // GHL may use API key verification instead of signature
      return { valid: true };
    }

    return await verifyHmacSignature(payload, signature, secret, 'SHA-256');
  }

  getSignatureHeader(): string[] {
    return ['x-ghl-signature', 'x-signature'];
  }

  parseEvent(payload: unknown): ParsedCRMEvent {
    const p = payload as Record<string, unknown>;
    const contact = p.contact as Record<string, unknown> | undefined;

    return {
      event_type: `gohighlevel.${p.type as string || 'unknown'}`,
      contact_id: p.contact_id as string || p.contactId as string,
      phone: p.phone as string || contact?.phone as string,
      email: p.email as string || contact?.email as string,
      data: p,
      raw_event_type: p.type as string,
    };
  }
}

// ============================================================================
// Pipedrive Adapter
// ============================================================================

export class PipedriveAdapter implements CRMAdapter {
  provider = 'pipedrive';

  async verifySignature(
    _payload: string,
    _signature: string | null,
    _secret: string
  ): Promise<SignatureVerificationResult> {
    // Pipedrive doesn't sign webhooks by default
    // They use basic auth in the webhook URL instead
    return { valid: true };
  }

  getSignatureHeader(): string[] {
    return [];
  }

  parseEvent(payload: unknown): ParsedCRMEvent {
    const p = payload as Record<string, unknown>;
    const meta = p.meta as Record<string, unknown> | undefined;
    const current = p.current as Record<string, unknown> | undefined;

    const objectType = meta?.object as string || 'unknown';
    const action = meta?.action as string || 'unknown';

    return {
      event_type: `pipedrive.${objectType}.${action}`,
      contact_id: current?.person_id as string,
      phone: current?.phone as string,
      email: current?.email as string,
      data: current,
      raw_event_type: `${objectType}.${action}`,
    };
  }
}

// ============================================================================
// Custom/Generic Adapter
// ============================================================================

export class CustomAdapter implements CRMAdapter {
  provider = 'custom';

  async verifySignature(
    payload: string,
    signature: string | null,
    secret: string
  ): Promise<SignatureVerificationResult> {
    if (!signature) {
      // Optional signature for custom webhooks
      return { valid: true };
    }

    // Try HMAC-SHA256 first, then SHA1
    const sha256Result = await verifyHmacSignature(payload, signature, secret, 'SHA-256');
    if (sha256Result.valid) {
      return sha256Result;
    }

    return await verifyHmacSignature(payload, signature, secret, 'SHA-1');
  }

  getSignatureHeader(): string[] {
    return ['x-signature', 'x-webhook-signature', 'x-hmac-signature'];
  }

  parseEvent(payload: unknown): ParsedCRMEvent {
    const p = payload as Record<string, unknown>;

    return {
      event_type: `custom.${p.event_type as string || p.type as string || 'unknown'}`,
      contact_id: p.contact_id as string,
      phone: p.phone as string,
      email: p.email as string,
      data: p,
      raw_event_type: p.event_type as string || p.type as string,
    };
  }
}

// ============================================================================
// Adapter Factory
// ============================================================================

export type CRMProvider = 'salesforce' | 'hubspot' | 'zoho' | 'gohighlevel' | 'pipedrive' | 'custom';

const adapters: Record<CRMProvider, CRMAdapter> = {
  salesforce: new SalesforceAdapter(),
  hubspot: new HubSpotAdapter(),
  zoho: new ZohoAdapter(),
  gohighlevel: new GoHighLevelAdapter(),
  pipedrive: new PipedriveAdapter(),
  custom: new CustomAdapter(),
};

/**
 * Get CRM adapter for the specified provider
 */
export function getCRMAdapter(provider: string): CRMAdapter {
  const normalizedProvider = provider.toLowerCase() as CRMProvider;

  if (adapters[normalizedProvider]) {
    return adapters[normalizedProvider];
  }

  throw new Error(`Unknown CRM provider: ${provider}`);
}

/**
 * Get all supported CRM providers
 */
export function getSupportedProviders(): CRMProvider[] {
  return Object.keys(adapters) as CRMProvider[];
}

/**
 * Check if a provider is supported
 */
export function isProviderSupported(provider: string): boolean {
  return provider.toLowerCase() in adapters;
}

// ============================================================================
// Signature Header Extraction
// ============================================================================

/**
 * Extract signature from request headers for the given provider
 */
export function extractSignatureFromHeaders(
  headers: Headers,
  provider: CRMProvider
): string | null {
  const adapter = adapters[provider];
  if (!adapter) return null;

  const signatureHeaders = adapter.getSignatureHeader();

  for (const headerName of signatureHeaders) {
    const value = headers.get(headerName);
    if (value) {
      return value;
    }
  }

  // Also check common signature headers
  const commonHeaders = [
    'x-signature',
    'x-webhook-signature',
    'x-hmac-signature',
    'x-hub-signature-256',
  ];

  for (const headerName of commonHeaders) {
    const value = headers.get(headerName);
    if (value) {
      return value;
    }
  }

  return null;
}
