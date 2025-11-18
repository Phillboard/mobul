import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const importSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format'),
  audience_name: z.string().trim().min(1, 'Audience name is required').max(100, 'Audience name must be less than 100 characters'),
});

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface RecipientRow {
  first_name?: string;
  last_name?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  email?: string;
  phone?: string;
}

// Generate unique token for recipient
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Validate ZIP code (5 digits)
function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

// Parse CSV content
function parseCSV(content: string): RecipientRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: RecipientRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row as RecipientRow);
  }
  
  return rows;
}

// Validate recipient row
function validateRow(row: RecipientRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!row.address1) {
    errors.push({ row: rowNumber, field: 'address1', message: 'Address is required' });
  }
  
  if (!row.city) {
    errors.push({ row: rowNumber, field: 'city', message: 'City is required' });
  }
  
  if (!row.state) {
    errors.push({ row: rowNumber, field: 'state', message: 'State is required' });
  }
  
  if (!row.zip) {
    errors.push({ row: rowNumber, field: 'zip', message: 'ZIP code is required' });
  } else if (!isValidZip(row.zip)) {
    errors.push({ row: rowNumber, field: 'zip', message: 'ZIP code must be 5 digits' });
  }
  
  return errors;
}

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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('client_id') as string;
    const audienceName = formData.get('audience_name') as string;

    if (!file) {
      throw new Error('Missing required file');
    }

    // Validate input
    const validation = importSchema.safeParse({ client_id: clientId, audience_name: audienceName });
    if (!validation.success) {
      throw new Error(`Invalid input: ${validation.error.errors[0].message}`);
    }

    // Verify user has access to this client
    const { data: hasAccess, error: accessError } = await supabase
      .rpc('user_can_access_client', { 
        _user_id: user.id, 
        _client_id: clientId 
      });

    if (accessError || !hasAccess) {
      throw new Error('Unauthorized: No access to this client');
    }

    console.log(`Processing import: ${file.name} (${file.size} bytes)`);

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('File size exceeds 20MB limit');
    }

    // Read file content
    const content = await file.text();
    
    // Parse CSV
    const rows = parseCSV(content);

    if (rows.length === 0) {
      throw new Error('No data found in file');
    }

    // Validate all rows
    const validationErrors: ValidationError[] = [];
    const validRows: RecipientRow[] = [];
    
    rows.forEach((row, index) => {
      const errors = validateRow(row, index + 2); // +2 because row 1 is header, row numbering starts at 1
      if (errors.length > 0) {
        validationErrors.push(...errors);
      } else {
        validRows.push(row);
      }
    });

    // Create audience record
    const { data: audience, error: audienceError } = await supabase
      .from('audiences')
      .insert({
        client_id: clientId,
        name: audienceName,
        source: 'import',
        total_count: rows.length,
        valid_count: validRows.length,
        invalid_count: rows.length - validRows.length,
        status: 'processing',
        hygiene_json: {
          file_name: file.name,
          file_size: file.size,
          imported_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (audienceError) {
      console.error('Error creating audience:', audienceError);
      throw new Error(`Failed to create audience: ${audienceError.message}`);
    }

    // Insert recipients in batches of 1000
    const batchSize = 1000;
    let insertedCount = 0;
    const usedTokens = new Set<string>();

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      
      const recipients = batch.map(row => {
        // Generate unique token
        let token = generateToken();
        while (usedTokens.has(token)) {
          token = generateToken();
        }
        usedTokens.add(token);

        return {
          audience_id: audience.id,
          first_name: row.first_name || null,
          last_name: row.last_name || null,
          company: row.company || null,
          address1: row.address1,
          address2: row.address2 || null,
          city: row.city,
          state: row.state,
          zip: row.zip,
          email: row.email || null,
          phone: row.phone || null,
          token: token,
          validation_status: 'valid'
        };
      });

      const { error: insertError } = await supabase
        .from('recipients')
        .insert(recipients);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize}:`, insertError);
        // Continue with other batches
      } else {
        insertedCount += recipients.length;
      }
    }

    // Update audience status to ready
    await supabase
      .from('audiences')
      .update({ 
        status: 'ready',
        valid_count: insertedCount
      })
      .eq('id', audience.id);

    return new Response(
      JSON.stringify({
        success: true,
        audience_id: audience.id,
        audience_name: audienceName,
        total_rows: rows.length,
        valid_rows: insertedCount,
        invalid_rows: rows.length - insertedCount,
        errors: validationErrors.slice(0, 100) // Return first 100 errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in import-audience function:', error);
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
