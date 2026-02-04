-- Migration: Add Missing Foreign Key Constraint for gift_card_inventory
-- 
-- The assignment_condition_id column was added in a previous migration but
-- no FK constraint was created. This causes Supabase PostgREST to return 
-- 400 errors when using FK hints like:
--   campaign_conditions!gift_card_inventory_assignment_condition_id_fkey
--
-- This migration adds the missing constraint so the Call Center can properly
-- query gift card history with condition details.

SET search_path TO public;

-- Add the missing foreign key constraint (if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'gift_card_inventory_assignment_condition_id_fkey'
    AND table_name = 'gift_card_inventory'
  ) THEN
    ALTER TABLE public.gift_card_inventory
      ADD CONSTRAINT gift_card_inventory_assignment_condition_id_fkey
      FOREIGN KEY (assignment_condition_id) 
      REFERENCES public.campaign_conditions(id) 
      ON DELETE SET NULL;
    
    RAISE NOTICE 'Created foreign key constraint gift_card_inventory_assignment_condition_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint gift_card_inventory_assignment_condition_id_fkey already exists';
  END IF;
END $$;

-- Create index for query performance on the FK column
CREATE INDEX IF NOT EXISTS idx_gift_card_inventory_assignment_condition_id 
  ON public.gift_card_inventory(assignment_condition_id);
