/**
 * Generate Form AI Edge Function
 * 
 * Generates form configurations using AI with tool calling.
 * Creates data enrichment forms for gift card redemption campaigns.
 */

import { withApiGateway, ApiError, type PublicContext } from '../_shared/api-gateway.ts';
import { createAICompletion, type AITool } from '../_shared/ai-client.ts';

// ============================================================================
// Types
// ============================================================================

interface GenerateFormRequest {
  prompt: string;
  context?: {
    companyName?: string;
    industry?: string;
    giftCardBrands?: string[];
  };
}

interface FormField {
  id: string;
  type: 'gift-card-code' | 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date';
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
}

interface FormConfig {
  fields: FormField[];
  settings: {
    title: string;
    description: string;
    submitButtonText: string;
    successMessage: string;
    primaryColor: string;
  };
}

interface GenerateFormResponse {
  name: string;
  description: string;
  config: FormConfig;
}

// ============================================================================
// System Prompt Builder
// ============================================================================

function buildSystemPrompt(context: GenerateFormRequest['context']): string {
  const companyName = context?.companyName || 'Your Company';
  const industry = context?.industry || 'general';
  const giftCardBrands = context?.giftCardBrands || ['gift card'];

  return `You are an expert form designer for data enrichment systems.

CONTEXT:
- Company: ${companyName}
- Industry: ${industry}
- Purpose: Collect customer data to enrich existing contact database
- Incentive: Gift card redemption (brands: ${giftCardBrands.join(', ')})

CRITICAL RULES:
1. ALWAYS include a "gift-card-code" field type for redemption
2. Focus on data enrichment - collect info that's valuable for ${industry} businesses
3. For automotive/warranty: vehicle info, mileage, service history, preferences
4. For insurance: policy updates, coverage interests, contact changes
5. For healthcare: patient info, insurance updates, appointment preferences
6. Keep forms SHORT (5-8 fields max) - people won't fill out 20 fields for a $25 gift card
7. Use smart defaults based on industry
8. Include marketing opt-in checkbox (GDPR compliant)
9. Set appropriate validation rules
10. Make forms user-friendly with good placeholders and help text`;
}

// ============================================================================
// Tool Definition
// ============================================================================

const GENERATE_FORM_TOOL: AITool = {
  type: 'function',
  function: {
    name: 'generate_form',
    description: 'Generate a complete form configuration',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Form name' },
        description: { type: 'string', description: 'Form description' },
        config: {
          type: 'object',
          properties: {
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['gift-card-code', 'text', 'email', 'phone', 'select', 'checkbox', 'radio', 'textarea', 'date'],
                  },
                  label: { type: 'string' },
                  placeholder: { type: 'string' },
                  helpText: { type: 'string' },
                  required: { type: 'boolean' },
                  options: { type: 'array', items: { type: 'string' } },
                },
                required: ['id', 'type', 'label', 'required'],
              },
            },
            settings: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                submitButtonText: { type: 'string' },
                successMessage: { type: 'string' },
                primaryColor: { type: 'string' },
              },
            },
          },
          required: ['fields', 'settings'],
        },
      },
      required: ['name', 'description', 'config'],
    },
  },
};

// ============================================================================
// Main Handler
// ============================================================================

async function handleGenerateFormAI(
  request: GenerateFormRequest,
  _context: PublicContext
): Promise<GenerateFormResponse> {
  const { prompt, context } = request;

  if (!prompt) {
    throw new ApiError('Prompt is required', 'VALIDATION_ERROR', 400);
  }

  console.log('[GENERATE-FORM-AI] Request:', {
    promptLength: prompt.length,
    industry: context?.industry,
    companyName: context?.companyName,
  });

  const systemPrompt = buildSystemPrompt(context);

  const result = await createAICompletion({
    provider: 'lovable',
    model: 'google/gemini-2.5-flash',
    systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    tools: [GENERATE_FORM_TOOL],
    toolChoice: { type: 'function', function: { name: 'generate_form' } },
  });

  // Extract tool call result
  if (!result.toolCalls || result.toolCalls.length === 0) {
    throw new ApiError('No form generated by AI', 'AI_ERROR', 500);
  }

  const toolCall = result.toolCalls[0];
  const formData: GenerateFormResponse = JSON.parse(toolCall.arguments);

  // Validate gift card field exists
  const hasGiftCardField = formData.config.fields.some(
    field => field.type === 'gift-card-code'
  );

  if (!hasGiftCardField) {
    // Add gift card field if AI forgot it
    formData.config.fields.unshift({
      id: 'code',
      type: 'gift-card-code',
      label: 'Gift Card Code',
      placeholder: 'Enter your gift card code',
      required: true,
      helpText: 'Enter the code from your gift card to redeem',
    });
  }

  console.log('[GENERATE-FORM-AI] Generated:', {
    formName: formData.name,
    fieldCount: formData.config.fields.length,
    tokensUsed: result.usage.totalTokens,
  });

  return formData;
}

// ============================================================================
// Export with API Gateway
// ============================================================================

Deno.serve(withApiGateway(handleGenerateFormAI, {
  requireAuth: false, // Can be called from public landing pages
  parseBody: true,
  auditAction: 'generate_form_ai',
}));
