import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { audience_id } = await req.json();
    if (!audience_id) {
      throw new Error('Missing audience_id');
    }

    console.log('Exporting audience:', audience_id);

    // Verify user has access to this audience
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get audience to verify access
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .select('id, name, client_id')
      .eq('id', audience_id)
      .single();

    if (audienceError || !audience) {
      throw new Error('Audience not found');
    }

    // Get all recipients for this audience
    const { data: recipients, error: recipientsError } = await supabase
      .from('recipients')
      .select('*')
      .eq('audience_id', audience_id)
      .order('last_name', { ascending: true });

    if (recipientsError) {
      throw new Error('Failed to fetch recipients');
    }

    console.log(`Exporting ${recipients?.length || 0} recipients`);

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
      'validation_status',
      'token'
    ];

    const csvRows = [headers.join(',')];

    recipients?.forEach(recipient => {
      const row = headers.map(header => {
        const value = recipient[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      });
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${audience.name}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
