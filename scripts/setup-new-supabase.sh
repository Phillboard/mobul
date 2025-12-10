#!/bin/bash

# Quick setup script for new Supabase migration

echo "=================================================="
echo " Supabase Migration Setup"
echo "=================================================="
echo ""

PROJECT_ID="uibvxhwhkatjcwghnzpu"
PROJECT_URL="https://$PROJECT_ID.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpYnZ4aHdoa2F0amN3Z2huenB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTk3MzEsImV4cCI6MjA4MDE3NTczMX0.083bUjyUWEgIOyUsBE9pwu2LKThmCiPTlg38BqHra2I"

echo "Step 1: Creating .env file..."

ENV_CONTENT="# Supabase Configuration
VITE_SUPABASE_URL=$PROJECT_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_ANON_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=$PROJECT_ID

# Service Role Key (REQUIRED - Get from dashboard)
# Get this from: https://supabase.com/dashboard/project/$PROJECT_ID/settings/api
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
"

if [ -f ".env" ]; then
    echo "   .env file already exists. Creating .env.new instead..."
    echo "$ENV_CONTENT" > .env.new
    echo "   ✓ Created .env.new"
    echo "   Please review and rename to .env"
else
    echo "$ENV_CONTENT" > .env
    echo "   ✓ Created .env file"
fi

echo ""
echo "Step 2: Get Service Role Key"
echo "   Go to: https://supabase.com/dashboard/project/$PROJECT_ID/settings/api"
echo "   Copy the 'service_role' key and add it to your .env file"
echo ""

echo "Step 3: Link Supabase Project"
echo "   Run: supabase link --project-ref $PROJECT_ID"
echo ""

echo "Step 4: Apply Migrations"
echo "   Run: supabase db push"
echo ""

echo "Step 5: Deploy Functions"
echo "   Run: supabase functions deploy"
echo ""

echo "Step 6: Start Development"
echo "   Run: npm run dev"
echo ""

echo "=================================================="
echo " Setup instructions created!"
echo " See SUPABASE_MIGRATION_GUIDE.md for full details"
echo "=================================================="
echo ""

