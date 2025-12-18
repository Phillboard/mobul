/**
 * Test Revoke Access Utility
 * 
 * Run this in browser console to check if you have proper access to revoke gift cards
 * 
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this code
 * 4. Call: await testRevokeAccess()
 */

import { supabase } from '@core/services/supabase';

export async function testRevokeAccess() {
  console.group('🔍 Testing Revoke Gift Card Access');
  
  try {
    // Step 1: Check authentication
    console.log('Step 1: Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Not authenticated:', authError);
      console.groupEnd();
      return { success: false, error: 'Not authenticated', step: 'auth' };
    }
    
    console.log('✅ Authenticated as:', user.email);
    console.log('   User ID:', user.id);
    
    // Step 2: Check user role
    console.log('\nStep 2: Checking admin role...');
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (roleError) {
      console.error('❌ Error checking role:', roleError);
      console.groupEnd();
      return { success: false, error: roleError.message, step: 'role_check' };
    }
    
    const hasAdmin = userRoles?.some(r => r.role === 'admin');
    
    if (!hasAdmin) {
      console.warn('⚠️ You do NOT have admin role');
      console.log('   Current roles:', userRoles?.map(r => r.role).join(', ') || 'none');
      console.log('\n💡 To grant yourself admin access, run this SQL in Supabase:');
      console.log(`
        INSERT INTO user_roles (user_id, role)
        VALUES ('${user.id}', 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
      `);
      console.groupEnd();
      return { success: false, error: 'No admin role', step: 'role_check', userId: user.id };
    }
    
    console.log('✅ Has admin role');
    
    // Step 3: Test function endpoint
    console.log('\nStep 3: Testing revoke-gift-card endpoint...');
    const testResponse = await supabase.functions.invoke('revoke-gift-card', {
      body: { 
        assignmentId: 'test-id-12345', 
        reason: 'Testing endpoint access from browser console' 
      }
    });
    
    console.log('Response:', testResponse);
    
    if (testResponse.error) {
      console.log('⚠️ Function returned error (this is expected for test ID)');
      console.log('   Error:', testResponse.error);
      console.log('   Data:', testResponse.data);
      
      // Check if error is 404 (gift card not found) - this is good, means function works!
      if (testResponse.data?.error?.includes('not found') || testResponse.data?.message?.includes('not found')) {
        console.log('✅ Function is working! (404 for test ID is expected)');
        console.groupEnd();
        return { 
          success: true, 
          message: 'You have access to revoke gift cards. The test ID was not found (expected).',
          step: 'complete'
        };
      }
      
      // Check if error is 403 (forbidden) - this means no admin access
      if (testResponse.data?.error?.includes('Forbidden') || testResponse.data?.message?.includes('Forbidden')) {
        console.error('❌ Access Denied - Function says you do not have admin access');
        console.log('   This is strange because we confirmed admin role in Step 2.');
        console.log('   The edge function might be using a different check.');
        console.groupEnd();
        return { success: false, error: 'Function returned Forbidden', step: 'function_test' };
      }
    }
    
    console.log('✅ All checks passed!');
    console.groupEnd();
    return { success: true, message: 'You have full access to revoke gift cards', step: 'complete' };
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.groupEnd();
    return { success: false, error: error.message, step: 'unexpected' };
  }
}

// Export for window access
if (typeof window !== 'undefined') {
  (window as any).testRevokeAccess = testRevokeAccess;
}
