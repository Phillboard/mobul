import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get audience ID from query params
    const url = new URL(req.url);
    const audienceId = url.searchParams.get('audience_id');

    if (!audienceId) {
      throw new Error('Missing audience_id parameter');
    }

    console.log(`Exporting audience: ${audienceId} for user: ${user.id}`);

    // Verify user has access to this audience
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .select('*, clients!inner(id)')
      .eq('id', audienceId)
      .single();

    if (audienceError || !audience) {
      throw new Error('Audience not found or access denied');
    }

    // Fetch all recipients for this audience
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('*')
      .eq('audience_id', audienceId)
      .order('created_at', { ascending: true });

    if (recipientsError) {
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    console.log(`Found ${recipients?.length || 0} recipients to export`);

    // Generate CSV
    const headers = [
      'first_name',
      'last_name',
      'company',
      'address1',
      'address2',
      'city',
      'state',
      'zip',
      'zip4',
      'email',
      'phone',
      'token',
      'validation_status'
    ];

    const csvRows = [headers.join(',')];

    recipients?.forEach(recipient => {
      const row = headers.map(header => {
        const value = recipient[header as keyof typeof recipient] || '';
        // Escape commas and quotes in CSV
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');

    console.log(`Export completed. CSV size: ${csvContent.length} bytes`);

    return new Response(csvContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audience-${audienceId}.csv"`,
      },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in export-audience function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
