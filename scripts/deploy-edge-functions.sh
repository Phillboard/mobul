#!/usr/bin/env bash
# Deploy all new edge functions to Supabase
# Usage: ./deploy-edge-functions.sh

set -e

echo "🚀 Deploying Edge Functions to Supabase..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "✅ Supabase CLI ready"
echo ""

# Deploy new edge functions
echo "📦 Deploying new edge functions..."

functions=(
    "provision-gift-card-for-call-center"
    "provision-gift-card-from-api"
    "simulate-mail-tracking"
    "validate-campaign-budget"
    "validate-gift-card-configuration"
    "update-organization-status"
    "calculate-credit-requirements"
)

for func in "${functions[@]}"; do
    echo "   Deploying $func..."
    if supabase functions deploy "$func" --no-verify-jwt; then
        echo "   ✅ $func deployed successfully"
    else
        echo "   ❌ Failed to deploy $func"
        exit 1
    fi
    echo ""
done

echo "🎉 All edge functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Verify functions in Supabase Dashboard"
echo "2. Test each function with sample requests"
echo "3. Update frontend to use new APIs"
echo "4. Run integration tests"

