/**
 * Inventory Upload Hook
 * Handles CSV upload and batch card insertion to gift_card_inventory
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

export interface CSVCard {
  card_code: string;
  card_number?: string;
  expiration_date?: string;
}

export interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
  duplicates: string[];
}

/**
 * Parse CSV file content
 */
export function parseCSV(content: string): CSVCard[] {
  const lines = content.trim().split('\n');
  const cards: CSVCard[] = [];

  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('card') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim());
    if (parts.length === 0 || !parts[0]) continue;

    cards.push({
      card_code: parts[0],
      card_number: parts[1] || undefined,
      expiration_date: parts[2] || undefined,
    });
  }

  return cards;
}

/**
 * Upload gift cards from CSV
 */
export function useInventoryUpload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      brandId,
      denomination,
      cards,
      costBasis,
      uploadBatchId,
    }: {
      brandId: string;
      denomination: number;
      cards: CSVCard[];
      costBasis?: number;
      uploadBatchId?: string;
    }) => {
      const result: UploadResult = {
        success: 0,
        failed: 0,
        errors: [],
        duplicates: [],
      };

      const batchId = uploadBatchId || crypto.randomUUID();

      // Check for existing card codes to avoid duplicates
      const cardCodes = cards.map(c => c.card_code);
      const { data: existing } = await supabase
        .from("gift_card_inventory")
        .select("card_code")
        .in("card_code", cardCodes);

      const existingCodes = new Set(existing?.map(e => e.card_code) || []);

      // Filter out duplicates
      const newCards = cards.filter(card => {
        if (existingCodes.has(card.card_code)) {
          result.duplicates.push(card.card_code);
          result.failed++;
          return false;
        }
        return true;
      });

      if (newCards.length === 0) {
        throw new Error("All card codes already exist in inventory");
      }

      // Prepare batch insert
      const insertData = newCards.map(card => ({
        brand_id: brandId,
        denomination,
        card_code: card.card_code,
        card_number: card.card_number || null,
        expiration_date: card.expiration_date || null,
        status: 'available',
        upload_batch_id: batchId,
      }));

      // Batch insert (Supabase supports up to 1000 rows at once)
      const batchSize = 1000;
      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from("gift_card_inventory")
          .insert(batch)
          .select();

        if (error) {
          result.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
          result.failed += batch.length;
        } else {
          result.success += data?.length || 0;
        }
      }

      // Update denomination cost basis if provided
      if (costBasis && result.success > 0) {
        await supabase
          .from("gift_card_denominations")
          .upsert({
            brand_id: brandId,
            denomination,
            cost_basis: costBasis,
          }, {
            onConflict: 'brand_id,denomination'
          });
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["denomination-inventory"] });

      const message = result.duplicates.length > 0
        ? `Uploaded ${result.success} cards. ${result.duplicates.length} duplicates skipped.`
        : `Successfully uploaded ${result.success} gift cards`;

      toast({
        title: "Upload complete",
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Delete cards from a batch
 */
export function useDeleteBatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (batchId: string) => {
      // Only delete cards that haven't been assigned/delivered
      const { data, error } = await supabase
        .from("gift_card_inventory")
        .delete()
        .eq("upload_batch_id", batchId)
        .eq("status", "available")
        .select();

      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["gift-card-inventory"] });
      toast({
        title: "Batch deleted",
        description: `Removed ${count} unused cards from inventory`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting batch",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Get upload batch statistics
 */
export function useUploadBatches(brandId?: string, denomination?: number) {
  return useMutation({
    mutationFn: async () => {
      let query = supabase
        .from("gift_card_inventory")
        .select("upload_batch_id, uploaded_at, status");

      if (brandId) query = query.eq("brand_id", brandId);
      if (denomination) query = query.eq("denomination", denomination);

      const { data, error } = await query;
      if (error) throw error;

      // Group by batch
      const batches = new Map();
      data?.forEach(card => {
        if (!card.upload_batch_id) return;

        if (!batches.has(card.upload_batch_id)) {
          batches.set(card.upload_batch_id, {
            batch_id: card.upload_batch_id,
            uploaded_at: card.uploaded_at,
            available: 0,
            assigned: 0,
            delivered: 0,
          });
        }

        const batch = batches.get(card.upload_batch_id);
        if (card.status === 'available') batch.available++;
        if (card.status === 'assigned') batch.assigned++;
        if (card.status === 'delivered') batch.delivered++;
      });

      return Array.from(batches.values());
    },
  });
}

