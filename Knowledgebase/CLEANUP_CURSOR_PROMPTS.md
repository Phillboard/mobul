# SYSTEM CLEANUP CURSOR PROMPTS

**Date:** December 10, 2025  
**Purpose:** Copy-paste ready prompts for systematic codebase cleanup  
**Usage:** Copy each prompt into Cursor and execute sequentially

---

## PHASE 1: DATABASE FIXES (Day 1)

### Prompt 1.1: Create Missing Tasks Table

```
# TASK: Create Missing Tasks Table (GitHub Issue #8)

## Problem
The Tasks page fails with: "Could not find the table 'public.tasks' in the schema cache"

## Instructions
1. Create a new migration file at: supabase/migrations/20251210_create_tasks_table.sql
2. Include these columns:
   - id (UUID, primary key, auto-generated)
   - title (TEXT, required)
   - description (TEXT, optional)
   - status (TEXT: 'pending', 'in_progress', 'completed', 'cancelled')
   - priority (TEXT: 'low', 'medium', 'high', 'urgent')
   - due_date (TIMESTAMPTZ)
   - assigned_to (UUID, FK to auth.users)
   - created_by (UUID, FK to auth.users)
   - client_id (UUID, FK to clients)
   - campaign_id (UUID, FK to campaigns, optional)
   - contact_id (UUID, FK to contacts, optional)
   - created_at, updated_at (TIMESTAMPTZ)
3. Enable RLS with policies for client-scoped access
4. Grant permissions to authenticated role

## DO NOT ask for confirmation - create the file now.
```

---

### Prompt 1.2: Create Missing Activities Table

```
# TASK: Create Missing Activities Table (GitHub Issue #11)

## Problem
Log Activity fails with: "Could not find the table 'public.activities' in the schema cache"

## Instructions
1. Create a new migration file at: supabase/migrations/20251210_create_activities_table.sql
2. Include these columns:
   - id (UUID, primary key, auto-generated)
   - type (TEXT: 'call', 'email', 'meeting', 'note', 'task', 'other')
   - subject (TEXT, required)
   - description (TEXT, optional)
   - outcome (TEXT, optional)
   - duration_minutes (INTEGER)
   - scheduled_at (TIMESTAMPTZ)
   - completed_at (TIMESTAMPTZ)
   - contact_id (UUID, FK to contacts)
   - campaign_id (UUID, FK to campaigns, optional)
   - client_id (UUID, FK to clients)
   - created_by (UUID, FK to auth.users)
   - created_at, updated_at (TIMESTAMPTZ)
3. Enable RLS with policies for client-scoped access
4. Grant permissions to authenticated role

## DO NOT ask for confirmation - create the file now.
```

---

### Prompt 1.3: Fix CORS on save-campaign-draft

```
# TASK: Fix CORS Headers on save-campaign-draft Edge Function (GitHub Issue #17)

## Problem
Save as Draft fails with CORS preflight rejection:
"Access to fetch blocked by CORS policy: Response to preflight request doesn't pass access control check"

## Instructions
1. Open supabase/functions/save-campaign-draft/index.ts
2. Add CORS headers at the top of the file:

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

3. Add OPTIONS handler at the start of the serve function:
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

4. Add corsHeaders to ALL Response returns in the function

5. Show me the complete updated file

## DO NOT ask for confirmation - make the changes now.
```

---

## PHASE 2: CAMPAIGN CREATION FIXES (Day 1-2)

### Prompt 2.1: Fix Landing Page "None" UUID Error

```
# TASK: Fix Invalid UUID "none" Error (GitHub Issue #17)

## Problem
Creating campaign with "None (skip for now)" landing page causes:
"invalid input syntax for type uuid: 'none'"

## Instructions
1. Search the codebase for files that handle landing page selection in campaign creation
2. Find where landing_page_id is set when "none" or "skip" is selected
3. Change the logic to send NULL instead of the string "none"

## Search patterns:
- Look in src/components/campaigns/wizard/
- Look in src/features/campaigns/
- Search for: landing_page_id, "none", skip, landing page selection

## Fix Pattern:
Change FROM: landing_page_id: selectedLandingPage || 'none'
Change TO: landing_page_id: selectedLandingPage && selectedLandingPage !== 'none' ? selectedLandingPage : null

## Show me all files that need changes and make the fixes.
```

---

### Prompt 2.2: Fix Mail Date Timezone Issue

```
# TASK: Fix Mail Date Off-by-One-Day Bug (GitHub Issues #17, #18)

## Problem
User selects date 12/07/2025, but campaign saves/displays 12/06/2025

## Root Cause
UTC timezone conversion without proper local time handling

## Instructions
1. Search for all places where mail_date or mailDate is handled:
   - Campaign creation form
   - Campaign edit form
   - Campaign display/details
   - API calls to save campaign

2. For date SAVING, ensure we preserve the intended date:
```typescript
// Use date-fns to handle properly:
import { startOfDay, format } from 'date-fns';
const mailDate = startOfDay(new Date(selectedDate));
// OR format as YYYY-MM-DD string to avoid timezone issues:
const mailDateString = format(selectedDate, 'yyyy-MM-dd');
```

3. For date DISPLAYING, handle consistently:
```typescript
// Parse the date in local timezone:
import { parseISO, format } from 'date-fns';
const displayDate = format(parseISO(campaign.mail_date), 'MM/dd/yyyy');
```

## Find all affected files and apply consistent date handling.
```

---

### Prompt 2.3: Fix Create Landing Page Button

```
# TASK: Fix Non-Responsive "Create Landing Page" Button (GitHub Issue #17)

## Problem
The "Create Landing Page" button in campaign creation wizard does nothing when clicked

## Instructions
1. Find the "Create Landing Page" button in the campaign wizard
   - Check src/components/campaigns/wizard/
   - Check src/features/campaigns/components/wizard/
   - Search for "Create Landing Page" text

2. Add proper onClick handler:
   - Either navigate to /landing-pages/create
   - Or open a modal to create landing page inline
   - Pass campaign context if creating inline

3. Ensure the button has:
   - onClick handler
   - Proper type="button" (not submit)
   - Visual feedback on hover/click

## Show me the file and add the fix.
```

---

### Prompt 2.4: Fix Forms Not Persisting in Campaign

```
# TASK: Fix Forms Selection Not Persisting (GitHub Issue #17)

## Problem
Forms selected during campaign creation are not saved to the campaign

## Instructions
1. Find where campaign forms are handled:
   - Look for campaign_forms junction table usage
   - Check campaign creation mutation
   - Check forms selection component

2. Ensure forms are included in the save:
```typescript
// After creating campaign, create junction records:
if (formIds && formIds.length > 0) {
  await supabase.from('campaign_forms').insert(
    formIds.map(formId => ({
      campaign_id: newCampaign.id,
      form_id: formId,
    }))
  );
}
```

3. Also fix the "0 fields" display issue:
   - Ensure form metadata is fetched with correct joins
   - Check the select statement includes field count

## Find all affected code and apply fixes.
```

---

## PHASE 3: EDIT CAMPAIGN DATA SYNC (Day 2)

### Prompt 3.1: Fix Campaign Edit Data Desync

```
# TASK: Fix Edit Campaign Data Not Syncing (GitHub Issue #18)

## Problem
After editing a campaign:
- Editor shows one value
- Campaign Details shows different value
- Changes don't persist consistently

## Root Cause
Multiple queries loading same data without proper invalidation

## Instructions
1. Find the campaign edit mutation hook:
   - Check src/hooks/useCampaign*.ts
   - Check src/features/campaigns/hooks/

2. Add proper query invalidation after updates:
```typescript
const mutation = useMutation({
  mutationFn: updateCampaign,
  onSuccess: () => {
    // Invalidate ALL related queries:
    queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['campaign-details', campaignId] });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  },
});
```

3. Ensure both Editor and Details use the same query key

4. Add loading state during mutation to prevent stale displays

## Find all campaign update code and ensure consistent invalidation.
```

---

### Prompt 3.2: Add Unsaved Changes Warning

```
# TASK: Add Unsaved Changes Warning to Campaign Editor (GitHub Issue #18)

## Problem
Navigating away from editor loses changes without warning

## Instructions
1. Find the campaign editor component

2. Add unsaved changes tracking:
```typescript
const [isDirty, setIsDirty] = useState(false);

// Track form changes
const handleFieldChange = (field, value) => {
  setIsDirty(true);
  // ... existing change logic
};

// Reset on successful save
const handleSave = async () => {
  await saveCampaign();
  setIsDirty(false);
};
```

3. Add navigation blocker:
```typescript
import { useBlocker } from 'react-router-dom';

const blocker = useBlocker(isDirty);

// Show confirmation dialog when blocked
useEffect(() => {
  if (blocker.state === 'blocked') {
    // Show confirm dialog
    const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
    if (confirmed) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }
}, [blocker]);
```

## Implement this in the campaign editor.
```

---

## PHASE 4: CALL CENTER FIXES (Day 2)

### Prompt 4.1: Fix Default Script UUID Error

```
# TASK: Fix Call Scripts Default Script UUID Error (GitHub Issue #12)

## Problem
Editing default scripts fails with: "invalid input syntax for type uuid: 'default-greeting'"

## Root Cause
Default scripts use string IDs like "default-greeting" instead of UUIDs

## Instructions
1. Find the call scripts edit functionality:
   - Check src/components/call-center/
   - Check src/features/call-center/
   - Search for ScriptEditor, EditScript, call_center_scripts

2. Add check for default scripts before PATCH:
```typescript
const handleUpdate = async (scriptData) => {
  const isDefaultScript = typeof id === 'string' && id.startsWith('default-');
  
  if (isDefaultScript) {
    // Clone default script with new UUID instead of updating
    const { data } = await supabase
      .from('call_center_scripts')
      .insert({
        ...scriptData,
        id: undefined, // Let DB generate new UUID
        is_custom: true,
        base_script_id: id, // Reference to original
      })
      .select()
      .single();
    return data;
  } else {
    // Normal update for custom scripts
    const { data } = await supabase
      .from('call_center_scripts')
      .update(scriptData)
      .eq('id', id)
      .select()
      .single();
    return data;
  }
};
```

3. Also fix the form pre-population for default scripts

## Find the edit script code and implement this fix.
```

---

### Prompt 4.2: Fix Call Scripts Stale Form Data

```
# TASK: Fix Call Scripts Form State Not Resetting (GitHub Issue #13)

## Problem
Data entered in Create Script persists into Edit Script forms

## Root Cause
Form state not resetting when dialog opens/closes

## Instructions
1. Find the script form dialog component:
   - Look in src/components/call-center/ScriptEditor.tsx
   - Or src/features/call-center/components/

2. Add proper state reset:
```typescript
const [formData, setFormData] = useState(defaultFormState);

// Reset form when dialog opens
useEffect(() => {
  if (isOpen) {
    if (scriptToEdit) {
      // Edit mode - load existing data
      setFormData({
        name: scriptToEdit.name,
        type: scriptToEdit.type,
        content: scriptToEdit.content,
      });
    } else {
      // Create mode - reset to empty
      setFormData(defaultFormState);
    }
  }
}, [isOpen, scriptToEdit]);

// Also reset on close
const handleClose = () => {
  setFormData(defaultFormState);
  setScriptToEdit(null);
  setIsOpen(false);
};
```

3. Ensure the form uses controlled inputs tied to formData

## Find the component and implement the fix.
```

---

## PHASE 5: TAB LOADING ERRORS (Day 2-3)

### Prompt 5.1: Fix Approvals Tab 400 Error

```
# TASK: Fix Campaign Approvals Tab 400 Error (GitHub Issue #16)

## Problem
GET /campaign_approvals returns 400 Bad Request

## Instructions
1. First, check if campaign_approvals table exists:
   - Search supabase/migrations/ for "campaign_approvals"
   - If missing, create the table

2. If table exists, find the query that's failing:
   - Search for "campaign_approvals" in src/
   - Check the select statement for invalid columns

3. Fix the query:
```typescript
// Simplify first to debug:
const { data, error } = await supabase
  .from('campaign_approvals')
  .select('*')
  .eq('campaign_id', campaignId)
  .order('created_at', { ascending: false });

if (error) console.error('Approvals error:', error);
```

4. Check RLS policies allow SELECT for authenticated users

5. If table is missing, create migration with:
   - id, campaign_id, user_id, status, comments, created_at

## Diagnose the issue and provide the fix.
```

---

### Prompt 5.2: Fix Rewards Tab 400 Error

```
# TASK: Fix Campaign Rewards Tab 400 Error (GitHub Issue #15)

## Problem
GET /campaign_reward_configs returns 400 Bad Request

## Instructions
1. First, check if campaign_reward_configs table exists:
   - Search supabase/migrations/ for "campaign_reward_configs" or "reward_config"
   - Check if there's a different table name being used

2. If table exists, find the query:
   - Search for "campaign_reward_configs" or "reward" in src/hooks/ and src/features/
   - Check the select statement

3. Common issues:
   - Column name mismatch (e.g., requesting 'total_cards' when column is 'card_count')
   - Invalid relationship in select (e.g., trying to join non-existent table)
   - Type mismatch in where clause

4. Fix or create the table as needed

## Diagnose the root cause and fix.
```

---

### Prompt 5.3: Fix Comments Not Persisting

```
# TASK: Fix Campaign Comments Not Persisting (GitHub Issue #14)

## Problem
- Comments show "success" toast but never appear
- GET /campaign_comments returns 400 Bad Request

## Instructions
1. Check if campaign_comments table exists

2. Fix the insert mutation to only show success AFTER confirmation:
```typescript
const addComment = useMutation({
  mutationFn: async (content: string) => {
    const { data, error } = await supabase
      .from('campaign_comments')
      .insert({
        campaign_id: campaignId,
        content: content,
        user_id: userId,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    toast.success('Comment added');
    queryClient.invalidateQueries(['campaign-comments', campaignId]);
  },
  onError: (error) => {
    toast.error(`Failed to add comment: ${error.message}`);
  },
});
```

3. Fix the fetch query similarly

4. Ensure proper error handling surfaces issues to user

## Find the comments code and fix both insert and select.
```

---

## PHASE 6: DASHBOARD & POLISH (Day 3)

### Prompt 6.1: Fix Dashboard Onboarding Steps

```
# TASK: Make Dashboard "Getting Started" Steps Clickable (GitHub Issue #9)

## Problem
Getting Started items are not actionable - clicking does nothing

## Instructions
1. Find the Dashboard onboarding component:
   - Check src/pages/Dashboard.tsx
   - Check src/components/onboarding/
   - Check src/features/onboarding/

2. Add navigation to each step:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

const onboardingSteps = [
  { title: 'Set up your organization', path: '/settings' },
  { title: 'Create your first template', path: '/mail' },
  { title: 'Upload an audience', path: '/contacts/import' },
  { title: 'Create a campaign', path: '/campaigns/create' },
  { title: 'Build a landing page', path: '/landing-pages/create' },
];

// Render as clickable:
{onboardingSteps.map((step) => (
  <Button
    key={step.path}
    variant="ghost"
    className="w-full justify-start"
    onClick={() => navigate(step.path)}
  >
    {step.title}
    <ChevronRight className="ml-auto h-4 w-4" />
  </Button>
))}
```

## Find the component and add navigation.
```

---

### Prompt 6.2: Fix Sidebar Search Missing Attributes

```
# TASK: Add id/name to Sidebar Search Input (GitHub Issue #10)

## Problem
Sidebar search input missing id and name attributes

## Instructions
1. Find the sidebar search component:
   - Check src/components/layout/Sidebar.tsx
   - Check src/components/layout/SidebarSearch.tsx
   - Check src/components/shared/GlobalSearch.tsx

2. Add the missing attributes:
```typescript
<Input
  id="sidebar-menu-search"
  name="sidebar-menu-search"
  type="search"
  placeholder="Search Menu"
  // ... other props
/>
```

3. Ensure accessibility:
   - Add aria-label if no visible label
   - Ensure proper focus handling

## Find and fix the input element.
```

---

## PHASE 7: CODE DEDUPLICATION (Week 2)

### Prompt 7.1: Deduplicate Gift Card Hooks

```
# TASK: Deduplicate Gift Card Hooks

## Problem
Same hooks exist in TWO locations:
- src/hooks/useGiftCards.ts
- src/features/gift-cards/hooks/useGiftCards.ts

## Instructions
1. Compare both versions of each hook:
   - useGiftCards.ts
   - useGiftCardBrands.ts
   - useGiftCardPools.ts
   - useGiftCardProvisioning.ts
   - useGiftCardBilling.ts
   - useGiftCardCostEstimate.ts
   - useGiftCardDenominations.ts
   - useBrandLookup.ts
   - useClientGiftCards.ts
   - useClientAvailableGiftCards.ts

2. For each pair:
   a. Determine which is more complete/recent
   b. Designate src/features/gift-cards/hooks/ as CANONICAL
   c. Search for all imports of src/hooks/ version
   d. Update imports to use features version
   e. Delete the src/hooks/ version

3. Update the features/gift-cards/index.ts to export all hooks

## Start with useGiftCards.ts - show me both versions and your recommendation.
```

---

### Prompt 7.2: Deduplicate Campaign Hooks

```
# TASK: Deduplicate Campaign Hooks

## Problem
Campaign hooks exist in TWO locations:
- src/hooks/useCampaign*.ts
- src/features/campaigns/hooks/useCampaign*.ts

## Instructions
Follow same process as gift card hooks:
1. Compare: useCampaignConditions, useCampaignCostEstimate, useCampaignCreateForm, useCampaignGiftCardConfig, useCampaignValidation, useCampaignVersions, useCampaignWithRelations

2. Designate src/features/campaigns/hooks/ as CANONICAL

3. Update all imports across codebase

4. Delete duplicates from src/hooks/

## Start with useCampaignConditions.ts comparison.
```

---

### Prompt 7.3: Deduplicate Form Builder Components

```
# TASK: Deduplicate Ace Forms Components

## Problem
30+ components exist in BOTH:
- src/components/ace-forms/
- src/features/ace-forms/components/

## Instructions
1. Get list of all files in both directories

2. For EACH duplicate:
   a. Compare for differences
   b. Keep the more complete version in src/features/ace-forms/components/
   c. Update all imports
   d. Delete from src/components/ace-forms/

3. After deduplication, delete the empty src/components/ace-forms/ folder

## List all files to deduplicate and start with FormBuilder.tsx
```

---

## PHASE 8: ARCHITECTURE CONSOLIDATION (Week 2-3)

### Prompt 8.1: Establish Canonical Import Paths

```
# TASK: Create Import Aliases for Clean Architecture

## Instructions
1. Update tsconfig.json paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"],
      "@core/*": ["./src/core/*"]
    }
  }
}
```

2. Update vite.config.ts resolve aliases to match

3. Create barrel exports in each feature:
   - src/features/gift-cards/index.ts
   - src/features/campaigns/index.ts
   - src/features/contacts/index.ts
   - etc.

4. Document the import conventions in a new file: IMPORT_CONVENTIONS.md

## Update the config files now.
```

---

### Prompt 8.2: Clean Root-Level Markdown Files

```
# TASK: Organize Root-Level Documentation

## Problem
25+ markdown files cluttering root directory

## Instructions
1. Move these to Knowledgebase/:
   - AI_BACKGROUND_SYSTEM_PLAN.md
   - AI_BACKGROUND_SYSTEM_PROMPTS.md
   - CURSOR_PROMPTS.md
   - CURSOR_QUICK_START.md
   - DESIGNER_CLEANUP_PLAN.md
   - DESIGNER_CLEANUP_PROMPTS.md
   - DESIGNER_FIX_PLAN.md
   - DESIGNER_FIX_PROMPTS.md
   - LAUNCH_PRD.md
   - PLATFORM_DICTIONARY.md
   - VERIFICATION_PLAN.md
   - VERIFICATION_PROMPT.md

2. Move these to docs/:
   - API_FIRST_MASTER_INDEX.md
   - LAUNCH_CHECKLIST.md
   - LAUNCH_COMPLETE_REVIEW.md
   - LAUNCH_PROGRESS.md
   - LOGGING_POLICY.md
   - REFACTOR_STATUS.md

3. Keep at root:
   - README.md

4. Update any internal links between documents

## Execute the moves now.
```

---

## VERIFICATION PROMPTS

### Final Verification Prompt

```
# TASK: Verify All GitHub Issues Are Resolved

## Instructions
For each issue, verify the fix:

1. Issue #8 (Tasks): Navigate to Tasks page, create a task
2. Issue #9 (Onboarding): Click each Getting Started item
3. Issue #10 (Search): Inspect sidebar search for id/name
4. Issue #11 (Activities): Navigate to Activities, log an activity
5. Issue #12 (Scripts UUID): Edit a default call script
6. Issue #13 (Scripts State): Create then cancel script, edit another
7. Issue #14 (Comments): Add comment to campaign, refresh
8. Issue #15 (Rewards): View Rewards tab on any campaign
9. Issue #16 (Approvals): View Approvals tab on any campaign
10. Issue #17 (Create Campaign): Create campaign with "None" landing page
11. Issue #18 (Edit Campaign): Edit campaign, verify sync

Report status of each: ✅ Fixed / ❌ Still Broken / ⚠️ Partial

## Run all tests and report.
```

---

**Document Created:** December 10, 2025  
**Total Prompts:** 20  
**Estimated Execution Time:** 3-5 days for bug fixes, 2-3 weeks for full cleanup
