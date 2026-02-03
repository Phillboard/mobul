-- Step 3: Update recipient_gift_cards to support inventory card references
SET search_path TO public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recipient_gift_cards') THEN
    -- Add inventory_card_id column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'recipient_gift_cards' AND column_name = 'inventory_card_id'
    ) THEN
      ALTER TABLE public.recipient_gift_cards ADD COLUMN inventory_card_id uuid;

      -- Add FK if gift_card_inventory exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gift_card_inventory') THEN
        ALTER TABLE public.recipient_gift_cards
          ADD CONSTRAINT recipient_gift_cards_inventory_card_id_fkey
          FOREIGN KEY (inventory_card_id) REFERENCES public.gift_card_inventory(id);
      END IF;
    END IF;

    -- Backfill inventory_card_id from legacy_card_id mapping
    UPDATE public.recipient_gift_cards rgc
    SET inventory_card_id = gi.id
    FROM public.gift_card_inventory gi
    WHERE gi.legacy_card_id = rgc.gift_card_id
      AND rgc.inventory_card_id IS NULL;
  END IF;
END $$;
