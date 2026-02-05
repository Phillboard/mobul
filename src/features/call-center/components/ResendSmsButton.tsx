import { Button } from "@/shared/components/ui/button";
import { Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { callEdgeFunction } from '@core/api/client';
import { Endpoints } from '@core/api/endpoints';
import { useToast } from '@shared/hooks';

interface ResendSmsButtonProps {
  giftCardId: string;
  recipientId: string;
  recipientPhone: string;
  giftCardCode: string;
  giftCardValue: number;
  brandName?: string;
  cardNumber?: string;
}

export function ResendSmsButton({
  giftCardId,
  recipientId,
  recipientPhone,
  giftCardCode,
  giftCardValue,
  brandName,
  cardNumber,
}: ResendSmsButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resendSms = useMutation({
    mutationFn: async () => {
      // Fetch recipient data including conditionId and clientId for proper template resolution
      // The edge function handles all template resolution including link URL rendering
      // Note: Use regular joins (not !inner) to avoid 400 errors when recipient has no audiences
      const { data: recipient } = await supabase
        .from('recipients')
        .select(`
          first_name,
          last_name,
          condition_id,
          campaign:campaigns(
            client_id,
            campaign_conditions(id, sms_template)
          ),
          audiences(
            campaigns(
              client_id,
              campaign_conditions(id, sms_template)
            )
          )
        `)
        .eq('id', recipientId)
        .single();

      // Get conditionId for proper template and link URL resolution
      // The edge function uses this to resolve condition-level sms_template AND sms_link_url
      const conditionId = recipient?.condition_id
        || recipient?.campaign?.campaign_conditions?.[0]?.id
        || recipient?.audiences?.[0]?.campaigns?.[0]?.campaign_conditions?.[0]?.id;
      
      // Get client_id for hierarchical Twilio resolution (prefer direct campaign link)
      const clientId = (recipient?.campaign as any)?.client_id 
        || recipient?.audiences?.[0]?.campaigns?.[0]?.client_id;

      // Send SMS via edge function with conditionId for proper template resolution
      // DO NOT pass customMessage - let edge function resolve template + link URL properly
      // The edge function handles two-stage rendering:
      // 1. Resolve link URL from condition/client config and render with {code}, {email}, etc.
      // 2. Resolve main template and render with all variables including the rendered link
      // Note: Edge function creates its own sms_delivery_log entry
      await callEdgeFunction(
        Endpoints.messaging.sendGiftCardSms,
        {
          giftCardCode: giftCardCode,
          giftCardValue: giftCardValue,
          recipientPhone: recipientPhone,
          recipientName: recipient?.first_name || '',
          recipientId: recipientId,
          giftCardId: giftCardId,
          clientId: clientId, // For hierarchical Twilio resolution
          conditionId: conditionId, // For proper template + link URL resolution
          brandName: brandName,
        }
      );

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Gift card details have been resent to the customer's phone.",
      });
      queryClient.invalidateQueries({ queryKey: ['sms-delivery-log'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send SMS",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => resendSms.mutate()}
      disabled={resendSms.isPending}
      className="gap-2"
    >
      <Send className="h-4 w-4" />
      {resendSms.isPending ? "Sending..." : "Resend SMS"}
    </Button>
  );
}
