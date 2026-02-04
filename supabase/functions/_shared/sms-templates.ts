/**
 * SMS Templates - Resolution & Rendering
 * 
 * Centralized template management for SMS messages.
 * Provides hierarchical template resolution and variable rendering.
 * 
 * Template Resolution Hierarchy:
 * 1. Condition-level (campaign_conditions.sms_template)
 * 2. Client-level (message_templates where is_default=true)
 * 3. System default
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// Types
// ============================================================================

export type TemplateType = 
  | 'gift_card_delivery'
  | 'opt_in_request'
  | 'opt_in_confirmation'
  | 'marketing';

export interface TemplateResolutionParams {
  templateType: TemplateType;
  campaignId?: string;
  conditionId?: string;
  clientId: string;
  customMessage?: string; // Direct override (highest priority)
}

export interface TemplateResolutionResult {
  template: string;
  source: 'custom' | 'condition' | 'client' | 'system';
}

export interface TemplateVariables {
  // Recipient identity
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  recipient_company?: string;
  
  // Address
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Gift card
  value?: number;
  brand?: string;
  code?: string;
  link?: string;
  
  // Client/business
  client_name?: string;
  company?: string; // Alias for client_name (backward compat)
  
  // Custom fields from recipient
  custom?: Record<string, unknown>;
}

// ============================================================================
// System Default Templates
// ============================================================================

export const SYSTEM_DEFAULT_TEMPLATES: Record<TemplateType, string> = {
  gift_card_delivery:
    "Hi {first_name}! Your ${value} {brand} gift card is ready. Code: {code}. Thanks for choosing {client_name}!",
  
  opt_in_request:
    "This is {client_name}. Reply YES to receive your gift card and marketing messages for 30 days. Reply STOP to opt out.",
  
  opt_in_confirmation:
    "Thank you for opting in! You'll receive your gift card shortly. Reply STOP at any time to unsubscribe.",
  
  marketing:
    "{message}",
};

// ============================================================================
// Template Resolution
// ============================================================================

/**
 * Resolve SMS template using hierarchy:
 * 1. customMessage (direct override) - highest priority
 * 2. Condition-level template (from campaign_conditions)
 * 3. Client default template (from message_templates)
 * 4. System default template - lowest priority
 * 
 * @param supabase - Supabase client
 * @param params - Resolution parameters
 * @returns Template string and source indicator
 */
export async function resolveTemplate(
  supabase: SupabaseClient,
  params: TemplateResolutionParams
): Promise<TemplateResolutionResult> {
  const { templateType, campaignId, conditionId, clientId, customMessage } = params;

  // 1. Direct custom message override
  if (customMessage?.trim()) {
    console.log(`[SMS-TEMPLATES] Using custom message for ${templateType}`);
    return { template: customMessage, source: 'custom' };
  }

  // 2. Condition-level template (for gift card delivery)
  if (conditionId && templateType === 'gift_card_delivery') {
    const { data: condition, error } = await supabase
      .from('campaign_conditions')
      .select('sms_template')
      .eq('id', conditionId)
      .single();

    if (!error && condition?.sms_template?.trim()) {
      console.log(`[SMS-TEMPLATES] Using condition-level template for ${templateType}`);
      return { template: condition.sms_template, source: 'condition' };
    }
  }

  // 3. Campaign-level opt-in message (for opt_in_request)
  if (campaignId && templateType === 'opt_in_request') {
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('sms_opt_in_message')
      .eq('id', campaignId)
      .single();

    if (!error && campaign?.sms_opt_in_message?.trim()) {
      console.log(`[SMS-TEMPLATES] Using campaign opt-in message`);
      return { template: campaign.sms_opt_in_message, source: 'condition' };
    }
  }

  // 4. Client default template
  if (clientId) {
    const templateName = templateType === 'gift_card_delivery' ? 'gift_card_delivery' :
                        templateType === 'opt_in_request' ? 'opt_in_request' :
                        templateType === 'opt_in_confirmation' ? 'opt_in_confirmation' :
                        'default';

    const { data: clientTemplate, error } = await supabase
      .from('message_templates')
      .select('body_template')
      .eq('client_id', clientId)
      .eq('template_type', 'sms')
      .eq('name', templateName)
      .eq('is_default', true)
      .single();

    if (!error && clientTemplate?.body_template?.trim()) {
      console.log(`[SMS-TEMPLATES] Using client default template for ${templateType}`);
      return { template: clientTemplate.body_template, source: 'client' };
    }
  }

  // 5. System default
  console.log(`[SMS-TEMPLATES] Using system default template for ${templateType}`);
  return { 
    template: SYSTEM_DEFAULT_TEMPLATES[templateType], 
    source: 'system' 
  };
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Render template variables into a message string
 * Supports all recipient fields, gift card data, client info, and custom fields
 * 
 * @param template - Template string with {variable} placeholders
 * @param variables - Variable values to substitute
 * @returns Rendered message string
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;
  
  // Standard variable replacements (case-insensitive)
  const replacements: [RegExp, string][] = [
    // Recipient identity
    [/\{first_name\}/gi, variables.first_name || ''],
    [/\{last_name\}/gi, variables.last_name || ''],
    [/\{email\}/gi, variables.email || ''],
    [/\{phone\}/gi, variables.phone || ''],
    [/\{recipient_company\}/gi, variables.recipient_company || ''],
    
    // Address fields
    [/\{address1\}/gi, variables.address1 || ''],
    [/\{address2\}/gi, variables.address2 || ''],
    [/\{city\}/gi, variables.city || ''],
    [/\{state\}/gi, variables.state || ''],
    [/\{zip\}/gi, variables.zip || ''],
    
    // Gift card
    [/\{value\}/gi, variables.value?.toString() || ''],
    [/\$\{value\}/gi, `$${variables.value || ''}`],
    [/\{brand\}/gi, variables.brand || ''],
    [/\{provider\}/gi, variables.brand || ''], // Alias
    [/\{code\}/gi, variables.code || ''],
    [/\{link\}/gi, variables.link || variables.code || ''],
    
    // Client/business
    [/\{client_name\}/gi, variables.client_name || ''],
    [/\{company\}/gi, variables.company || variables.client_name || ''], // Backward compat
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  
  // Handle custom fields: {custom.field_name} → value
  if (variables.custom && typeof variables.custom === 'object') {
    result = result.replace(/\{custom\.([^}]+)\}/gi, (_match, fieldName) => {
      const value = variables.custom?.[fieldName];
      if (value === null || value === undefined) return '';
      return String(value);
    });
  }

  // Clean up unreplaced placeholders and extra whitespace
  result = result.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();

  return result;
}

/**
 * Render merge tags in marketing messages ({{variable}} format)
 * 
 * @param template - Template with {{variable}} placeholders
 * @param mergeData - Key-value pairs to substitute
 * @returns Rendered message
 */
export function renderMergeTags(
  template: string,
  mergeData: Record<string, unknown>
): string {
  let result = template;
  
  Object.entries(mergeData).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, String(value ?? ''));
  });
  
  // Remove unreplaced tags
  result = result.replace(/{{[^}]+}}/g, '');
  
  return result.trim();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetch recipient data for template rendering
 */
export async function fetchRecipientForTemplate(
  supabase: SupabaseClient,
  recipientId: string
): Promise<{ 
  recipient: Partial<TemplateVariables> | null; 
  clientId: string | undefined 
}> {
  const { data, error } = await supabase
    .from('recipients')
    .select(`
      first_name,
      last_name,
      email,
      phone,
      company,
      address1,
      address2,
      city,
      state,
      zip,
      custom_fields,
      campaign:campaigns(client_id)
    `)
    .eq('id', recipientId)
    .single();

  if (error) {
    console.error('[SMS-TEMPLATES] Failed to fetch recipient:', error);
    return { recipient: null, clientId: undefined };
  }

  return {
    recipient: {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      recipient_company: data.company,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zip: data.zip,
      custom: data.custom_fields as Record<string, unknown>,
    },
    clientId: (data.campaign as any)?.client_id || undefined,
  };
}

/**
 * Fetch client name for template rendering
 */
export async function fetchClientName(
  supabase: SupabaseClient,
  clientId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('clients')
    .select('name')
    .eq('id', clientId)
    .single();

  if (error || !data) {
    return '';
  }

  return data.name;
}

/**
 * Resolve the configured link URL using hierarchy:
 * 1. Condition-level override (campaign_conditions.sms_link_url)
 * 2. Client default (message_templates.sms_delivery_link_url)
 * 3. null (fall back to using gift card code directly)
 * 
 * @param supabase - Supabase client
 * @param params - Resolution parameters
 * @returns Configured link URL template or null
 */
export async function resolveLinkUrl(
  supabase: SupabaseClient,
  params: { conditionId?: string; clientId: string }
): Promise<string | null> {
  const { conditionId, clientId } = params;

  // 1. Check condition-level override
  if (conditionId) {
    const { data: condition, error } = await supabase
      .from('campaign_conditions')
      .select('sms_link_url')
      .eq('id', conditionId)
      .single();

    if (!error && condition?.sms_link_url?.trim()) {
      console.log(`[SMS-TEMPLATES] Using condition-level link URL`);
      return condition.sms_link_url;
    }
  }

  // 2. Check client default
  if (clientId) {
    const { data: template, error } = await supabase
      .from('message_templates')
      .select('sms_delivery_link_url')
      .eq('client_id', clientId)
      .eq('template_type', 'sms')
      .eq('name', 'gift_card_delivery')
      .eq('is_default', true)
      .single();

    if (!error && template?.sms_delivery_link_url?.trim()) {
      console.log(`[SMS-TEMPLATES] Using client default link URL`);
      return template.sms_delivery_link_url;
    }
  }

  // 3. No configured link URL - will fall back to code
  return null;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  resolveTemplate,
  renderTemplate,
  renderMergeTags,
  fetchRecipientForTemplate,
  fetchClientName,
  resolveLinkUrl,
  SYSTEM_DEFAULT_TEMPLATES,
};
