import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";
import { generateGiftCardCode, generatePIN } from '@/lib/demo/fake-data-helpers';

interface AutoPopulatePoolButtonProps {
  poolId: string;
  brandId: string;
  cardValue: number;
  targetCount?: number;
  onComplete?: () => void;
}

/**
 * Auto-populate a gift card pool with demo cards
 * Useful for quickly testing gift card functionality
 */
export function AutoPopulatePoolButton({
  poolId,
  brandId,
  cardValue,
  targetCount = 100,
  onComplete,
}: AutoPopulatePoolButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Check current card count
      const { data: existingCards, error: countError } = await supabase
        .from('gift_cards')
        .select('id', { count: 'exact', head: true })
        .eq('pool_id', poolId);

      if (countError) throw countError;

      const currentCount = existingCards || 0;
      const cardsToGenerate = Math.max(0, targetCount - currentCount);

      if (cardsToGenerate === 0) {
        toast.info(`Pool already has ${currentCount} cards`);
        setIsGenerating(false);
        return;
      }

      toast.info(`Generating ${cardsToGenerate} gift cards...`);

      // Generate cards in batches of 50
      const batchSize = 50;
      let totalGenerated = 0;

      for (let i = 0; i < cardsToGenerate; i += batchSize) {
        const batchCount = Math.min(batchSize, cardsToGenerate - i);
        const cards = [];

        for (let j = 0; j < batchCount; j++) {
          cards.push({
            pool_id: poolId,
            brand_id: brandId,
            card_code: generateGiftCardCode('TEST'),
            card_number: `6011${String(1000000000000 + totalGenerated + j).padStart(12, '0')}`,
            pin: generatePIN(),
            card_value: cardValue,
            status: 'available',
            current_balance: cardValue,
            expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
          });
        }

        const { error: insertError } = await supabase
          .from('gift_cards')
          .insert(cards);

        if (insertError) {
          console.error('Batch insert error:', insertError);
          throw insertError;
        }

        totalGenerated += batchCount;
        toast.info(`Generated ${totalGenerated}/${cardsToGenerate} cards...`);
      }

      // Update pool counts
      await supabase
        .from('gift_card_pools')
        .update({
          total_cards: currentCount + totalGenerated,
          available_cards: currentCount + totalGenerated,
        })
        .eq('id', poolId);

      toast.success(`✅ Generated ${totalGenerated} gift cards!`);
      
      if (onComplete) {
        onComplete();
      }

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(`Failed to generate cards: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={isGenerating}
      size="sm"
      variant="outline"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Wand2 className="h-4 w-4 mr-2" />
          Auto-Fill Pool ({targetCount} cards)
        </>
      )}
    </Button>
  );
}

