/**
 * Export Audience Edge Function
 * 
 * Exports recipients from an audience to CSV format.
 */

import { withApiGateway, ApiError, type AuthContext } from '../_shared/api-gateway.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { handleCORS } from '../_shared/cors.ts';
import { generateCSV, createCSVResponse } from '../_shared/import-export-utils.ts';

// ============================================================================
// Types
// ============================================================================

interface ExportAudienceRequest {
  audience_id: string;
}

// ============================================================================
// Main Handler
// ============================================================================

async function handleExportAudience(
  request: ExportAudienceRequest,
  context: AuthContext
): Promise<Response> {
  const supabase = createServiceClient();

  const { audience_id } = request;

  if (!audience_id) {
    throw new ApiError('audience_id is required', 'VALIDATION_ERROR', 400);
  }

  // UUID validation
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(audience_id)) {
    throw new ApiError('Invalid audience ID format', 'VALIDATION_ERROR', 400);
  }

  // Get audience and verify access
  const { data: audience, error: audienceError } = await supabase
    .from('audiences')
    .select('client_id, name')
    .eq('id', audience_id)
    .single();

  if (audienceError || !audience) {
    throw new ApiError('Audience not found', 'NOT_FOUND', 404);
  }

  // Verify user has access
  const { data: hasAccess, error: accessError } = await supabase
    .rpc('user_can_access_client', {
      _user_id: context.user.id,
      _client_id: audience.client_id,
    });

  if (accessError || !hasAccess) {
    throw new ApiError('No access to this audience', 'FORBIDDEN', 403);
  }

  console.log(`[EXPORT-AUDIENCE] Exporting audience: ${audience_id}`);

  // Fetch all recipients
  const { data: recipients, error: recipientsError } = await supabase
    .from('recipients')
    .select('*')
    .eq('audience_id', audience_id)
    .order('created_at', { ascending: true });

  if (recipientsError) {
    console.error('[EXPORT-AUDIENCE] Error fetching recipients:', recipientsError);
    throw new ApiError(`Failed to fetch recipients: ${recipientsError.message}`, 'DATABASE_ERROR', 500);
  }

  if (!recipients || recipients.length === 0) {
    throw new ApiError('No recipients found for this audience', 'NOT_FOUND', 404);
  }

  // Generate CSV
  const csv = generateCSV(recipients, {
    headers: [
      'first_name',
      'last_name',
      'company',
      'address1',
      'address2',
      'city',
      'state',
      'zip',
      'email',
      'phone',
      'token',
      'validation_status',
    ],
  });

  console.log(`[EXPORT-AUDIENCE] Exported ${recipients.length} recipients`);

  // Create filename
  const safeName = audience.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'audience';
  const filename = `${safeName}_${audience_id.slice(0, 8)}.csv`;

  return createCSVResponse(csv, filename, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  });
}

// ============================================================================
// Custom handler to return Response directly
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  try {
    const supabase = createServiceClient();

    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new ApiError('No authorization header', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email || '',
        role: roleData?.role || 'user',
      },
      organization_id: roleData?.organization_id || null,
      client: supabase,
    };

    const body = await req.json();
    return await handleExportAudience(body, context);

  } catch (error) {
    console.error('[EXPORT-AUDIENCE] Error:', error);

    if (error instanceof ApiError) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: error.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
