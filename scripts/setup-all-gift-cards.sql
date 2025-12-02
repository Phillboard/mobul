-- =====================================================
-- RUN ALL GIFT CARD SETUP IN ONE GO
-- =====================================================
-- Copy and paste this entire file into Supabase SQL Editor
-- Or run: psql -f scripts/setup-all-gift-cards.sql
-- =====================================================

-- Part 1: Custom Pricing Columns
\i supabase/migrations/20251203000002_add_custom_pricing_to_denominations.sql

-- Part 2: Database Functions  
\i supabase/migrations/20251203000003_create_gift_card_functions.sql

-- Part 3: Seed Test Data
\i supabase/migrations/20251203000004_seed_gift_card_test_data.sql

-- Done!
SELECT 'Gift Card System Setup Complete!' as status;

