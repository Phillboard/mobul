# GITHUB ISSUES RESOLUTION PLAN

**Date:** December 10, 2025  
**Total Issues:** 11 Open  
**Analysis Status:** Complete  
**TypeScript Status:** ✅ Clean (no errors)  
**NPM Audit:** 7 vulnerabilities (6 moderate, 1 high) - fixable

---

## EXECUTIVE SUMMARY

### Issue Categories Identified

| Category | Issues | Root Cause |
|----------|--------|------------|
| **Missing Database Tables** | #8, #11 | Tables `tasks` and `activities` don't exist |
| **Invalid UUID Handling** | #12, #17 | String IDs sent where UUID expected |
| **CORS/Edge Function Failures** | #17 | Missing CORS headers on `save-campaign-draft` |
| **Data Sync/Persistence** | #14, #17, #18 | Form state not persisting to DB |
| **Form State Management** | #13, #18 | React state not resetting between forms |
| **Schema/Query Mismatches** | #15, #16 | Invalid query params or missing columns |
| **UI/UX Issues** | #9, #10 | Non-functional buttons, missing attributes |

### Priority Matrix

```
CRITICAL (Blocks Core Workflow):
├── #17 - Create Campaign (Multiple Failures)
├── #18 - Edit Campaign (Multiple Failures)
├── #8  - Tasks Table Missing
└── #11 - Activities Table Missing

HIGH (Affects Key Features):
├── #12 - Call Scripts UUID Error
├── #9  - Dashboard Onboarding Broken
├── #15 - Rewards Tab 400 Error
└── #16 - Approvals Tab 400 Error

MEDIUM (UX/Polish):
├── #13 - Call Scripts Stale Data
├── #14 - Comments Not Persisting
└── #10 - Sidebar Search Missing Attributes
```

---

## ISSUE-BY-ISSUE RESOLUTION PLAN

---

### 🔴 ISSUE #17: Create Campaign — Multiple Failures

**Priority:** CRITICAL  
**Effort:** 4-6 hours  
**Root Causes:** 5 distinct bugs

#### Bug 1: "Create Landing Page" Button Non-Responsive

**Symptom:** Button does nothing when clicked  
**Root Cause:** Missing onClick handler or navigation  
**Location:** `src/components/campaigns/wizard/*.tsx` or `src/pages/CampaignCreate.tsx`

**Fix:**
```typescript
// Find the "Create Landing Page" button and add:
onClick={() => navigate('/landing-pages/create')}
// OR open modal:
onClick={() => setShowCreateLandingPageModal(true)}
```

#### Bug 2: Mail Date Off by One Day

**Symptom:** Selected date 12/07 saves as 12/06  
**Root Cause:** UTC timezone conversion without local offset  
**Location:** Date handling in campaign form

**Fix:**
```typescript
// BEFORE (broken):
const mailDate = new Date(selectedDate);

// AFTER (fixed):
const mailDate = new Date(selectedDate);
mailDate.setMinutes(mailDate.getMinutes() + mailDate.getTimezoneOffset());
// OR use date-fns:
import { startOfDay } from 'date-fns';
const mailDate = startOfDay(selectedDate);
```

#### Bug 3: "None (skip)" Landing Page Sends Invalid UUID

**Symptom:** `invalid input syntax for type uuid: "none"`  
**Root Cause:** String "none" sent instead of null  
**Location:** Campaign creation form/API call

**Fix:**
```typescript
// BEFORE (broken):
landing_page_id: selectedLandingPage || 'none'

// AFTER (fixed):
landing_page_id: selectedLandingPage === 'none' ? null : selectedLandingPage
```

#### Bug 4: Save as Draft CORS Failure

**Symptom:** CORS preflight rejection on edge function  
**Root Cause:** Missing CORS headers in `save-campaign-draft` function  
**Location:** `supabase/functions/save-campaign-draft/index.ts`

**Fix:**
```typescript
// Add to edge function:
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle OPTIONS preflight:
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

// Add headers to all responses:
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

#### Bug 5: Forms Selection Not Persisting

**Symptom:** Selected forms not saved to campaign  
**Root Cause:** Forms not included in save payload  
**Location:** Campaign creation mutation

**Fix:**
```typescript
// Ensure forms are included in the mutation:
const createCampaign = async (data) => {
  const campaign = await supabase.from('campaigns').insert({
    ...data,
    // Ensure this relationship is created:
  });
  
  // Create campaign_forms junction records:
  if (data.form_ids?.length) {
    await supabase.from('campaign_forms').insert(
      data.form_ids.map(formId => ({
        campaign_id: campaign.id,
        form_id: formId,
      }))
    );
  }
};
```

---

### 🔴 ISSUE #18: Edit Campaign — Multiple Failures

**Priority:** CRITICAL  
**Effort:** 4-6 hours  
**Root Causes:** Same patterns as #17 + additional sync issues

#### Core Problem: Data Not Syncing Between Editor and Details

**Symptom:** Editor shows one value, Details shows another  
**Root Cause:** Two different queries loading different data states

**Fix Strategy:**
1. Use single source of truth with React Query
2. Invalidate queries after mutations
3. Use optimistic updates

```typescript
// In campaign edit mutation:
const mutation = useMutation({
  mutationFn: updateCampaign,
  onSuccess: () => {
    // Invalidate ALL campaign queries to force refresh:
    queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  },
});
```

#### Additional Fixes Needed:
- Same date timezone fix as #17
- Same landing page sync fix
- Add unsaved changes warning modal
- Fix "0 fields" form metadata loading

---

### 🔴 ISSUE #8: Tasks — Missing Table

**Priority:** CRITICAL  
**Effort:** 30 minutes  
**Root Cause:** `public.tasks` table doesn't exist

**Fix - Create Migration:**
```sql
-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES public.clients(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  contact_id UUID REFERENCES public.contacts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view tasks in their client" ON public.tasks
  FOR SELECT USING (
    client_id IN (SELECT client_id FROM user_client_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create tasks in their client" ON public.tasks
  FOR INSERT WITH CHECK (
    client_id IN (SELECT client_id FROM user_client_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their tasks" ON public.tasks
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    client_id IN (SELECT client_id FROM user_client_access WHERE user_id = auth.uid())
  );

-- Grant permissions
GRANT ALL ON public.tasks TO authenticated;
```

---

### 🔴 ISSUE #11: Activities — Missing Table

**Priority:** CRITICAL  
**Effort:** 30 minutes  
**Root Cause:** `public.activities` table doesn't exist

**Fix - Create Migration:**
```sql
-- Create activities table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'task', 'other')),
  subject TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  duration_minutes INTEGER,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  contact_id UUID REFERENCES public.contacts(id),
  campaign_id UUID REFERENCES public.campaigns(id),
  client_id UUID REFERENCES public.clients(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view activities in their client" ON public.activities
  FOR SELECT USING (
    client_id IN (SELECT client_id FROM user_client_access WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create activities" ON public.activities
  FOR INSERT WITH CHECK (
    client_id IN (SELECT client_id FROM user_client_access WHERE user_id = auth.uid())
  );

-- Grant permissions
GRANT ALL ON public.activities TO authenticated;
```

---

### 🟡 ISSUE #12: Call Scripts — UUID Error on Default Scripts

**Priority:** HIGH  
**Effort:** 1-2 hours  
**Root Cause:** Default scripts use string IDs like "default-greeting" instead of UUIDs

**Fix Strategy - Two Options:**

**Option A: Convert Default Scripts to UUIDs (Recommended)**
```sql
-- Migration to convert default scripts to use proper UUIDs
UPDATE public.call_center_scripts 
SET id = gen_random_uuid()
WHERE id::text IN ('default-greeting', 'default-objection', 'default-closing', 'default-followup');
```

**Option B: Handle String IDs in Frontend**
```typescript
// Check if ID is a default script before PATCH:
const isDefaultScript = id.startsWith('default-');

if (isDefaultScript) {
  // Clone the default script with a new UUID instead of updating
  const { data: newScript } = await supabase
    .from('call_center_scripts')
    .insert({
      ...scriptData,
      id: undefined, // Let DB generate UUID
      is_default: false,
    })
    .select()
    .single();
} else {
  // Normal update
  await supabase.from('call_center_scripts').update(scriptData).eq('id', id);
}
```

---

### 🟡 ISSUE #9: Dashboard Onboarding — Not Actionable

**Priority:** HIGH  
**Effort:** 1-2 hours  
**Root Cause:** Getting Started items have no navigation handlers

**Fix:**
```typescript
// In Dashboard.tsx or OnboardingChecklist component:
const onboardingSteps = [
  { 
    title: 'Set up your organization',
    path: '/settings/organization',
    action: () => navigate('/settings/organization'),
  },
  { 
    title: 'Create your first template',
    path: '/mail',
    action: () => navigate('/mail'),
  },
  { 
    title: 'Upload an audience',
    path: '/contacts/import',
    action: () => navigate('/contacts/import'),
  },
  { 
    title: 'Create a campaign',
    path: '/campaigns/create',
    action: () => navigate('/campaigns/create'),
  },
  { 
    title: 'Build a landing page',
    path: '/landing-pages/create',
    action: () => navigate('/landing-pages/create'),
  },
];

// Render with click handlers:
{onboardingSteps.map(step => (
  <Button key={step.path} onClick={step.action} variant="link">
    {step.title}
  </Button>
))}
```

---

### 🟡 ISSUE #15 & #16: Rewards/Approvals Tabs — 400 Errors

**Priority:** HIGH  
**Effort:** 1-2 hours each  
**Root Cause:** Invalid query parameters or missing table columns

**Debug Steps:**
1. Check if tables `campaign_reward_configs` and `campaign_approvals` exist
2. Verify column names match query
3. Check RLS policies

**Fix for #15 (Rewards):**
```typescript
// Check the query in useRewards hook:
const { data } = await supabase
  .from('campaign_reward_configs')
  .select('*')  // Simplify first to debug
  .eq('campaign_id', campaignId);

// If table doesn't exist, create it (similar to tasks/activities)
```

**Fix for #16 (Approvals):**
```typescript
// Same pattern - simplify query and verify table exists
const { data } = await supabase
  .from('campaign_approvals')
  .select('*')
  .eq('campaign_id', campaignId)
  .order('created_at', { ascending: false });
```

---

### 🟡 ISSUE #13: Call Scripts — Stale Form Data

**Priority:** MEDIUM  
**Effort:** 1 hour  
**Root Cause:** Form state not resetting when dialog closes

**Fix:**
```typescript
// In ScriptEditor or dialog component:
const [formData, setFormData] = useState(initialFormState);

// Reset form when dialog opens/closes:
useEffect(() => {
  if (isOpen && selectedScript) {
    // Edit mode - load script data
    setFormData(selectedScript);
  } else if (isOpen && !selectedScript) {
    // Create mode - reset to empty
    setFormData(initialFormState);
  }
}, [isOpen, selectedScript]);

// Also reset on close:
const handleClose = () => {
  setFormData(initialFormState);
  setIsOpen(false);
};
```

---

### 🟡 ISSUE #14: Comments — Not Persisting

**Priority:** MEDIUM  
**Effort:** 1-2 hours  
**Root Cause:** Similar to other 400 errors - table/query issue

**Fix Steps:**
1. Verify `campaign_comments` table exists
2. Check RLS policies allow insert
3. Fix optimistic UI update to wait for confirmation

```typescript
// Fix the mutation:
const addComment = useMutation({
  mutationFn: async (comment) => {
    const { data, error } = await supabase
      .from('campaign_comments')
      .insert({
        campaign_id: campaignId,
        content: comment,
        user_id: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    // Only show toast AFTER successful insert
    toast.success('Comment added');
    queryClient.invalidateQueries(['campaign-comments', campaignId]);
  },
  onError: (error) => {
    toast.error(`Failed to add comment: ${error.message}`);
  },
});
```

---

### 🟢 ISSUE #10: Sidebar Search — Missing Attributes

**Priority:** LOW  
**Effort:** 15 minutes  
**Root Cause:** Input element missing id/name

**Fix:**
```typescript
// In Sidebar.tsx or SidebarSearch.tsx:
<Input
  id="sidebar-search"
  name="sidebar-search"
  placeholder="Search Menu"
  // ... other props
/>
```

---

## IMPLEMENTATION ORDER

### Phase 1: Database Fixes (Day 1) - 2 hours
1. ✅ Create `tasks` table migration (#8)
2. ✅ Create `activities` table migration (#11)
3. ✅ Verify/create `campaign_comments` table (#14)
4. ✅ Verify/create `campaign_approvals` table (#16)
5. ✅ Verify/create `campaign_reward_configs` table (#15)

### Phase 2: Edge Function CORS Fix (Day 1) - 30 minutes
1. ✅ Add CORS headers to `save-campaign-draft` (#17)
2. ✅ Deploy updated function

### Phase 3: Campaign Create/Edit Fixes (Day 2) - 4 hours
1. ✅ Fix landing page "none" → null conversion (#17)
2. ✅ Fix date timezone handling (#17, #18)
3. ✅ Fix "Create Landing Page" button (#17)
4. ✅ Fix forms persistence (#17)
5. ✅ Fix query invalidation for sync (#18)

### Phase 4: Call Center Fixes (Day 2) - 2 hours
1. ✅ Fix default script UUID handling (#12)
2. ✅ Fix form state reset (#13)

### Phase 5: Dashboard & Polish (Day 3) - 2 hours
1. ✅ Add onboarding step navigation (#9)
2. ✅ Add sidebar search attributes (#10)

---

## CURSOR PROMPTS FOR EACH FIX

### Prompt 1: Create Missing Database Tables

```markdown
# TASK: Create Missing Database Tables

## Context
Issues #8 and #11 report missing tables: `public.tasks` and `public.activities`

## Instructions
1. Create a new migration file: `supabase/migrations/YYYYMMDD_create_tasks_activities_tables.sql`
2. Add CREATE TABLE statements for both tables with:
   - Standard UUID primary key
   - Appropriate columns based on UI requirements
   - Foreign keys to relevant tables (users, clients, campaigns, contacts)
   - RLS policies for client-scoped access
   - Proper indexes

## Tables to Create
- public.tasks (for issue #8)
- public.activities (for issue #11)

## After Creation
1. Apply migration: `supabase db push`
2. Test by visiting Tasks page and creating a task
3. Test by visiting Activities page and logging an activity

## Success Criteria
- No "table not found" errors
- Tasks can be created and listed
- Activities can be logged and listed
```

### Prompt 2: Fix CORS on save-campaign-draft

```markdown
# TASK: Fix CORS Headers on save-campaign-draft Edge Function

## Context
Issue #17 reports CORS preflight rejection when calling save-campaign-draft

## Instructions
1. Open `supabase/functions/save-campaign-draft/index.ts`
2. Add CORS headers constant at top of file
3. Add OPTIONS method handler for preflight
4. Add CORS headers to all response returns

## Required Headers
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
- Access-Control-Allow-Methods: POST, OPTIONS

## After Fix
1. Deploy: `supabase functions deploy save-campaign-draft`
2. Test: Create campaign and click "Save as Draft"

## Success Criteria
- No CORS errors in console
- Draft saves successfully
- Toast shows success message
```

### Prompt 3: Fix Campaign Landing Page UUID Issue

```markdown
# TASK: Fix Invalid UUID "none" Error in Campaign Creation

## Context
Issue #17: Selecting "None (skip for now)" for landing page sends "none" as UUID

## Instructions
1. Find campaign creation form component
2. Locate where landing_page_id is set in form data
3. Change logic to send null instead of "none"

## Search for files containing:
- "landing_page_id"
- "none"
- Landing page selection

## Fix Pattern
```typescript
// Change FROM:
landing_page_id: selectedLandingPage || 'none'
// Change TO:
landing_page_id: selectedLandingPage === 'none' || !selectedLandingPage ? null : selectedLandingPage
```

## Success Criteria
- Can create campaign with "None" landing page selected
- No "invalid input syntax for type uuid" error
- Campaign saves successfully
```

---

## VERIFICATION CHECKLIST

After all fixes are applied, verify each issue is resolved:

| Issue | Test Action | Expected Result |
|-------|------------|-----------------|
| #8 | Create task on Tasks page | Task created successfully |
| #9 | Click "Create your first template" | Navigates to mail page |
| #10 | Inspect sidebar search input | Has id and name attributes |
| #11 | Log activity on Activities page | Activity logged successfully |
| #12 | Edit default call script | Edit form populates, saves |
| #13 | Create script, cancel, edit another | Form shows correct data |
| #14 | Add comment to campaign | Comment persists after refresh |
| #15 | View Rewards tab on campaign | Data loads, no 400 error |
| #16 | View Approvals tab on campaign | Data loads, no 400 error |
| #17 | Create campaign with "None" landing page | Campaign created successfully |
| #18 | Edit campaign, change audience | Change persists in Details |

---

## NPM VULNERABILITIES FIX

**Run this to fix the 7 security vulnerabilities:**

```bash
# Fix non-breaking vulnerabilities:
npm audit fix

# If issues remain, update specific packages:
npm update vite esbuild glob js-yaml

# For react-syntax-highlighter (breaking change):
# Only if you're ready to test the UI thoroughly:
npm install react-syntax-highlighter@latest
```

---

**Document Created:** December 10, 2025  
**Next Step:** Begin Phase 1 - Database Fixes
