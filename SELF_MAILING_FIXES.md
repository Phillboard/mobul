# Self-Mailing Campaign Improvements

## Summary of Changes

This document outlines all improvements made to the self-mailing campaign workflow.

## 1. Campaign List Display Improvements

### Hidden Unnecessary Information for Self-Mailers

**File**: `src/components/campaigns/campaignsColumns.tsx`

- **Card Size Column**: Now shows "—" for self-mailers instead of displaying physical card sizes (4X6, 6X9, etc.) since they don't print through ACE
- **Review Proof & Submit to Vendor**: These actions now only appear for ACE fulfillment campaigns (`mailing_method === "ace_fulfillment"`)

### Contact Lists vs Audiences

**Files**: 
- `src/components/campaigns/CampaignsList.tsx`
- `src/components/campaigns/campaignsColumns.tsx`
- `src/components/campaigns/CampaignCard.tsx`

- **Changed "Audience" to "List"**: The column header now reads "List" instead of "Audience"
- **Prefer contact_lists**: Display logic now prioritizes `contact_lists` over deprecated `audiences`
- **Show contact count**: Both desktop and mobile views now show the number of contacts in the list

## 2. Data Model Clarifications

### Contact Lists vs Audiences

- **contact_lists** table: The modern, preferred way to group contacts
  - Static lists: Manual grouping of contacts
  - Dynamic lists: Rule-based segments
  
- **audiences** table: DEPRECATED - Kept for backward compatibility only
  - Old campaigns may still reference this table
  - New campaigns should use `contact_lists`

### Campaign-Contact Relationship

- **campaign_recipients**: Links campaigns to specific contacts
- **contact_list_id**: New foreign key on campaigns table linking to contact_lists
- **audience_id**: DEPRECATED but kept for backward compatibility

## 3. Contact Upload with Unique Codes

### Existing Functionality

The `SmartCSVImporter` component (used on the Contacts page) already supports:

1. **Required unique codes**: The import enforces that every contact must have a unique redemption code
2. **Auto-generation**: If codes are missing, they can be auto-generated during import
3. **List creation during import**:
   - Option to create a new list
   - Assigns all imported contacts to that list automatically
   - List naming is user-specified

### Campaign Creation Flow

**Current Implementation**:
- `AudiencesRewardsStep` allows selecting existing contact lists
- Lists must be created separately via the Contacts page first

**User Request**: Allow uploading CSV directly in campaign creation
- When uploading in campaign wizard, default the list name to campaign name
- Create both contacts AND the list in one step
- Require unique codes (with auto-generation option)

## 4. Self-Mailing Workflow

### What Self-Mailers DON'T Need:

1. ✅ **Card size selection** - They mail their own printed materials
2. ✅ **Review proof** - They've already designed and printed
3. ✅ **Submit to vendor** - No ACE fulfillment needed
4. ✅ **Print batches** - Mailing is already done

### What Self-Mailers DO Need:

1. ✅ **Contact list with unique codes** - Already on their printed mail pieces
2. ✅ **Reward conditions** - When/how to trigger gift cards
3. ✅ **Gift card selection** - Which rewards to give
4. ✅ **SMS opt-in handling** - For delivery
5. ✅ **Call center validation** - Code verification

## 5. Next Steps (Not Yet Implemented)

### Allow CSV Upload in Campaign Creation

To complete the user's request, we should:

1. **Add upload option to AudiencesRewardsStep**:
   - Add tab for "Upload New List"
   - Reuse `SmartCSVImporter` logic
   - Default list name to campaign name
   - Automatically select the newly created list

2. **Validation Requirements**:
   - Require `unique_code` column (or allow auto-generation)
   - Minimum required fields: unique_code + at least one identifier (email, phone, or name)
   - Allow optional fields (address, custom fields)

3. **User Experience**:
   ```
   Campaign Creation → Audiences & Rewards Step
   ├─ Tab 1: "Select Existing List"
   │  └─ Dropdown of existing contact lists
   └─ Tab 2: "Upload New List"
      ├─ CSV upload area
      ├─ List name (defaults to campaign name)
      ├─ Column mapping
      ├─ Auto-generate codes option
      └─ Creates contacts + list + assigns to campaign
   ```

## Technical Notes

### Database Structure

```sql
-- Modern approach (use this)
campaigns.contact_list_id → contact_lists.id
contact_lists → contact_list_members → contacts

-- Legacy approach (deprecated)
campaigns.audience_id → audiences.id
audiences → recipients (with audience_id)
```

### Campaign Recipient Creation

When campaign is created, entries are added to `campaign_recipients`:
```sql
INSERT INTO campaign_recipients (campaign_id, contact_id, unique_code)
SELECT campaign_id, c.id, c.unique_code
FROM contacts c
JOIN contact_list_members clm ON clm.contact_id = c.id
WHERE clm.list_id = campaign.contact_list_id
```

## Testing Checklist

- [x] Self-mailing campaigns don't show card size
- [x] Self-mailing campaigns don't show "Review Proof" or "Submit to Vendor"
- [x] Campaign list displays contact lists correctly
- [x] Both desktop and mobile views show list names and contact counts
- [ ] CSV upload in campaign creation creates contacts
- [ ] CSV upload in campaign creation creates list with campaign name
- [ ] Unique codes are required or auto-generated
- [ ] Call center can validate codes from uploaded contacts

## Related Files

- `src/components/campaigns/campaignsColumns.tsx` - Desktop campaign list
- `src/components/campaigns/CampaignCard.tsx` - Mobile campaign card
- `src/components/campaigns/CampaignsList.tsx` - Campaign list data fetching
- `src/components/campaigns/wizard/AudiencesRewardsStep.tsx` - Audience selection
- `src/components/contacts/SmartCSVImporter.tsx` - Reference implementation for CSV import
- `src/pages/CampaignCreate.tsx` - Campaign creation orchestration
- `supabase/migrations/20251125224014_*.sql` - Added contact_list_id to campaigns

---

*These changes ensure that self-mailing campaigns have a streamlined workflow without unnecessary ACE fulfillment steps.*

