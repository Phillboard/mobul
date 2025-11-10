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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { audience_id } = await req.json();

    if (!audience_id) {
      throw new Error('Missing audience_id');
    }

    console.log(`Exporting audience: ${audience_id}`);

    // Fetch all recipients for the audience
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('*')
      .eq('audience_id', audience_id)
      .order('created_at', { ascending: true });

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError);
      throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No recipients found for this audience');
    }

    console.log(`Found ${recipients.length} recipients to export`);

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
      'email',
      'phone',
      'token',
      'validation_status'
    ];

    let csv = headers.join(',') + '\n';

    recipients.forEach(recipient => {
      const row = headers.map(header => {
        const value = recipient[header as keyof typeof recipient];
        if (value === null || value === undefined) return '';
        
        // Escape values that contain commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csv += row.join(',') + '\n';
    });

    console.log(`CSV generated successfully with ${recipients.length} rows`);

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audience-${audience_id}.csv"`,
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
