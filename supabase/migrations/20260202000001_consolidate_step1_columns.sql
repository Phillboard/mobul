-- Step 1: Add backward-compatibility columns to gift_card_inventory
SET search_path TO public;

ALTER TABLE public.gift_card_inventory
  ADD COLUMN IF NOT EXISTS legacy_pool_id uuid,
  ADD COLUMN IF NOT EXISTS legacy_card_id uuid,
  ADD COLUMN IF NOT EXISTS assignment_source text,
  ADD COLUMN IF NOT EXISTS assignment_campaign_id uuid,
  ADD COLUMN IF NOT EXISTS assignment_condition_id uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by_agent_id uuid,
  ADD COLUMN IF NOT EXISTS provider text;

-- Add FK constraint separately (if gift_card_pools exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gift_card_pools') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'gift_card_inventory_legacy_pool_id_fkey'
        AND table_name = 'gift_card_inventory'
    ) THEN
      ALTER TABLE public.gift_card_inventory
        ADD CONSTRAINT gift_card_inventory_legacy_pool_id_fkey
        FOREIGN KEY (legacy_pool_id) REFERENCES public.gift_card_pools(id);
    END IF;
  END IF;
END $$;

-- Indexes for lookups during transition
CREATE INDEX IF NOT EXISTS idx_gift_card_inventory_legacy_pool
  ON public.gift_card_inventory(legacy_pool_id) WHERE legacy_pool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gift_card_inventory_legacy_card_id
  ON public.gift_card_inventory(legacy_card_id) WHERE legacy_card_id IS NOT NULL;
