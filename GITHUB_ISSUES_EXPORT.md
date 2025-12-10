# GitHub Issues Export - Phillboard/mobul

**Exported:** December 10, 2025  
**Total Issues:** 11 Open, 0 Closed

---

## Issue #18: Edit Campaign — Multiple Functions Not Working / Not Saving

**Status:** Open  
**Updated:** ~21 hours ago

### Summary

Several components of the **Edit Campaign** workflow fail to load data, save changes, or correctly reflect updates in the campaign editor or campaign summary pages.
These issues impact campaign modification, data integrity, and user confidence in campaign management features.

---

### Affected Areas

* Campaign Details not loading correctly
* Editor showing stale or incorrect data
* Tracking & Analytics fields not updating
* Landing Page field desync
* Audience not updating in Editor
* Forms count displaying incorrectly
* Mail Date inconsistencies
* Workflow navigation issues

---

### Issues

#### 1. **Landing Page selection does not sync between Editor and Campaign Details**

When editing an existing campaign:

* The **selected landing page** in the editor shows one value.
* The **Campaign Details** page shows a **different landing page**.
* Refreshing sometimes changes which one appears, indicating inconsistent or partial saves.

This makes it unclear which landing page is actually attached to the campaign.

---

#### 2. **Tracking & Analytics — "Base Landing Page URL" does not save**

* Field accepts edits, but:

  * Value **does not persist** when saving the campaign.
  * Navigating away and returning clears the field.
* Editor and Campaign Details both fail to show updated values.

---

#### 3. **Forms display "0 fields" even when forms contain fields**

* In the Edit Campaign view, all connected forms show:

  ```
  0 fields
  ```
* ACE Forms correctly shows the actual field counts.
* Editing and reassigning forms does not update the field count.

This indicates the form metadata is not being loaded or referenced properly.

---

#### 4. **Mail Date inconsistencies after editing**

* Editing the Mail Date sometimes results in:

  * The Campaign Editor showing the correct date.
  * The Campaign Details page showing a date **one day earlier**.
* This mirrors the issue seen in Create Campaign, but also affects edits.

Likely a timezone or UTC conversion issue during save or render.

---

#### 5. **Audience not updating in Edit Campaign**

* Changing the audience on an existing campaign appears to save in the editor.
* Returning to Campaign Details shows the **old audience**.
* Refreshing the editor sometimes reverts to the previous audience as well.

---

#### 6. **Campaign Details page displays stale or unsaved values**

After editing a campaign:

* Several fields (landing page, mail date, audience, tracking settings) do not update in the Campaign Summary/Details page.
* The editor and summary page disagree on values.
* Refreshing may show different results, indicating inconsistent write operations.

---

#### 7. **Navigation away from the editor sometimes loses updated values**

* Clicking "Back" or navigating via the sidebar sometimes drops unsaved changes.
* No warning modal appears.
* Returning to the editor occasionally shows:

  * Blank fields
  * Old values
  * Partially updated values

---

### Expected Behavior

* All edits should save consistently and persist across both the Editor and Campaign Details.
* Changes should be reflected immediately and consistently across all views.
* Fields like landing page, mail date, audience, tracking settings, and forms should preserve updates reliably.
* Any desync between editor and details should not occur.
* Forms should show correct field counts.

---

### Impact

**High**

Users cannot reliably update existing campaigns.
Inconsistent UI state may cause incorrect campaigns to be sent, incorrect landing pages to be used, and misleading reporting data.

---

### Notes

* Multiple fields appear not to save due to missing update handlers, incorrect request payloads, or API schema mismatches.
* Some fields populate in the editor but fail to sync back to Campaign Details, suggesting either:

  * Updates are not being persisted, **or**
  * The Details view is querying incorrect or outdated fields.
* Mail Date discrepancies indicate time-zone conversion issues that affect both creation and editing workflows.
* Form metadata ("0 fields") likely indicates either:

  * Wrong join relationship,
  * Missing metadata fetch,
  * Or incorrect API select statements.

---

## Issue #17: Create Campaign — Numerous Issues (Multiple UI + Backend Failures)

**Status:** Open  
**Updated:** ~1 day ago

### Summary

Several components of the **Create Campaign** workflow fail to save, execute, or return required data.
Issues include non-responsive UI buttons, incorrect date handling, invalid UUID failures, CORS-blocked Edge Function calls, and non-persisting form selections.

These failures impact the ability to successfully create a new campaign under multiple common configurations.

---

### Affected Areas

* Create Landing Page button
* Landing Page selection
* Mail Date
* Save as Draft
* Forms section
* Tracking & Analytics Settings

---

### Issues

#### 1. **'Create Landing Page' button does nothing**

* Button highlights on hover but **does not respond** when clicked.
* No modal, no redirect, and no console output.

---

#### 2. **Mail Date shows incorrect date in Campaign Details**

* Behavior:

  * User selects a date (e.g., **12/07/2025**).
  * After saving the campaign:

    * **Campaign Details** shows **12/06/2025** (one day prior).
    * Campaign creator/editor still shows correct date (**12/07/2025**).

This indicates a save-time or display-time timezone/date-offset issue.

---

#### 3. **Selecting "None (skip for now)" for Landing Page prevents campaign creation**

##### UI behavior:

* After clicking **Create Campaign**, user receives a red toast:

```
Creation Failed
invalid input syntax for type uuid: "none"
```

##### Console errors:

**Error 1 — POST failure**

```
POST			index--cjwCUnS.js:481 
https://uibvxhwhkatjcwghnzpu.supabase.co/rest/v1/campaigns?columns=...
400 (Bad Request)
```

**Error 2 — Underlying Supabase response**

```
Failed to create campaign: 		logger-Bc3eZ4Bc.js:1
{code: '22P02', details: null, hint: null, message: 'invalid input syntax for type uuid: "none"'}
```

Landing page UUID is required, and "none" is sent as a UUID, causing server rejection.

---

#### 4. **Save as Draft fails due to CORS + Edge Function failure**

##### UI behavior:

* Clicking **Save as Draft** triggers a red toast:

```
Save Failed
Failed to send a request to the Edge Function
```

##### Console errors:

**Error 1 — CORS preflight rejection**

```
Access to fetch at
https://uibvxhwhkatjcwghnzpu.supabase.co/functions/v1/save-campaign-draft
from origin https://scaledbyai.com
has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
It does not have HTTP ok status.
```

**Error 2 — Edge Function request failure**

```
POST 
https://uibvxhwhkatjcwghnzpu.supabase.co/functions/v1/save-campaign-draft
net::ERR_FAILED
```

The Save Draft Edge Function cannot be called successfully.

---

#### 5. **Forms selection does not persist**

* Forms list displays correctly.
* User can select one or multiple forms.
* After saving or continuing, forms are **not populated** into the campaign.
* In the editor, all forms display **"0 fields"**, even though forms do contain fields in ACE Forms.

---

#### 6. **Tracking & Analytics: "Base Landing Page URL" does not save**

* Field accepts input.
* After saving or navigating forward/backwards:

  * The field **does not persist** the value.
  * Value is cleared upon returning to the section.

---

### Expected Behavior

* All form inputs, dropdown selections, and IDs should save correctly.
* Selecting "None" should not attempt to send invalid UUID values.
* The "Create Landing Page" button should trigger the correct workflow.
* Mail Date should display consistently across Creator, Details, and Editor.
* Save as Draft should successfully call the Edge Function without CORS blocks.
* Forms and Tracking fields should persist.

---

### Impact

**High**

Users may be **unable to create new campaigns**, or may create campaigns missing required data.
Workflow is disrupted during multiple common user paths.

---

### Notes

* Multiple failing endpoints indicate a combination of:

  * Invalid API parameters
  * Required foreign keys not being optional
  * Missing CORS configuration for Edge Functions
  * Unhandled null/placeholder logic in UI
  * Date handling/timezone conversion inconsistencies
* QA should retest once "None (skip for now)" logic, CORS headers, and Save Draft handler are fixed.

---

## Issue #16: Approvals Tab Fails to Load Campaign Approvals (Backend Failure)

**Status:** Open  
**Updated:** ~2 days ago

### Summary

When navigating to the **Approvals** tab on the **Campaign Summary** page, the browser console produces **400 Bad Request** errors while fetching approval data.

---

### Steps to Reproduce

1. Navigate to **Campaigns → All Campaigns**.
2. Open the **⋯** menu for any campaign and select **View Details**.
3. Click on the **Approvals** tab.
4. Observe:

   * Console shows two error messages.

---

### Console Messages

**Message 1:**

```
GET         index--cjwCUnS.js:481
https://uibvxhwhkatjcwghnzpu.supabase.co/rest/v1/campaign_approvals?select=…&campaign_id=eq.839247ae-9216-4985-a195-efee90d10846&order=created_at.desc
400 (Bad Request)
```

---

### Actual Behavior (UI)

* No error is displayed to the user in the interface.

---

### Actual Behavior (Backend/API)

* GET `/campaign_approvals` returns **400 Bad Request**.
* Backend prevents retrieval of approval data.

---

### Expected Behavior

* Campaign approvals should be retrieved successfully for the selected campaign.
* GET request should return a valid JSON payload with all approval entries.
* Approvals tab should render any entries.
* No 400 errors should occur.

---

### Impact

**Medium** — Users cannot view or manage campaign approvals, potentially blocking workflows for campaign review and publishing.

---

### Technical Notes

* Possible causes to investigate:

  * Invalid query parameters in the GET request.
  * Misconfigured column names or type mismatches (e.g., `campaign_id` vs UUID).
  * RLS (Row Level Security) policies blocking read access.
  * Schema mismatch between expected and actual table structure.

* Verify whether POST/PUT operations related to approvals are also affected.

* Confirm expected request payload and response shape.

---

## Issue #15: Rewards Tab Fails to Load Campaign Reward Configs (Backend Failure)

**Status:** Open  
**Updated:** ~2 days ago

### Summary

When navigating to the **Rewards** tab on the **Campaign Summary** page, the browser console produces **400 Bad Request** errors while fetching reward configuration data.

---

### Steps to Reproduce

1. Navigate to **Campaigns → All Campaigns**.
2. Open the **⋯** menu for any campaign and select **View Details**.
3. Click on the **Rewards** tab.
4. Observe:

   * Check console for errors (two messages are generated).

---

### Console Messages

**Message 1:**

```
GET         index--cjwCUnS.js:481
https://uibvxhwhkatjcwghnzpu.supabase.co/rest/v1/campaign_reward_configs?se…ards%2Cfailed_cards%29&campaign_id=eq.839247ae-9216-4985-a195-efee90d10846
400 (Bad Request)
```

---

### Actual Behavior (UI)

* Rewards tab appears to load campaign reward configuration data.
* No error is displayed to the user in the interface.

---

### Actual Behavior (Backend/API)

* GET `/campaign_reward_configs` returns **400 Bad Request**.
* Backend prevents retrieval of reward configuration data.

---

### Expected Behavior

* Reward configuration data for the selected campaign should be retrieved successfully.
* GET request should return a valid JSON payload containing all reward settings.
* UI should render all reward information correctly.
* No 400 errors should occur.

---

### Impact

**Medium** — Users cannot view or manage campaign reward settings, which may block campaign setup or monitoring workflows.

---

### Technical Notes

* Possible causes to investigate:

  * Invalid query parameters in the GET request.
  * Misconfigured column names or type mismatches (e.g., `campaign_id` vs. UUID).
  * RLS (Row Level Security) policies blocking read access.
  * Schema mismatch between expected and actual table structure.

* Verify if POST/PUT operations related to campaign rewards are also affected.

* Confirm expected request payload and response shape.

---

## Issue #14: Comments Not Persisting in Campaign Details (UI + Backend Failure)

**Status:** Open  
**Updated:** ~2 days ago

### Summary

When adding a comment in **Campaign Details → Comments**, the UI displays a success toast and shows a temporary loading state, but the comment never appears.
A backend request fails with **400 Bad Request**, preventing comments from being retrieved (and possibly preventing creation as well).

This issue covers **both the UI behavior and the backend/API failure** since both contribute to the broken feature.

---

### Steps to Reproduce

1. Navigate to **Campaigns → All Campaigns**.
2. Open the **⋯** menu for any campaign and select **View Details**.
3. Go to the **Comments** tab.
4. Enter a comment and click **Post Comment**.
5. Observe:

   * Toast shows **"Comment added"**
   * UI briefly shows **"Loading comments…"**
   * Comments list returns to **"No comments yet"**
   * Check console for errors (four messages are generated)

---

### Actual Behavior (UI)

* UI shows a success message even though persistence fails.
* Comments never render in the list.
* Refreshing the page shows no comments.
* UI does not display any error to the user.
* UI continues behaving as if the operation succeeded.

---

### Actual Behavior (Backend/API)

* GET `/campaign_comments` returns **400 Bad Request**.
* POST may be silently failing, resulting in no inserted record.

---

### Expected Behavior

* Comment should be persisted to the database.
* GET request should successfully return comments for the given campaign.
* Newly added comment should appear immediately in chronological order.
* Toast should only show after a confirmed successful insert.
* No 400 errors should occur.

---

### Impact

**Medium** — Users are unable to store campaign-related notes or history, breaking a key workflow and causing data loss.

---

### Technical Notes (UI + Backend Combined)

#### Frontend issues

* UI displays success before confirming DB insertion.
* UI does not handle or surface failures from POST or GET.
* Comments list reloads but cannot render because the backend response is invalid.

#### Backend issues

* GET `/campaign_comments` returns **400 Bad Request**.
* Possible causes to investigate:

  * Invalid query parameter(s)
  * Misconfigured column name for `campaign_id`
  * Campaign ID type mismatch (uuid vs text)
  * RLS blocking read access
  * RLS blocking write access, causing silent POST failure
  * Schema mismatch between expected and actual table structure

#### Additional considerations

* Check whether POST is silently failing, resulting in no inserted record.
* Validate RLS policies for both `select` and `insert` on `campaign_comments`.
* Confirm expected request payload and response shape.

---

## Issue #13: Bug: Call Scripts Forms Do Not Pre-Populate and Retain Stale Data

**Status:** Open  
**Updated:** ~2 days ago

### Description

On the **Call Scripts** page under the **Call Center** menu:

1. **Edit Script forms for user-created scripts** do not pre-populate with the script's existing data.

   * Users must re-enter the script name, type, and content even when editing an existing script.
   * Updates made to the script do save successfully and do not trigger errors.

2. **Stale data retention** occurs across script forms:

   * Any data entered in **Create Script** or **Edit Script** forms persists if the form is closed without refreshing the page (e.g., via Cancel, submitting the form, or clicking the background).
   * Example:

     1. Click **Create Script** → fill in all fields → click **Cancel**.
     2. Click **Edit Script** for any script.
     3. The form contains the previously entered data from the canceled Create Script form.
   * Data only clears after a page refresh or navigation away from and back to the page.

---

### Steps to Reproduce

1. Navigate to **Call Center → Call Scripts**.
2. Click **Create Script** and fill in all fields.
3. Close the form (Cancel, submit, or click background).
4. Open **Edit Script** for any script.
5. Observe that the form contains the previously entered data from the Create Script form.
6. Refresh the page and reopen any form to see that the fields are now empty.
7. Repeat with user-created scripts to confirm that edit forms do not pre-populate.

---

### Actual Result

* Edit forms for user-created scripts are empty instead of showing existing script data.
* Previously entered data persists across forms until a page refresh.

---

### Expected Result

* Edit forms should load the correct data for the selected script.
* Form fields should not retain unrelated previously entered data after closing a form.
* Only the data relevant to the current script or new creation should appear.

---

### Impact

**Medium —** Users may accidentally overwrite or reuse stale data and must re-enter information when editing scripts, leading to confusion and decreased efficiency.

---

### Notes

* Likely a frontend state management issue where form state is not reset or correctly initialized when opening edit or create forms.
* May involve improper handling of local component state or global state caching.
* No backend errors occur; functionality to save updates works as expected once data is submitted.

---

## Issue #12: Bug: Call Scripts Edit Fails — Default Script Data Not Loaded and UUID Error

**Status:** Open  
**Updated:** ~2 days ago

### Description

On the **Call Scripts** page under the **Call Center** menu, there are 4 default scripts provided automatically to users.

When attempting to edit any of these default scripts:

* The edit form does **not pre-populate** with the script's existing data (script name, script type dropdown, or script content).
* Submitting the form by clicking **Update Script** triggers an error toast:

  ```
  Failed to update script: invalid input syntax for type uuid: "default-greeting"
  ```
* A console error is also logged:

  ```
  PATCH                                index--cjwCUnS.js:481  
  https://uibvxhwhkatjcwghnzpu.supabase.co/rest/v1/call_center_scripts?id=eq.default-greeting&select=*
  400 (Bad Request)
  ```

---

### Steps to Reproduce

1. Navigate to **Call Center → Call Scripts**.
2. Click **Edit** on any of the default scripts.
3. Observe that the form does not load existing script data.
4. Fill in new information in the form fields.
5. Click **Update Script**.
6. Observe the error toast and check the console for errors.

---

### Actual Result

* Edit form shows empty fields, identical to "Create Script" form.
* Update attempt triggers a toast error:

  ```
  Failed to update script: invalid input syntax for type uuid: "default-greeting"
  ```
* Console logs a 400 Bad Request for the PATCH request with `id=eq.default-greeting`.

---

### Expected Result

* The edit form should pre-populate with the default script's name, type, and content.
* Users should be able to update and save the default scripts without errors.
* No 400 errors or invalid UUID messages should appear.

---

### Impact

**High —** Users cannot edit default call scripts, which prevents customization of essential workflow templates and affects call center operations.

---

### Notes

* Likely causes: frontend may be treating default scripts differently from regular scripts, using a string ID (`default-greeting`) where a UUID is expected.
* Edit form may not fetch or populate default script data correctly.
* Backend endpoint may not accept string-based IDs for PATCH requests.

---

## Issue #11: Bug: Log Activity Fails — Missing `public.activities` Table

**Status:** Open  
**Updated:** ~4 days ago

### Summary
Submitting the **Log Activity** form on the **Activities** page fails. A red toast appears stating that Supabase cannot find the `public.activities` table in the schema cache, and the activity does not save.

### Steps to Reproduce
1. Go to the **Activities** page.  
2. Click **Log Activity**.  
3. Fill out all required fields.  
4. Click **Log Activity** at the bottom of the form.

### Expected Behavior
- Activity is successfully inserted into the `public.activities` table.  
- A confirmation or success toast appears.

### Actual Behavior
A red toast shows:

```
Error Could not find the table 'public.activities' in the schema cache
```

Console errors:

```
POST https://uibvxhwhkatjcwghnzpu.supabase.co/rest/v1/activities?select=* 404 (Not Found)
```

```
{
  code: 'PGRST205',
  details: null,
  hint: "Perhaps you meant the table 'public.agencies'",
  message: "Could not find the table 'public.activities' in the schema cache"
}
```

### Possible Causes
- The `public.activities` table does not exist.  
- The table exists but is missing from the schema cache due to:
  - Incorrect schema  
  - Migration not applied  
  - Name mismatch (`activities` vs something else)  
  - RLS or permissions hiding the table  
- The frontend references the wrong table name.

### Requested Resolution
- Verify that the `public.activities` table exists.  
- Ensure migrations for this table were applied successfully.  
- Refresh Regenerated API schema cache if required.  
- Confirm correct table name in the frontend code.  
- Confirm appropriate RLS policies and permissions.

---

## Issue #10: Sidebar search bar "Search Menu" missing id/name attribute — form field not properly defined

**Status:** Open  
**Updated:** ~4 days ago

### Description  
On all pages where the sidebar menu is visible (e.g. Dashboard, Campaigns, Mail Library, Landing Pages, Ace Forms, Contacts, Lists & Segments, Import Contacts, Gift Card Inventory, Purchase Gift Cards, Redemption Center, Call Scripts, Tasks, Integrations, Client Management, User Management, System Health, Audit Log, Site Directory, etc.), the sidebar includes a search bar labeled **"Search Menu"**. That input element has **neither an `id` nor a `name` attribute**. Chrome DevTools reports:  
> "A form field element should have an id or name attribute."  

This omission may prevent proper form handling, browser autocomplete, and potentially break form submission logic.

---

### Steps to Reproduce  
1. Log in to the application.  
2. Ensure the sidebar menu is visible (on any page listed above).  
3. Inspect the sidebar search input element using browser dev tools.  
4. Observe that the input element lacks both `id` and `name` attributes.  

---

### Actual Result  
- The search input element is rendered without `id` or `name`.  
- Chrome DevTools warning about missing field identifier appears.  
- Browser autocomplete / form-binding behaviors are unreliable or broken.  

---

### Expected Result  
- The sidebar search input should include a unique `id` or `name` attribute (or both), so the form is properly defined.  
- Form behaviors like submission, autocomplete, accessibility, and automated testing should work correctly.  

---

### Impact  
**Medium — UX / Accessibility / Form-Functionality**. Sidebar search may not work consistently, browser autocomplete disabled, automated tests or screen readers may not detect the form field.  

---

### Suggested Fix / Notes  
- Update the sidebar search component to include a valid `name` and/or `id` attribute on the search input element.  
- Ensure uniqueness of the attribute values when multiple forms or search inputs exist.  
- Run accessibility audits (keyboard navigation, form submission, screen-reader compatibility) to confirm fix.  
- Add a test case to verify presence of required attributes (`id` or `name`) on all form inputs across the app.  

---

## Issue #9: Dashboard "Getting Started" steps are not actionable

**Status:** Open  
**Updated:** ~4 days ago

### Description  
On the Dashboard, after account creation and sign-in, the "Getting Started" section lists the following steps:  
- Set up your organization  
- Create your first template  
- Upload an audience  
- Create a campaign  
- Build a landing page  

None of these items are clickable or navigable; the buttons/links do not take the user to the respective pages to complete the steps. As a result, new users are unable to proceed through the onboarding flow.

---

### Steps to Reproduce  
1. Create a new user account and sign in.  
2. Observe the Dashboard "Getting Started" list.  
3. Attempt to click any of the listed steps (e.g. "Create your first template", "Upload an audience", etc.).  

---

### Actual Result  
- Clicking any of the steps does nothing — the user remains on the Dashboard.  
- No navigation or page load occurs; the onboarding steps cannot be completed.  

---

### Expected Result  
- Each item in the "Getting Started" list should be a clickable link or button that navigates the user to the correct page or wizard to complete that step (e.g. template creation, audience upload, campaign creation, landing-page builder).  
- After completing a step, the Dashboard should reflect progress (e.g. mark the step as done or remove it).  

---

### Impact  
**Critical** — new users cannot proceed with core workflows (template creation, campaign setup, landing page build, etc.), effectively blocking onboarding.

---

## Issue #8: Tasks — Create Task fails due to missing table

**Status:** Open  
**Updated:** ~5 days ago

### Description  
On the Tasks page, using the "Create Task" form always results in an error indicating a missing database table, despite valid input. No task is created, and functionality is broken.

---

### Steps to Reproduce  
1. Navigate to the **Tasks** page.  
2. Click **Create Task** to open the task creation form.  
3. Fill in valid task information in the form fields.  
4. Click the **Create Task** button to submit.

---

### Actual Result  
- A red toast appears with the message:  
  `Error: Could not find the table 'public.tasks' in the schema cache.`  
- No new task is created; the task list remains unchanged.

---

### Expected Result  
- The new task should be persisted to the backend.  
- The created task should immediately appear in the task list.  
- No schema-related error messages should occur.

---

### Impact  
**High (P1):** Task creation is completely broken — users cannot create tasks, which likely prevents critical functionality.

---

### Suggested Fix / Notes  
- Verify that the `public.tasks` table exists in the database schema and has been migrated properly.  
- Confirm that the backend schema cache is up to date and being used correctly by the API.  
- Ensure the API endpoint being called by the frontend is pointing to the correct table and schema.  
- Add appropriate error handling in the frontend to surface any backend or schema-related failures in a more descriptive manner.  

---

# Summary by Priority

## High Priority (Blocking)
- **#18** - Edit Campaign — Multiple Functions Not Working / Not Saving
- **#17** - Create Campaign — Numerous Issues (Multiple UI + Backend Failures)
- **#12** - Call Scripts Edit Fails — Default Script Data Not Loaded and UUID Error
- **#9** - Dashboard "Getting Started" steps are not actionable
- **#8** - Tasks — Create Task fails due to missing table

## Medium Priority
- **#16** - Approvals Tab Fails to Load Campaign Approvals
- **#15** - Rewards Tab Fails to Load Campaign Reward Configs
- **#14** - Comments Not Persisting in Campaign Details
- **#13** - Call Scripts Forms Do Not Pre-Populate and Retain Stale Data
- **#11** - Log Activity Fails — Missing `public.activities` Table
- **#10** - Sidebar search bar missing id/name attribute
