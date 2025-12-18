# Test Revoke Function Access

## Quick Test in Browser Console

1. Open your app at `localhost:8080` (or wherever it's running)
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Paste this code and press Enter:

```javascript
// Test the revoke function endpoint
(async () => {
  try {
    console.log('Testing revoke-gift-card function...');
    
    // Get the Supabase client from your app
    const supabase = window.supabaseClient || window.supabase;
    
    if (!supabase) {
      console.error('❌ Supabase client not found. Try refreshing the page.');
      return;
    }
    
    console.log('✅ Found Supabase client');
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    console.log('User:', user?.email || 'Not logged in');
    
    if (!user) {
      console.error('❌ You are not logged in!');
      return;
    }
    
    // Try calling the function
    console.log('Calling revoke-gift-card function...');
    const { data, error } = await supabase.functions.invoke('revoke-gift-card', {
      body: {
        assignmentId: 'test-id-12345',
        reason: 'Testing from browser console - checking access'
      }
    });
    
    console.log('Response data:', data);
    console.log('Response error:', error);
    
    // Analyze the response
    if (error) {
      console.log('\n📊 Error Analysis:');
      console.log('- Error message:', error.message);
      console.log('- Error details:', error);
      
      if (data) {
        console.log('- Response data:', data);
        if (data.error) {
          console.log('- Function error:', data.error);
          
          if (data.error.includes('Forbidden') || data.error.includes('Admin')) {
            console.log('\n⚠️ SOLUTION: You need admin access!');
            console.log('Run this SQL in Supabase:');
            console.log(`
              INSERT INTO user_roles (user_id, role)
              VALUES ('${user.id}', 'admin')
              ON CONFLICT (user_id, role) DO NOTHING;
            `);
          } else if (data.error.includes('not found')) {
            console.log('\n✅ Function works! (test ID not found is expected)');
          }
        }
      }
    } else {
      console.log('\n✅ Function is accessible!');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
})();
```

## What to Look For:

### If you see ❌ 404 Error:
- The function isn't deployed properly
- **Wait 1-2 minutes** - Supabase can take time to propagate

### If you see ⚠️ "Forbidden - Admin access required":
- **Run the SQL** it shows you to grant admin access

### If you see ✅ "Function works! (test ID not found is expected)":
- **Everything is working!**
- The error was just because the test ID doesn't exist
- Try revoking a real card now

### If you see "Supabase client not found":
- **Refresh the page** and try again

## Alternative: Direct HTTP Test

If the above doesn't work, test the endpoint directly:

1. Get your auth token:
   - F12 → Application tab → Local Storage
   - Find key like `sb-uibvxhwhkatjcwghnzpu-auth-token`  
   - Copy the `access_token` value

2. Run this in console:

```javascript
fetch('https://uibvxhwhkatjcwghnzpu.supabase.co/functions/v1/revoke-gift-card', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',  // Paste your token
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assignmentId: 'test-123',
    reason: 'Testing endpoint directly'
  })
})
.then(r => {
  console.log('Status:', r.status, r.statusText);
  return r.json();
})
.then(data => {
  console.log('Response:', data);
  if (data.error) {
    if (data.error.includes('Forbidden')) {
      console.log('\n⚠️ You need admin access!');
    } else if (data.error.includes('not found')) {
      console.log('\n✅ Function is working! (404 for test ID is expected)');
    }
  }
})
.catch(err => console.error('Error:', err));
```

**Replace `YOUR_TOKEN_HERE` with your actual token**

## Expected Results:

- **Status 403** + "Forbidden" = Need admin role
- **Status 404** + "not found" = Function works! (test ID doesn't exist)
- **Status 400** + "Reason too short" = Function works! (validation working)
- **Status 404** with no response = Function not deployed (wait 1-2 min)
