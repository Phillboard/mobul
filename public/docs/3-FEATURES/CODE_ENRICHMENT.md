# Customer Code Enrichment Guide

**For:** Users who have already sent direct mail with unique codes  
**Goal:** Upload codes, capture customer data, enrich contacts, export enriched data

---

## What This System Does

When customers receive your mail and visit your landing page:
1. They enter their unique code (from the postcard)
2. Fill out a form with additional information
3. Their contact record automatically enriches with new data
4. You export enriched contacts back to your CRM

**Result:** Turn direct mail responses into rich customer data!

---

## Prerequisites Checklist

Before starting, ensure you have:
- Brand new account created on the platform
- Mail already physically sent to customers
- CSV file with your customer codes ready
- Landing page or form ready for customers
- Gift card credits purchased (if offering rewards)

---

## Complete Step-by-Step Guide

### Step 1: Log In & Initial Setup (5 minutes)

1. **Log in** to your account at your platform URL
2. **Select your client** from the dropdown (top navigation)
3. Navigate to **Audience** → **Contacts** in the sidebar

---

### Step 2: Upload Customer Codes (10 minutes)

**Current Method (Manual Import):**
1. Go to: **Audience** → **Import Contacts**
2. Download the CSV template
3. Fill in your customer codes:
   ```csv
   code,first_name,last_name,email,phone,company
   ABC-1234,John,Doe,john@example.com,+15551234567,Acme Corp
   XYZ-5678,Jane,Smith,jane@example.com,+15559876543,Beta Inc
   ```

4. Upload your CSV file
5. **Map columns** (if needed):
   - Code → Custom Field: redemption_code
   - First Name → first_name
   - Last Name → last_name
   - Email → email
   - Phone → phone

6. Choose import option:
   - **"Match existing contacts by email"** (if you have existing contacts)
   - **"Create new contacts for all"** (if these are new)
   - **"Mixed: Match existing, create new for unmatched"** (recommended)

7. Review preview:
   - See how many contacts will be matched
   - See how many new contacts will be created
   - Verify code format is correct

8. Click **"Import Contacts"**

9. **Verify Success:**
   - Go to Contacts page
   - Search for a contact by name
   - Click to view details
   - Check "Custom Fields" section
   - Should see: `redemption_code: ABC-1234`

---

### Step 3: Create Landing Page (15 minutes)

**Option A: Use Existing Landing Page Editor**
1. Go to: **Campaigns** → **Landing Pages**
2. Click **New Landing Page** and choose **"Visual Editor"** (GrapesJS)
3. Design your page:
   - Add hero section with your offer
   - Add form with these fields:
     - Redemption Code (required)
     - Company Size
     - Industry
     - Interested In
     - Best Time to Call
   - Add "Submit" button

4. **Publish** the page
5. **Copy the public URL**

**Option B: Use AI Landing Page Builder** (When Available)
1. Go to: **Landing Pages** → **AI Builder**
2. Upload your postcard image OR paste website URL
3. Chat: "Create a landing page with code redemption and lead form"
4. Review → Edit → Publish
5. Copy URL

---

### Step 4: Create Campaign (10 minutes)

1. Go to: **Campaigns** → **All Campaigns** → **Create Campaign**

2. **Step 1: Setup**
   - Name: "Q4 Direct Mail Campaign"
   - Size: Match your postcard size (e.g., 4x6)
   - Template: Optional

3. **Step 2: Recipients**
   - Source: **Contact List**
   - Select the list with your imported codes
   - Verify count matches your CSV

4. **Step 3: Tracking & Rewards**
   - Link Landing Page: Select your page
   - Add Condition: "Form Submission"
   - Select Gift Card Brand & Denomination
   - SMS Template: "Thank you! Your gift card: {{card_code}}"

5. **Step 4: Delivery**
   - Mail Date: Set to when you actually sent mail
   - Postage: Standard or First Class

6. **Step 5: Review & Create**
   - Review all settings
   - Click **"Create Campaign"**

---

### Step 5: Share Landing Page with Customers (Ongoing)

**On Your Mail Piece:**
- Include QR code pointing to landing page
- Include short URL: yourdomain.com/q4offer
- Include text: "Visit [URL] and enter your code"

**Via Other Channels:**
- Email the URL to your list
- Post on social media
- Add to your website

---

### Step 6: Monitor Customer Activity (Real-time)

**View Campaign Dashboard:**
1. Go to: **Campaigns** → Click your campaign name
2. See real-time metrics:
   - Total codes issued
   - Codes redeemed
   - Forms submitted
   - Gift cards claimed
   - Data enriched

**View Individual Contact:**
1. Go to: **Contacts**
2. Search for customer by name or email
3. Click to view details
4. See **"Enrichment History"** section:
   - Date: When they submitted
   - Campaign: Which campaign
   - Form: Which form
   - Fields Added: What new data was captured

---

### Step 7: Verify Data Enrichment (5 minutes)

**Example: Customer "John Doe" submits form**

**Before Submission:**
```
Name: John Doe
Email: john@example.com
Phone: +15551234567
Redemption Code: ABC-1234
```

**After Form Submission:**
```
Name: John Doe
Email: john@example.com
Phone: +15551234567
Redemption Code: ABC-1234
Company Size: 50-100 employees        ← NEW!
Industry: Construction                 ← NEW!
Interested In: Roof Inspection         ← NEW!
Best Time to Call: Morning             ← NEW!
Form Submitted: Yes                    ← NEW!
Gift Card Claimed: $25 Amazon          ← NEW!
Last Activity: Today 2:34 PM           ← UPDATED!
```

---

### Step 8: Export Enriched Data (5 minutes)

**Export Options:**

1. Go to: **Audience** → **Contacts**

2. Click **"Export"** button

3. **Choose Export Type:**
   - **"Only Enriched Contacts"** (recommended)
   - "All Contacts"
   - "Contacts from Specific Campaign"

4. **Select Fields to Include:**
   - Standard fields (name, email, phone)
   - Custom form data (company size, interests, etc.)
   - Enrichment timestamps
   - Campaign interaction history
   - Gift card redemption status

5. **Choose Format:**
   - **CSV** - For Excel/Google Sheets
   - **JSON** - For API/developer use
   - **Excel (XLSX)** - For advanced Excel users

6. Click **"Export"**

7. **Download File**

8. **Open in Excel:**
```
first_name, last_name, email, phone, company_size, industry, interested_in, best_time_to_call, redemption_code, gift_card_claimed, campaign_name, enrichment_date
John, Doe, john@example.com, +15551234567, 50-100 employees, Construction, Roof Inspection, Morning, ABC-1234, Yes, Q4 Campaign, 2025-11-27
```

---

### Step 9: API Access for Real-Time Sync (5 minutes)

**Get API Key:**
1. Go to: **Settings** → **API & Integrations**
2. Click **"Generate API Key"**
3. Copy and save securely
4. Set permissions: `contacts.read`

**Test API Call:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-project.supabase.co/functions/v1/get-enriched-contacts?campaign_id=CAMPAIGN_ID&enriched_only=true"
```

**Response:**
```json
{
  "contacts": [
    {
      "id": "...",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "enrichment_data": {
        "company_size": "50-100 employees",
        "industry": "Construction",
        "interested_in": "Roof Inspection"
      },
      "redemption_code": "ABC-1234",
      "gift_card_claimed": true,
      "enriched_at": "2025-11-27T14:34:22Z"
    }
  ],
  "total": 156,
  "enriched": 89
}
```

---

## Troubleshooting

### Issue: "Code not recognized"
**Solutions:**
- Verify code is in uploaded CSV
- Check code format matches (case-sensitive)
- Ensure campaign is linked to audience with recipients
- Check recipient record exists with that code

### Issue: "Data not enriching"
**Solutions:**
- Verify contact_id is linked to recipient
- Check form is configured to enrich contacts
- Ensure custom fields exist for form data
- Check browser console for errors

### Issue: "Export is empty"
**Solutions:**
- Verify "enriched_only" filter setting
- Check date range filters
- Ensure contacts have form_submission_count > 0
- Try "All Contacts" to verify export works

### Issue: "API returns no data"
**Solutions:**
- Verify API key has correct permissions
- Check campaign_id parameter is correct
- Ensure enriched_only=true if filtering
- Test with Postman/Insomnia first

---

## Best Practices

### For Best Results:

1. **Use Clear Form Fields:**
   - Ask for data you actually need
   - Keep forms short (5-7 fields max)
   - Make important fields required

2. **Test Before Launch:**
   - Test with your own code first
   - Verify data appears correctly
   - Check export includes all fields
   - Test on mobile devices

3. **Monitor Regularly:**
   - Check campaign dashboard daily
   - Export data weekly
   - Follow up on enriched leads quickly

4. **Maintain Data Quality:**
   - Validate form inputs
   - Handle duplicates gracefully
   - Keep codes secure
   - Archive old campaigns

