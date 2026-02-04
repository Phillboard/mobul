/**
 * Typed Edge Function Endpoints Registry
 * 
 * Provides type safety and documentation for all 92 edge function API calls.
 * Use these constants instead of hardcoded strings throughout the codebase.
 * 
 * Organized by domain:
 * - giftCards: Gift card provisioning, validation, redemption
 * - campaigns: Campaign management and conditions
 * - callCenter: Call center operations and code approval
 * - messaging: SMS and email delivery
 * - telephony: Twilio integration
 * - imports: Data import operations
 * - exports: Data export operations
 * - marketing: Marketing automation
 * - ai: AI generation and chat
 * - forms: Form submissions
 * - webhooks: External webhook handlers
 * - admin: Administrative functions
 * - wallet: Mobile wallet passes
 */

import { callEdgeFunction, RequestConfig } from './client';

// ============================================================================
// Endpoints Registry
// ============================================================================

/**
 * Complete registry of all edge function endpoints.
 * Use these constants instead of hardcoded function name strings.
 * 
 * @example
 * ```typescript
 * import { Endpoints } from '@core/api/endpoints';
 * 
 * // Instead of: supabase.functions.invoke('provision-gift-card-unified', ...)
 * // Use: callEdgeFunction(Endpoints.giftCards.provision, ...)
 * ```
 */
export const Endpoints = {
  // ===========================================================================
  // Gift Card Operations (17 functions)
  // ===========================================================================
  giftCards: {
    /** Unified gift card provisioning (inventory + Tillo) */
    provision: 'provision-gift-card-unified' as const,
    /** Redirect: Call center provisioning → unified */
    provisionForCallCenter: 'provision-gift-card-for-call-center' as const,
    /** Redirect: API provisioning → unified */
    provisionFromApi: 'provision-gift-card-from-api' as const,
    /** Check Tillo card balance */
    checkBalance: 'check-gift-card-balance' as const,
    /** Check uploaded inventory card balance */
    checkInventoryBalance: 'check-inventory-card-balance' as const,
    /** Validate gift card codes */
    validateCode: 'validate-gift-card-code' as const,
    /** Validate campaign gift card configuration */
    validateConfig: 'validate-gift-card-configuration' as const,
    /** Validate redemption codes (rate-limited) */
    validateRedemption: 'validate-redemption-code' as const,
    /** Redeem customer codes */
    redeemCustomerCode: 'redeem-customer-code' as const,
    /** Embedded redemption widget */
    redeemEmbed: 'redeem-gift-card-embed' as const,
    /** Revoke/cancel gift cards */
    revoke: 'revoke-gift-card' as const,
    /** Transfer cards between pools */
    transfer: 'transfer-admin-cards' as const,
    /** Purchase cards from Tillo */
    purchase: 'purchase-gift-cards' as const,
    /** Import cards to inventory pool */
    import: 'import-gift-cards' as const,
    /** Export pool card data */
    exportPool: 'export-pool-cards' as const,
    /** Cleanup stuck provisioning states */
    cleanup: 'cleanup-stuck-gift-cards' as const,
    /** System health monitoring */
    monitor: 'monitor-gift-card-system' as const,
    /** Lookup Tillo brand details */
    lookupBrand: 'lookup-tillo-brand' as const,
  },

  // ===========================================================================
  // Campaign Operations (11 functions)
  // ===========================================================================
  campaigns: {
    /** Evaluate conditions and trigger rewards */
    evaluateConditions: 'evaluate-conditions' as const,
    /** Mark condition as complete */
    completeCondition: 'complete-condition' as const,
    /** Validate campaign budget */
    validateBudget: 'validate-campaign-budget' as const,
    /** Calculate credit requirements */
    calculateCredit: 'calculate-credit-requirements' as const,
    /** Preview audience segment */
    previewAudience: 'preview-campaign-audience' as const,
    /** Save campaign drafts */
    saveDraft: 'save-campaign-draft' as const,
    /** Diagnose campaign configuration issues */
    diagnoseConfig: 'diagnose-campaign-config' as const,
    /** Track mail delivery events (webhook) */
    trackMailDelivery: 'track-mail-delivery' as const,
    /** Create secure preview links */
    createPreviewLink: 'create-preview-link' as const,
    /** Generate tracking tokens */
    generateTokens: 'generate-recipient-tokens' as const,
    /** Submit to print vendor */
    submitToVendor: 'submit-to-vendor' as const,
  },

  // ===========================================================================
  // Call Center Operations (7 functions)
  // ===========================================================================
  callCenter: {
    /** Approve redemption codes */
    approveCode: 'approve-customer-code' as const,
    /** Bulk code approval */
    bulkApprove: 'bulk-approve-codes' as const,
    /** Handle Twilio incoming calls */
    handleIncomingCall: 'handle-incoming-call' as const,
    /** Update call status (webhook) */
    updateCallStatus: 'update-call-status' as const,
    /** Complete call disposition */
    completeDisposition: 'complete-call-disposition' as const,
    /** Twilio call webhook handler */
    handleCallWebhook: 'handle-call-webhook' as const,
    /** Assign tracked phone numbers */
    assignTrackedNumbers: 'assign-tracked-numbers' as const,
  },

  // ===========================================================================
  // Messaging Operations (13 functions)
  // ===========================================================================
  messaging: {
    /** Send gift card via SMS */
    sendGiftCardSms: 'send-gift-card-sms' as const,
    /** Send opt-in requests */
    sendOptIn: 'send-sms-opt-in' as const,
    /** Send marketing SMS */
    sendMarketingSms: 'send-marketing-sms' as const,
    /** Retry failed SMS sends */
    retrySms: 'retry-failed-sms' as const,
    /** Handle SMS responses (STOP, YES) */
    handleSmsResponse: 'handle-sms-response' as const,
    /** Test SMS configuration */
    testSmsProvider: 'test-sms-provider' as const,
    /** Send gift card via email */
    sendGiftCardEmail: 'send-gift-card-email' as const,
    /** Generic email sending */
    sendEmail: 'send-email' as const,
    /** Send marketing emails */
    sendMarketingEmail: 'send-marketing-email' as const,
    /** Send verification emails */
    sendVerificationEmail: 'send-verification-email' as const,
    /** Send approval notifications */
    sendApprovalNotification: 'send-approval-notification' as const,
    /** Send comment notifications */
    sendCommentNotification: 'send-comment-notification' as const,
    /** Send user invitations */
    sendUserInvitation: 'send-user-invitation' as const,
  },

  // ===========================================================================
  // Telephony / Twilio Operations (11 functions)
  // ===========================================================================
  telephony: {
    /** Configure Twilio webhooks */
    configureWebhooks: 'configure-twilio-webhooks' as const,
    /** Update Twilio configuration */
    updateConfig: 'update-twilio-config' as const,
    /** Get Twilio account status */
    getStatus: 'get-twilio-status' as const,
    /** Fetch available phone numbers */
    fetchNumbers: 'fetch-twilio-numbers' as const,
    /** Provision phone number */
    provisionNumber: 'provision-twilio-number' as const,
    /** Release phone number */
    releaseNumber: 'release-twilio-number' as const,
    /** Test Twilio connection */
    testConnection: 'test-twilio-connection' as const,
    /** Disable Twilio configuration */
    disableConfig: 'disable-twilio-config' as const,
    /** Remove Twilio configuration */
    removeConfig: 'remove-twilio-config' as const,
    /** Revalidate Twilio credentials */
    revalidate: 'revalidate-twilio' as const,
    /** Admin health report */
    adminHealthReport: 'admin-twilio-health-report' as const,
  },

  // ===========================================================================
  // Data Import Operations (5 functions)
  // ===========================================================================
  imports: {
    /** Import audiences from CSV */
    audience: 'import-audience' as const,
    /** Import contacts from CSV */
    contacts: 'import-contacts' as const,
    /** Import campaign codes */
    campaignCodes: 'import-campaign-codes' as const,
    /** Import customer codes */
    customerCodes: 'import-customer-codes' as const,
    // Note: import-gift-cards is in giftCards.import
  },

  // ===========================================================================
  // Data Export Operations (3 functions)
  // ===========================================================================
  exports: {
    /** Export audience data */
    audience: 'export-audience' as const,
    /** Export full database (admin) */
    database: 'export-database' as const,
    // Note: export-pool-cards is in giftCards.exportPool
  },

  // ===========================================================================
  // Marketing Automation (3 functions)
  // ===========================================================================
  marketing: {
    /** Execute marketing campaigns */
    sendCampaign: 'send-marketing-campaign' as const,
    /** Process automation workflows */
    processAutomation: 'process-marketing-automation' as const,
    /** Trigger automation events */
    triggerAutomation: 'trigger-marketing-automation' as const,
  },

  // ===========================================================================
  // AI Operations (7 functions)
  // ===========================================================================
  ai: {
    /** Generate landing pages (full featured) */
    generateLandingPage: 'ai-landing-page-generate' as const,
    /** AI chat for landing pages */
    landingPageChat: 'ai-landing-page-chat' as const,
    /** Generate landing pages (simple) */
    generateLandingPageSimple: 'generate-landing-page-ai' as const,
    /** Generate forms with AI */
    generateForm: 'generate-form-ai' as const,
    /** Design assistant chat */
    designChat: 'ai-design-chat' as const,
    /** General OpenAI chat */
    openaiChat: 'openai-chat' as const,
    /** Dr. Phillip AI assistant */
    drPhillipChat: 'dr-phillip-chat' as const,
  },

  // ===========================================================================
  // Form Operations (3 functions)
  // ===========================================================================
  forms: {
    /** Submit ACE forms */
    submit: 'submit-form' as const,
    /** Submit lead capture forms */
    submitLead: 'submit-lead-form' as const,
    /** Handle personalized URLs */
    handlePurl: 'handle-purl' as const,
  },

  // ===========================================================================
  // Webhook Operations (6 functions)
  // ===========================================================================
  webhooks: {
    /** Trigger client webhooks */
    trigger: 'trigger-webhook' as const,
    /** Dispatch events to Zapier */
    dispatchZapier: 'dispatch-zapier-event' as const,
    /** Receive CRM webhooks */
    crmReceiver: 'crm-webhook-receiver' as const,
    /** EZTexting SMS webhook */
    eztextingReceiver: 'eztexting-webhook' as const,
    /** Stripe payment webhook */
    stripeReceiver: 'stripe-webhook' as const,
    /** Zapier webhook receiver */
    zapierReceiver: 'zapier-incoming-webhook' as const,
  },

  // ===========================================================================
  // Admin & System Operations (5 functions)
  // ===========================================================================
  admin: {
    /** Accept user invitations */
    acceptInvitation: 'accept-invitation' as const,
    /** Generate API keys */
    generateApiKey: 'generate-api-key' as const,
    /** Diagnose provisioning issues */
    diagnoseProvisioning: 'diagnose-provisioning-setup' as const,
    /** Validate environment configuration */
    validateEnvironment: 'validate-environment' as const,
    /** Allocate credits */
    allocateCredit: 'allocate-credit' as const,
  },

  // ===========================================================================
  // Wallet Pass Operations (2 functions)
  // ===========================================================================
  wallet: {
    /** Generate Apple Wallet pass */
    applePass: 'generate-apple-wallet-pass' as const,
    /** Generate Google Wallet pass */
    googlePass: 'generate-google-wallet-pass' as const,
  },
} as const;

// ============================================================================
// Type Helpers
// ============================================================================

/** All endpoint categories */
export type EndpointCategory = keyof typeof Endpoints;

/** All endpoint names as a union type */
export type EndpointName = 
  | typeof Endpoints.giftCards[keyof typeof Endpoints.giftCards]
  | typeof Endpoints.campaigns[keyof typeof Endpoints.campaigns]
  | typeof Endpoints.callCenter[keyof typeof Endpoints.callCenter]
  | typeof Endpoints.messaging[keyof typeof Endpoints.messaging]
  | typeof Endpoints.telephony[keyof typeof Endpoints.telephony]
  | typeof Endpoints.imports[keyof typeof Endpoints.imports]
  | typeof Endpoints.exports[keyof typeof Endpoints.exports]
  | typeof Endpoints.marketing[keyof typeof Endpoints.marketing]
  | typeof Endpoints.ai[keyof typeof Endpoints.ai]
  | typeof Endpoints.forms[keyof typeof Endpoints.forms]
  | typeof Endpoints.webhooks[keyof typeof Endpoints.webhooks]
  | typeof Endpoints.admin[keyof typeof Endpoints.admin]
  | typeof Endpoints.wallet[keyof typeof Endpoints.wallet];

/** Type for a specific endpoint category */
export type EndpointsOf<T extends EndpointCategory> = typeof Endpoints[T][keyof typeof Endpoints[T]];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type-safe endpoint caller factory.
 * Creates a typed wrapper around an endpoint.
 * 
 * @example
 * ```typescript
 * const provisionCard = createTypedEndpoint<ProvisionRequest, ProvisionResponse>(
 *   Endpoints.giftCards.provision
 * );
 * 
 * const result = await provisionCard.call({ recipientId: '123' });
 * ```
 */
export function createTypedEndpoint<TRequest, TResponse>(
  endpoint: EndpointName,
  defaultConfig?: RequestConfig
) {
  return {
    endpoint,
    call: (request: TRequest, config?: RequestConfig) =>
      callEdgeFunction<TResponse, TRequest>(endpoint, request, { ...defaultConfig, ...config }),
  };
}

/**
 * Get all endpoint names (useful for debugging/monitoring).
 * Returns a flat array of all 92 endpoint names.
 */
export function getAllEndpoints(): EndpointName[] {
  const endpoints: EndpointName[] = [];

  Object.values(Endpoints).forEach(category => {
    Object.values(category).forEach(endpoint => {
      endpoints.push(endpoint as EndpointName);
    });
  });

  return endpoints;
}

/**
 * Get endpoints by category.
 * 
 * @example
 * ```typescript
 * const giftCardEndpoints = getEndpointsByCategory('giftCards');
 * // ['provision-gift-card-unified', 'check-gift-card-balance', ...]
 * ```
 */
export function getEndpointsByCategory<T extends EndpointCategory>(
  category: T
): EndpointsOf<T>[] {
  return Object.values(Endpoints[category]) as EndpointsOf<T>[];
}

/**
 * Check if a string is a valid endpoint name.
 */
export function isValidEndpoint(name: string): name is EndpointName {
  return getAllEndpoints().includes(name as EndpointName);
}

/**
 * Find which category an endpoint belongs to.
 * Returns undefined if not found.
 */
export function getEndpointCategory(name: string): EndpointCategory | undefined {
  for (const [category, endpoints] of Object.entries(Endpoints)) {
    if (Object.values(endpoints).includes(name as never)) {
      return category as EndpointCategory;
    }
  }
  return undefined;
}

/**
 * Get endpoint count by category (useful for stats/monitoring).
 */
export function getEndpointCounts(): Record<EndpointCategory, number> {
  const counts = {} as Record<EndpointCategory, number>;

  for (const [category, endpoints] of Object.entries(Endpoints)) {
    counts[category as EndpointCategory] = Object.keys(endpoints).length;
  }  return counts;
}/**
 * Total count of all registered endpoints.
 */
export const TOTAL_ENDPOINTS = getAllEndpoints().length;
