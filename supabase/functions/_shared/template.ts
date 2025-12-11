/**
 * EDGE FUNCTION TEMPLATE
 * Copy this file when creating new edge functions
 * 
 * Usage:
 * 1. Copy this file to your new function folder
 * 2. Rename to index.ts
 * 3. Define your request schema
 * 4. Implement your handler
 * 5. Configure the withApiGateway options
 */

import { withApiGateway, ApiError, type AuthContext } from './api-gateway.ts';
import { createServiceClient } from './supabase.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// ============================================
// REQUEST SCHEMA
// Define the expected request body structure
// ============================================
const RequestSchema = z.object({
  // Add your fields here
  // Example:
  // userId: z.string().uuid(),
  // data: z.object({ ... }),
});

type RequestBody = z.infer<typeof RequestSchema>;

// ============================================
// RESPONSE TYPE
// Define what this function returns
// ============================================
interface ResponseData {
  success: true;
  // Add your response fields here
}

// ============================================
// HANDLER
// Your business logic goes here
// ============================================
async function handler(
  request: RequestBody,
  context: AuthContext
): Promise<ResponseData> {
  // Get Supabase client
  const supabase = createServiceClient();
  
  // Access authenticated user
  const { user } = context;
  console.log(`[FUNCTION-NAME] Called by user: ${user.id}`);
  
  // Your business logic here
  // ...
  
  // Return response
  return {
    success: true,
    // ... your data
  };
}

// ============================================
// EXPORT WITH MIDDLEWARE
// Configure authentication, validation, etc.
// ============================================
export default withApiGateway(handler, {
  requireAuth: true,           // Require JWT authentication
  // requiredRole: 'admin',    // Optional: require specific role
  validateSchema: RequestSchema, // Validate request body
  auditAction: 'function-called', // Log to audit trail
  rateLimitKey: 'function-name',  // Rate limit identifier
});

