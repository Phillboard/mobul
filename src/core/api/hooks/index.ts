/**
 * API Hooks Barrel Export
 * 
 * Central access point for ALL typed API hooks.
 * Import hooks from '@core/api/hooks' or 'src/core/api/hooks'.
 * 
 * @example
 * import { useProvisionGiftCard, useSendGiftCardEmail, useSaveCampaignDraft } from '@core/api/hooks';
 */

// ============================================================================
// Gift Card Hooks
// ============================================================================
export {
  // Query keys
  giftCardKeys,
  // Mutation hooks
  useProvisionGiftCard,
  useCheckGiftCardBalance,
  useCheckInventoryCardBalance,
  useValidateGiftCardCode,
  useValidateGiftCardConfiguration,
  useValidateRedemptionCode,
  useRedeemCustomerCode,
  useRedeemGiftCardEmbed,
  useRevokeGiftCard,
  useTransferAdminCards,
  usePurchaseGiftCards,
  useImportGiftCards,
  useCleanupStuckGiftCards,
  // Query hooks
  useMonitorGiftCardSystem,
  useTilloBrandLookup,
  // Utility hooks
  useInvalidateGiftCardQueries,
  usePrefetchGiftCardBalance,
  // Types
  type ProvisionGiftCardRequest,
  type ProvisionGiftCardResponse,
  type CheckBalanceRequest,
  type CheckBalanceResponse,
  type ValidateCodeRequest,
  type ValidateCodeResponse,
  type RedeemCodeRequest,
  type RedeemCodeResponse,
  type RevokeGiftCardRequest,
  type RevokeGiftCardResponse,
  type TransferCardsRequest,
  type TransferCardsResponse,
  type PurchaseCardsRequest,
  type PurchaseCardsResponse,
  type ImportGiftCardsRequest,
  type ImportGiftCardsResponse,
  type SystemMonitorResponse,
  type TilloBrandLookupRequest,
  type TilloBrandLookupResponse,
} from './useGiftCardAPI';

// ============================================================================
// Campaign Hooks
// ============================================================================
export {
  // Query keys
  campaignKeys,
  // Mutation hooks
  useSaveCampaignDraft,
  useEvaluateConditions,
  useCompleteCondition,
  useValidateCampaignBudget,
  useCalculateCreditRequirements,
  useGenerateRecipientTokens,
  usePreviewCampaignAudience,
  useCreatePreviewLink,
  useDiagnoseCampaignConfig,
  useSubmitToVendor,
  useSendMarketingCampaign,
  // Query hooks
  useCampaignBudgetValidation,
  useCampaignConfigDiagnostics,
  // Types
  type SaveDraftRequest,
  type SaveDraftResponse,
  type EvaluateConditionsRequest,
  type EvaluateConditionsResponse,
  type CompleteConditionRequest,
  type CompleteConditionResponse,
  type ValidateBudgetRequest,
  type ValidateBudgetResponse,
  type CalculateCreditRequest,
  type CalculateCreditResponse,
  type GenerateTokensRequest,
  type GenerateTokensResponse,
  type PreviewAudienceRequest,
  type PreviewAudienceResponse,
  type CreatePreviewLinkRequest,
  type CreatePreviewLinkResponse,
  type DiagnoseConfigRequest,
  type DiagnoseConfigResponse,
  type SubmitToVendorRequest,
  type SubmitToVendorResponse,
  type SendMarketingCampaignRequest,
  type SendMarketingCampaignResponse,
} from './useCampaignAPI';

// ============================================================================
// Form Hooks
// ============================================================================
export {
  // Mutation hooks
  useSubmitForm,
  useSubmitLeadForm,
  useHandlePurl,
  useGenerateAIForm,
  // Backward compatibility
  useSubmitAceForm,
  // Types
  type SubmitFormRequest,
  type FormSubmissionResponse,
  type SubmitLeadFormRequest,
  type SubmitLeadFormResponse,
  type HandlePurlRequest,
  type HandlePurlResponse,
  type GenerateAIFormRequest,
  type GenerateAIFormResponse,
} from './useFormAPI';

// ============================================================================
// Messaging Hooks
// ============================================================================
export {
  // SMS hooks
  useSendGiftCardSms,
  useSendSmsOptIn,
  useSendMarketingSms,
  useRetryFailedSms,
  useTestSmsProvider,
  // Email hooks
  useSendEmail,
  useSendGiftCardEmail,
  useSendMarketingEmail,
  useSendVerificationEmail,
  // Notification hooks
  useSendApprovalNotification,
  useSendCommentNotification,
  // Invitation hooks
  useSendUserInvitation,
  // Backward compatibility
  useSendOptIn,
  useSendSMS,
  // Types
  type MessagingResponse,
  type SendGiftCardSmsRequest,
  type SendMarketingSmsRequest,
  type SendOptInRequest,
  type RetryFailedSmsRequest,
  type RetryFailedSmsResponse,
  type TestSmsProviderRequest,
  type TestSmsProviderResponse,
  type SendEmailRequest,
  type SendGiftCardEmailRequest,
  type SendMarketingEmailRequest,
  type SendVerificationEmailRequest,
  type SendApprovalNotificationRequest,
  type SendCommentNotificationRequest,
  type SendUserInvitationRequest,
  type SendUserInvitationResponse,
} from './useMessagingAPI';

// ============================================================================
// Telephony Hooks
// ============================================================================
export {
  // Query keys
  telephonyKeys,
  // Mutation hooks
  useFetchTwilioNumbers,
  useProvisionTwilioNumber,
  useReleaseTwilioNumber,
  useAssignTrackedNumbers,
  useUpdateTwilioConfig,
  useConfigureTwilioWebhooks,
  useDisableTwilioConfig,
  useRemoveTwilioConfig,
  useRevalidateTwilio,
  useTestTwilioConnection,
  // Query hooks
  useTwilioStatus,
  useTwilioHealthReport,
  useAvailableTwilioNumbers,
  // Types
  type TwilioStatusResponse,
  type FetchNumbersRequest,
  type FetchNumbersResponse,
  type AvailableNumber,
  type ProvisionNumberRequest,
  type ProvisionNumberResponse,
  type ReleaseNumberRequest,
  type ReleaseNumberResponse,
  type AssignTrackedNumbersRequest,
  type AssignTrackedNumbersResponse,
  type TwilioConfigRequest,
  type TwilioConfigResponse,
  type ConfigureWebhooksRequest,
  type ConfigureWebhooksResponse,
  type DisableConfigRequest,
  type RemoveConfigRequest,
  type RevalidateRequest,
  type RevalidateResponse,
  type TestConnectionRequest,
  type TestConnectionResponse,
  type HealthReportResponse,
} from './useTelephonyAPI';

// ============================================================================
// Admin Hooks
// ============================================================================
export {
  // Query keys
  adminKeys,
  // Mutation hooks
  useAllocateCredit,
  useGenerateApiKey,
  useDiagnoseProvisioningSetup,
  useAcceptInvitation,
  // Query hooks
  useEnvironmentValidation,
  useProvisioningDiagnostics,
  // Types
  type AllocateCreditRequest,
  type AllocateCreditResponse,
  type CalculateCreditRequirementsRequest,
  type CalculateCreditRequirementsResponse,
  type GenerateApiKeyRequest,
  type GenerateApiKeyResponse,
  type ValidateEnvironmentResponse,
  type DiagnoseProvisioningRequest,
  type DiagnoseProvisioningResponse,
  type AcceptInvitationRequest,
  type AcceptInvitationResponse,
} from './useAdminAPI';

// ============================================================================
// Import/Export Hooks
// ============================================================================
export {
  // Import hooks
  useImportAudience,
  useImportContacts,
  useImportCampaignCodes,
  useImportCustomerCodes,
  // Export hooks
  useExportAudience,
  useExportDatabase,
  // Utility functions
  formatImportErrors,
  downloadExportData,
  // Types
  type ImportResult,
  type ExportResult,
  type ImportAudienceRequest,
  type ImportAudienceResponse,
  type ExportAudienceRequest,
  type ImportContactsRequest,
  type ImportContactsResponse,
  type ImportCampaignCodesRequest,
  type ImportCampaignCodesResponse,
  type ImportCustomerCodesRequest,
  type ImportCustomerCodesResponse,
  type ExportDatabaseRequest,
  type ExportDatabaseResponse,
} from './useImportExportAPI';// ============================================================================
// AI Hooks
// ============================================================================
export {
  // Chat hooks
  useOpenAIChat,
  useDrPhillipChat,
  useAIDesignChat,
  // Generation hooks
  useGenerateLandingPage,
  useAILandingPageChat,
  useGenerateLandingPageSimple,
  useGenerateFormAI,
  // Utility hooks
  useAICompletion,
  // Backward compatibility
  useAIChat,
  // Types
  type AIMessage,
  type AIResponse,
  type AIChatRequest,
  type AIChatResponse,
  type DrPhillipChatRequest,
  type DrPhillipChatResponse,
  type AIDesignChatRequest,
  type AIDesignChatResponse,
  type GenerateLandingPageRequest,
  type GenerateLandingPageResponse,
  type AILandingPageChatRequest,
  type AILandingPageChatResponse,
  type GenerateFormAIRequest,
  type GenerateFormAIResponse,
} from './useAIAPI';// ============================================================================
// Integrations Hooks
// ============================================================================
export {
  // Zapier hooks
  useDispatchZapierEvent,
  // Webhook hooks
  useTriggerWebhook,
  // Wallet pass hooks
  useGenerateAppleWalletPass,
  useGenerateGoogleWalletPass,
  // Code approval hooks
  useApproveCustomerCode,
  useBulkApproveCodes,
  // Call center hooks
  useHandleIncomingCall,
  useCompleteCallDisposition,
  // Types
  type DispatchZapierEventRequest,
  type DispatchZapierEventResponse,
  type TriggerWebhookRequest,
  type TriggerWebhookResponse,
  type GenerateAppleWalletPassRequest,
  type GenerateAppleWalletPassResponse,
  type GenerateGoogleWalletPassRequest,
  type GenerateGoogleWalletPassResponse,
  type ApproveCustomerCodeRequest,
  type ApproveCustomerCodeResponse,
  type BulkApproveCodesRequest,
  type BulkApproveCodesResponse,
  type HandleIncomingCallRequest,
  type HandleIncomingCallResponse,
  type CompleteCallDispositionRequest,
  type CompleteCallDispositionResponse,
} from './useIntegrationsAPI';
