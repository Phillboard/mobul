# Mail Designer - Upload & Save Fix

## Issues Fixed

### 1. Save Error
**Problem**: Saving was failing with error: "Could not find the 'canvas_state' column of 'templates' in the schema cache"

**Root Cause**: The `NewMailDesigner` component was trying to save to a `canvas_state` column that didn't exist in the `templates` table.

**Solution**: Created migration `20251218120000_add_canvas_state_to_templates.sql` to add:
- `canvas_state` JSONB column for the new canvas-based designer
- `front_image_url` TEXT column for uploaded front designs
- `back_image_url` TEXT column for uploaded back designs

### 2. Missing Upload Capability
**Problem**: No way to upload pre-designed front/back images directly.

**Solution**: Created new `DesignUploader` component that:
- Supports drag-and-drop file upload
- Validates file types and sizes (max 10MB)
- Uploads to Supabase Storage (`templates` bucket)
- Shows preview thumbnails with remove buttons
- Provides separate uploaders for front and back designs

## Changes Made

### New Files
1. `supabase/migrations/20251218120000_add_canvas_state_to_templates.sql` - Database migration
2. `src/features/designer/components/DesignUploader.tsx` - Upload component

### Modified Files
1. `src/features/designer/index.ts` - Exported DesignUploader component
2. `src/pages/NewMailDesigner.tsx` - Integrated upload functionality:
   - Added "Upload" tab to left panel alongside AI and Elements
   - Added state for front/back image URLs
   - Updated save mutation to save uploaded images
   - Updated save button to enable when uploads present

## How to Apply

### Step 1: Run the Migration
You need to apply the database migration. Choose one option:

**Option A: Using Supabase CLI (Local)**
```bash
npx supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251218120000_add_canvas_state_to_templates.sql`
3. Run the SQL

**Option C: Direct SQL (Production)**
```sql
ALTER TABLE templates ADD COLUMN IF NOT EXISTS canvas_state JSONB DEFAULT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS front_image_url TEXT DEFAULT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS back_image_url TEXT DEFAULT NULL;
```

### Step 2: Verify Storage Bucket
Make sure the `templates` storage bucket exists and has proper RLS policies:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE name = 'templates';

-- If needed, create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true);

-- Add RLS policy for authenticated uploads
CREATE POLICY "Authenticated users can upload templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Public can view templates"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'templates');
```

### Step 3: Test the Feature
1. Navigate to `/mail-designer/new`
2. Click the "Upload" tab on the left panel
3. Upload a front design image
4. Upload a back design image (optional)
5. Click "Save"
6. Verify the mail piece saves successfully

## Usage

### For Designers
The mail designer now supports two workflows:

**Workflow 1: Canvas-Based Design** (AI + Elements tabs)
- Use AI assistant to generate designs
- Add elements manually
- Customize with drag-and-drop

**Workflow 2: Upload Pre-Made Designs** (Upload tab)
- Upload finished front design (PNG, JPG, PDF)
- Upload finished back design (optional)
- Designs are stored and can be exported

Both workflows save to the same `templates` table, making it flexible for different use cases.

## Technical Details

### Database Schema Changes
```sql
-- New columns in templates table
canvas_state JSONB       -- Canvas designer state (elements, layout, etc.)
front_image_url TEXT     -- URL to uploaded front image
back_image_url TEXT      -- URL to uploaded back image
```

### Component Architecture
- **DesignUploader**: Reusable component for uploading front/back designs
  - Props: `side`, `currentImageUrl`, `onImageUpload`, `onImageRemove`
  - Handles file validation, upload to Supabase Storage
  - Shows preview with remove capability

- **NewMailDesigner**: Updated to support both canvas and upload modes
  - State tracks both canvas state AND uploaded image URLs
  - Save mutation handles both data types
  - Save button enabled when canvas dirty OR uploads present

## Notes
- Uploaded images are stored in Supabase Storage `templates` bucket
- File size limit: 10MB per image
- Supported formats: PNG, JPG, PDF (anything `image/*`)
- Images are public by default for easy sharing/embedding
