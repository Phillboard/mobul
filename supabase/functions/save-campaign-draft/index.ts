/**
 * Save Campaign Draft
 * Saves or updates campaign draft data
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================
// REQUEST SCHEMA
// ============================================
const RequestSchema = z.object({
  draftId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  draftName: z.string().optional(),
  formData: z.record(z.any()),
  currentStep: z.number().optional(),
});

type RequestBody = z.infer<typeof RequestSchema>;

// ============================================
// RESPONSE TYPE
// ============================================
interface DraftResponse {
  draft: {
    id: string;
    draft_name: string;
    current_step: number;
    updated_at: string;
  };
}

// ============================================
// HANDLER
// ============================================
async function handler(
  request: RequestBody,
  context: AuthContext
): Promise<DraftResponse> {
  // Use user's context for RLS
  const supabase = context.client!;
  const userId = context.user.id;
  
  const { draftId, clientId, draftName, formData, currentStep } = request;

  if (draftId) {
    // Update existing draft
    const { data, error } = await supabase
      .from('campaign_drafts')
      .update({
        form_data_json: formData,
        current_step: currentStep,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .select()
      .single();

    if (error) {
      throw new ApiError(`Failed to update draft: ${error.message}`, 'DRAFT_UPDATE_FAILED', 400);
    }

    return { draft: data };
  } else {
    // Create new draft
    if (!clientId) {
      throw new ApiError('clientId is required for new drafts', 'VALIDATION_ERROR', 400);
    }

    const { data, error } = await supabase
      .from('campaign_drafts')
      .insert({
        client_id: clientId,
        user_id: userId,
        draft_name: draftName || 'Untitled Draft',
        form_data_json: formData,
        current_step: currentStep,
      })
      .select()
      .single();

    if (error) {
      throw new ApiError(`Failed to create draft: ${error.message}`, 'DRAFT_CREATE_FAILED', 400);
    }

    return { draft: data };
  }
}

// ============================================
// EXPORT WITH MIDDLEWARE
// ============================================
export default withApiGateway(handler, {
  requireAuth: true,
  validateSchema: RequestSchema,
  auditAction: 'campaign_draft_saved',
});
