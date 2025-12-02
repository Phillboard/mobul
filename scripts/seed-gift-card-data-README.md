# Gift Card System Seed Data

## Quick Start

Run this script to populate your database with sample gift card data.

```bash
# Set environment variables
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Install dependencies
npm install @supabase/supabase-js

# Run seed script
npx tsx scripts/seed-gift-card-data.ts
```

## What Gets Seeded

### Brands (5)
- Amazon
- Starbucks
- Target
- Walmart
- Visa

### Denominations
Each brand gets 5 denominations: $5, $10, $25, $50, $100

### Inventory
50 sample gift card codes per brand-denomination combination (1,250 total cards)

## After Seeding

1. **Admin Setup**: Log in as admin and verify brands are enabled
2. **Client Configuration**: Configure which gift cards each client can use
3. **Test Campaign**: Create a test campaign with gift card rewards
4. **Call Center Test**: Provision a test card through the call center interface

## Reset & Re-seed

To reset and re-seed:

```bash
# This will drop all gift card data and start fresh
npm run migrate:gift-cards
npx tsx scripts/seed-gift-card-data.ts
```

## Customization

Edit `scripts/seed-gift-card-data.ts` to:
- Add/remove brands
- Change denominations
- Adjust inventory quantities
- Modify cost structures

