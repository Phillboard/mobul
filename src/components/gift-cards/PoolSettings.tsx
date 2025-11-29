/**
 * PoolSettings Component
 * 
 * Purpose: Display and edit pool configuration settings
 * Used by: PoolDetailDialog
 * 
 * Key Features:
 * - Toggle edit mode (admin only)
 * - Auto balance check setting
 * - Balance check frequency configuration
 * - Low stock threshold setting
 * - Save/cancel functionality
 * - Optimistic UI updates
 * 
 * Props:
 * @param {GiftCardPool} pool - The gift card pool
 * @param {boolean} isAdmin - Whether current user is admin
 * @param {() => void} onUpdate - Callback when settings are saved
 * 
 * State Management:
 * - Mutations: updatePool (via useMutation)
 * 
 * Related Components: Card, Switch, Input, Button
 * Edge Functions: None (uses direct Supabase client)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Edit2, X, Check } from "lucide-react";
import { GiftCardPool } from "@/types/giftCards";
import { formatCheckFrequency } from '@/lib/campaign/giftCardUtils";

interface PoolSettingsProps {
  pool: GiftCardPool;
  isAdmin: boolean;
  onUpdate?: () => void;
}

export function PoolSettings({ pool, isAdmin, onUpdate }: PoolSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [autoCheck, setAutoCheck] = useState(pool.auto_balance_check || false);
  const [checkFrequency, setCheckFrequency] = useState(pool.balance_check_frequency_hours || 168);
  const [lowStock, setLowStock] = useState(pool.low_stock_threshold || 10);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Mutation to update pool settings
   */
  const updateSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("gift_card_pools")
        .update({
          auto_balance_check: autoCheck,
          balance_check_frequency_hours: checkFrequency,
          low_stock_threshold: lowStock,
        })
        .eq("id", pool.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gift-card-pool", pool.id] });
      toast({
        title: "Settings Updated",
        description: "Pool settings have been saved successfully.",
      });
      setIsEditing(false);
      onUpdate?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /**
   * Resets form to original pool values
   */
  const handleCancel = () => {
    setAutoCheck(pool.auto_balance_check || false);
    setCheckFrequency(pool.balance_check_frequency_hours || 168);
    setLowStock(pool.low_stock_threshold || 10);
    setIsEditing(false);
  };

  /**
   * Validates and saves settings
   */
  const handleSave = () => {
    if (checkFrequency < 1) {
      toast({
        title: "Validation Error",
        description: "Check frequency must be at least 1 hour",
        variant: "destructive",
      });
      return;
    }

    if (lowStock < 0) {
      toast({
        title: "Validation Error",
        description: "Low stock threshold cannot be negative",
        variant: "destructive",
      });
      return;
    }

    updateSettings.mutate();
  };

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="border-b bg-muted/20 py-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Pool Configuration</CardTitle>
          {isAdmin && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Settings
            </Button>
          )}
          {isEditing && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={updateSettings.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateSettings.isPending}
              >
                <Check className="h-4 w-4 mr-2" />
                {updateSettings.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-8 pb-8">
        {/* Auto Balance Check */}
        <div className="flex items-center justify-between p-6 rounded-lg bg-muted/30 border-2">
          <div className="space-y-1 flex-1">
            <Label className="text-base font-semibold">Auto Balance Check</Label>
            <p className="text-sm text-muted-foreground">
              Automatically verify card balances on schedule
            </p>
          </div>
          {isEditing ? (
            <Switch
              checked={autoCheck}
              onCheckedChange={setAutoCheck}
            />
          ) : (
            <Badge variant={pool.auto_balance_check ? 'default' : 'secondary'} className="text-sm px-4 py-2">
              {pool.auto_balance_check ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </div>

        {/* Check Frequency */}
        <div className="flex items-center justify-between p-6 rounded-lg bg-muted/30 border-2">
          <div className="space-y-1 flex-1">
            <Label className="text-base font-semibold">Check Frequency</Label>
            <p className="text-sm text-muted-foreground">
              How often balances are verified (in hours)
            </p>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={checkFrequency}
                onChange={(e) => setCheckFrequency(parseInt(e.target.value) || 168)}
                className="w-24"
                min={1}
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
          ) : (
            <span className="text-base font-semibold">
              {formatCheckFrequency(pool.balance_check_frequency_hours || 168)}
            </span>
          )}
        </div>

        {/* Low Stock Threshold */}
        <div className="flex items-center justify-between p-6 rounded-lg bg-muted/30 border-2">
          <div className="space-y-1 flex-1">
            <Label className="text-base font-semibold">Low Stock Threshold</Label>
            <p className="text-sm text-muted-foreground">
              Alert when inventory drops below this number
            </p>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={lowStock}
                onChange={(e) => setLowStock(parseInt(e.target.value) || 10)}
                className="w-24"
                min={0}
              />
              <span className="text-sm text-muted-foreground">cards</span>
            </div>
          ) : (
            <span className="text-base font-semibold">
              {pool.low_stock_threshold || 10} cards
            </span>
          )}
        </div>

        {/* Last Auto Check (Read-only) */}
        {pool.last_auto_balance_check && (
          <div className="flex items-center justify-between p-6 rounded-lg bg-muted/30 border-2">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Last Auto Check</Label>
              <p className="text-sm text-muted-foreground">
                Most recent automatic balance verification
              </p>
            </div>
            <span className="text-base font-semibold">
              {new Date(pool.last_auto_balance_check).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
