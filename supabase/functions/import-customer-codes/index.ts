import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { headers: corsHeaders, status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { headers: corsHeaders, status: 401 }
      );
    }

    const { clientId, campaignId, audienceId, fileName, codes } = await req.json();

    if (!clientId || !codes || !Array.isArray(codes)) {
      return Response.json(
        { success: false, error: 'Missing required parameters' },
        { headers: corsHeaders, status: 400 }
      );
    }

    // Verify user has access to this client
    const { data: hasAccess } = await supabase
      .rpc('user_can_access_client', {
        _user_id: user.id,
        _client_id: clientId
      });

    if (!hasAccess) {
      return Response.json(
        { success: false, error: 'Unauthorized to upload codes for this client' },
        { headers: corsHeaders, status: 403 }
      );
    }

    // Create upload tracking record
    const { data: upload, error: uploadError } = await supabase
      .from('bulk_code_uploads')
      .insert({
        client_id: clientId,
        campaign_id: campaignId,
        audience_id: audienceId,
        uploaded_by_user_id: user.id,
        file_name: fileName,
        total_codes: codes.length,
        upload_status: 'processing'
      })
      .select()
      .single();

    if (uploadError || !upload) {
      console.error('Error creating upload record:', uploadError);
      return Response.json(
        { success: false, error: 'Failed to initialize upload' },
        { headers: corsHeaders, status: 500 }
      );
    }

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const errorLog: any[] = [];

    // Get or create audience
    let targetAudienceId = audienceId;
    if (!targetAudienceId) {
      const audienceName = campaignId 
        ? `Campaign ${campaignId} - Customer Codes` 
        : `Bulk Upload ${new Date().toISOString().split('T')[0]}`;
      
      const { data: newAudience, error: audienceError } = await supabase
        .from('audiences')
        .insert({
          client_id: clientId,
          name: audienceName,
          source: 'csv',
          status: 'processing'
        })
        .select()
        .single();

      if (audienceError || !newAudience) {
        console.error('Error creating audience:', audienceError);
        return Response.json(
          { success: false, error: 'Failed to create audience' },
          { headers: corsHeaders, status: 500 }
        );
      }

      targetAudienceId = newAudience.id;
    }

    // Process codes in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < codes.length; i += BATCH_SIZE) {
      const batch = codes.slice(i, i + BATCH_SIZE);
      const recipientsToInsert: any[] = [];

      for (const code of batch) {
        try {
          // Validate required fields
          if (!code.redemption_code) {
            errorCount++;
            errorLog.push({
              row: i + batch.indexOf(code) + 2, // +2 for header and 0-index
              error: 'Missing redemption_code',
              data: code
            });
            continue;
          }

          // Check for duplicate in this batch
          const isDuplicateInBatch = recipientsToInsert.some(
            r => r.redemption_code === code.redemption_code.toUpperCase()
          );

          if (isDuplicateInBatch) {
            duplicateCount++;
            continue;
          }

          // Check for existing code in database
          const { data: existing } = await supabase
            .from('recipients')
            .select('id')
            .eq('redemption_code', code.redemption_code.toUpperCase())
            .maybeSingle();

          if (existing) {
            duplicateCount++;
            errorLog.push({
              row: i + batch.indexOf(code) + 2,
              error: 'Duplicate code already exists in database',
              code: code.redemption_code
            });
            continue;
          }

          // Extract custom fields - everything that's not a standard field
          const standardFields = [
            'redemption_code', 'first_name', 'last_name', 
            'email', 'phone', 'company', 'address1', 'address2', 
            'city', 'state', 'zip', 'zip4'
          ];
          
          const customFields: any = {};
          for (const [key, value] of Object.entries(code)) {
            if (!standardFields.includes(key) && value !== null && value !== undefined) {
              customFields[key] = value;
            }
          }

          recipientsToInsert.push({
            audience_id: targetAudienceId,
            redemption_code: code.redemption_code.toUpperCase(),
            first_name: code.first_name || null,
            last_name: code.last_name || null,
            phone: code.phone || null,
            email: code.email?.toLowerCase() || null,
            company: code.company || null,
            address1: code.address1 || null,
            address2: code.address2 || null,
            city: code.city || null,
            state: code.state || null,
            zip: code.zip || null,
            approval_status: 'pending',
            custom_fields: customFields
          });
        } catch (error) {
          errorCount++;
          errorLog.push({
            row: i + batch.indexOf(code) + 2,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: code
          });
        }
      }

      // Insert batch
      if (recipientsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('recipients')
          .insert(recipientsToInsert);

        if (insertError) {
          console.error('Batch insert error:', insertError);
          errorCount += recipientsToInsert.length;
          errorLog.push({
            batch: `${i}-${i + batch.length}`,
            error: insertError.message
          });
        } else {
          successCount += recipientsToInsert.length;

          // Log uploads in audit log
          for (const recipient of recipientsToInsert) {
            await supabase.from('recipient_audit_log').insert({
              action: 'uploaded',
              performed_by_user_id: user.id,
              ip_address: req.headers.get('x-forwarded-for'),
              user_agent: req.headers.get('user-agent'),
              metadata: {
                uploadId: upload.id,
                redemption_code: recipient.redemption_code
              }
            });
          }
        }
      }
    }

    // Update upload record with results
    await supabase
      .from('bulk_code_uploads')
      .update({
        successful_codes: successCount,
        duplicate_codes: duplicateCount,
        error_codes: errorCount,
        upload_status: errorCount === codes.length ? 'failed' : 'completed',
        error_log: errorLog.length > 0 ? errorLog : null
      })
      .eq('id', upload.id);

    // Update audience counts
    if (targetAudienceId) {
      await supabase
        .from('audiences')
        .update({
          total_count: successCount,
          valid_count: successCount,
          status: 'ready'
        })
        .eq('id', targetAudienceId);
    }

    console.log('Import completed:', {
      uploadId: upload.id,
      total: codes.length,
      success: successCount,
      duplicates: duplicateCount,
      errors: errorCount
    });

    return Response.json({
      success: true,
      uploadId: upload.id,
      audienceId: targetAudienceId,
      summary: {
        total: codes.length,
        successful: successCount,
        duplicates: duplicateCount,
        errors: errorCount
      },
      errorLog: errorLog.length > 0 ? errorLog.slice(0, 100) : [] // Return first 100 errors
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in import-customer-codes:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
