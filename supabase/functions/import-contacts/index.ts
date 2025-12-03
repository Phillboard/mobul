import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactImportRow {
  unique_code: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  company?: string;
  job_title?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  lifecycle_stage?: string;
  lead_source?: string;
  lead_score?: number;
  do_not_contact?: boolean;
  email_opt_out?: boolean;
  sms_opt_out?: boolean;
  notes?: string;
  [key: string]: any; // For custom fields
}

interface ImportSummary {
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ row: number; error: string; code?: string; data?: any }>;
}

// Validation regex matching database constraint: ^[A-Za-z0-9][A-Za-z0-9\-_]+$
const UNIQUE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\-_]+$/;

// Validate unique code format
function validateUniqueCodeFormat(code: string): { valid: boolean; reason: string } {
  if (!code || code.trim() === '') {
    return { valid: false, reason: 'Empty or missing code' };
  }
  
  const trimmedCode = code.trim();
  
  if (trimmedCode.length < 3) {
    return { valid: false, reason: `Too short (${trimmedCode.length} chars, minimum 3)` };
  }
  
  if (trimmedCode.length > 50) {
    return { valid: false, reason: `Too long (${trimmedCode.length} chars, maximum 50)` };
  }
  
  if (!UNIQUE_CODE_PATTERN.test(trimmedCode)) {
    if (!/^[A-Za-z0-9]/.test(trimmedCode)) {
      return { valid: false, reason: 'Must start with a letter or number' };
    }
    // Find the first invalid character
    const invalidChar = trimmedCode.split('').find(c => !/[A-Za-z0-9\-_]/.test(c));
    return { valid: false, reason: `Contains invalid character: "${invalidChar}"` };
  }
  
  return { valid: true, reason: '' };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
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

    // Parse request body
    const { client_id, contacts, list_id, tags } = await req.json();

    if (!client_id || !contacts || !Array.isArray(contacts)) {
      throw new Error('Invalid request: client_id and contacts array required');
    }

    // Verify user has access to this client
    const { data: hasAccess, error: accessError } = await supabase
      .rpc('user_can_access_client', { 
        _user_id: user.id, 
        _client_id: client_id 
      });

    if (accessError || !hasAccess) {
      throw new Error('Unauthorized: No access to this client');
    }

    console.log(`Starting import of ${contacts.length} contacts for client ${client_id}`);

    const summary: ImportSummary = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    const importedContactIds: string[] = [];

    // Define standard field mapping
    const standardFields = [
      'first_name', 'last_name', 'email', 'phone', 'mobile_phone',
      'company', 'job_title', 'address', 'address2', 'city', 'state',
      'zip', 'country', 'lifecycle_stage', 'lead_source', 'lead_score',
      'do_not_contact', 'email_opt_out', 'sms_opt_out', 'notes'
    ];

    // Process each contact
    for (let i = 0; i < contacts.length; i++) {
      const row = contacts[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!row.unique_code || row.unique_code.trim() === '') {
          summary.errors.push({
            row: rowNumber,
            error: 'Missing unique_code',
            code: '',
            data: row,
          });
          summary.failed++;
          continue;
        }

        // Normalize the unique code
        const uniqueCode = String(row.unique_code).trim().toUpperCase();

        // Validate unique code format
        const codeValidation = validateUniqueCodeFormat(uniqueCode);
        if (!codeValidation.valid) {
          summary.errors.push({
            row: rowNumber,
            error: `Invalid code format: ${codeValidation.reason}`,
            code: uniqueCode,
            data: row,
          });
          summary.failed++;
          continue;
        }

        // Check if contact already exists with this code
        const { data: existingContact, error: checkError } = await supabase
          .from('contacts')
          .select('id')
          .eq('client_id', client_id)
          .eq('customer_code', uniqueCode)
          .maybeSingle();

        if (checkError) {
          console.error(`Error checking existing contact for row ${rowNumber}:`, checkError);
          summary.errors.push({
            row: rowNumber,
            error: checkError.message,
            data: row,
          });
          summary.failed++;
          continue;
        }

        if (existingContact) {
          console.log(`Contact with code ${uniqueCode} already exists, skipping row ${rowNumber}`);
          summary.skipped++;
          continue;
        }

        // Prepare contact data
        const contactData: any = {
          client_id,
          customer_code: uniqueCode,
          created_by_user_id: user.id,
        };

        // Extract standard fields
        standardFields.forEach(field => {
          if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
            let value = row[field];
            
            // Convert string booleans to actual booleans
            if (field.includes('opt_out') || field === 'do_not_contact') {
              if (typeof value === 'string') {
                value = value.toLowerCase() === 'true' || value === '1';
              }
            }
            
            // Convert lead_score to number
            if (field === 'lead_score' && typeof value === 'string') {
              const parsed = parseInt(value, 10);
              value = isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed));
            }
            
            contactData[field] = value;
          }
        });

        // Extract custom fields (any field not in standard list)
        const customFields: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          if (key !== 'unique_code' && !standardFields.includes(key)) {
            customFields[key] = row[key];
          }
        });

        if (Object.keys(customFields).length > 0) {
          contactData.custom_fields = customFields;
        }

        // Set defaults
        contactData.country = contactData.country || 'US';
        contactData.lifecycle_stage = contactData.lifecycle_stage || 'lead';
        contactData.lead_score = contactData.lead_score || 0;

        // Insert contact
        const { data: insertedContact, error: insertError } = await supabase
          .from('contacts')
          .insert(contactData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`Error inserting contact for row ${rowNumber}:`, insertError);
          
          // Provide better error messages for common constraint violations
          let friendlyError = insertError.message;
          if (insertError.message.includes('customer_code_format_check')) {
            friendlyError = `Invalid code format: must be 3-50 chars, start with letter/number, contain only letters, numbers, dashes, underscores`;
          } else if (insertError.message.includes('duplicate key') || insertError.message.includes('unique constraint')) {
            friendlyError = `Duplicate code: "${uniqueCode}" already exists`;
          } else if (insertError.message.includes('violates check constraint')) {
            friendlyError = `Data validation failed: ${insertError.message}`;
          }
          
          summary.errors.push({
            row: rowNumber,
            error: friendlyError,
            code: uniqueCode,
            data: row,
          });
          summary.failed++;
          continue;
        }

        if (insertedContact) {
          importedContactIds.push(insertedContact.id);
        }

        summary.successful++;

        // Log progress every 100 contacts
        if (rowNumber % 100 === 0) {
          console.log(`Processed ${rowNumber} / ${contacts.length} contacts...`);
        }

      } catch (error) {
        console.error(`Unexpected error processing row ${rowNumber}:`, error);
        summary.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row,
        });
        summary.failed++;
      }
    }

    console.log('Import complete:', summary);

    // Add contacts to list if specified
    if (list_id && importedContactIds.length > 0) {
      console.log(`Adding ${importedContactIds.length} contacts to list ${list_id}`);
      
      const listMembers = importedContactIds.map(contactId => ({
        contact_id: contactId,
        list_id: list_id,
        added_by_user_id: user.id,
      }));

      const { error: listError } = await supabase
        .from('contact_list_members')
        .insert(listMembers);

      if (listError) {
        console.error('Error adding contacts to list:', listError);
        // Don't fail the import, just log the error
      } else {
        // Update the list contact count
        await supabase.rpc('update_list_contact_count', { list_id: list_id });
      }
    }

    // Add tags if specified
    if (tags && Array.isArray(tags) && tags.length > 0 && importedContactIds.length > 0) {
      console.log(`Adding tags to ${importedContactIds.length} contacts`);
      
      const tagRecords = importedContactIds.flatMap(contactId =>
        tags.map(tag => ({
          contact_id: contactId,
          tag: tag,
          created_by_user_id: user.id,
        }))
      );

      const { error: tagError } = await supabase
        .from('contact_tags')
        .insert(tagRecords);

      if (tagError) {
        console.error('Error adding tags:', tagError);
        // Don't fail the import, just log the error
      }
    }

    // Determine overall success (some rows can fail but import still "succeeds" if some work)
    const overallSuccess = summary.successful > 0 || summary.errors.length === 0;
    
    return new Response(
      JSON.stringify({
        success: overallSuccess,
        successful: summary.successful,
        failed: summary.failed,
        skipped: summary.skipped,
        summary,
        imported_count: importedContactIds.length,
        // Include first few errors in top-level for easier access
        ...(summary.errors.length > 0 && {
          first_errors: summary.errors.slice(0, 5).map(e => ({
            row: e.row,
            error: e.error,
            code: e.code,
          })),
          total_errors: summary.errors.length,
        }),
      }),
      {
        // Use 200 even with some failures - it's partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Import function error:', error);
    
    // Provide better error messages for common issues
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('authorization')) {
      errorMessage = 'Authentication failed. Please log in again.';
    } else if (errorMessage.includes('No access')) {
      errorMessage = 'You do not have permission to import contacts for this client.';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        successful: 0,
        failed: 0,
        skipped: 0,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

