import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      // Fetch recipient's condition template for personalized message
      const { data: recipient } = await supabase
        .from('recipients')
        .select(`
          first_name,
          last_name,
          audiences!inner(
            campaigns!inner(
              campaign_conditions(sms_template)
            )
          )
        `)
        .eq('id', recipientId)
        .single();

      // Get sms_template from the first condition (if available)
      const smsTemplate = recipient?.audiences?.[0]?.campaigns?.[0]?.campaign_conditions?.[0]?.sms_template;
      
      // Create SMS delivery log entry (needed for send-gift-card-sms)
      const { data: smsLogEntry, error: logError } = await supabase
        .from('sms_delivery_log')
        .insert({
          recipient_id: recipientId,
          gift_card_id: giftCardId,
          phone_number: recipientPhone,
          message_body: 'Resending gift card...',
          delivery_status: 'pending',
          retry_count: 0,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Prepare custom message from template if available
      let customMessage = smsTemplate;
      if (customMessage) {
        customMessage = customMessage
          .replace(/\{first_name\}/gi, recipient.first_name || '')
          .replace(/\{last_name\}/gi, recipient.last_name || '')
          .replace(/\{value\}/g, giftCardValue.toString())
          .replace(/\$\{value\}/g, giftCardValue.toString())
          .replace(/\{provider\}/gi, brandName || 'Gift Card')
          .replace(/\{company\}/gi, brandName || 'us')
          .replace(/\{link\}/gi, giftCardCode);
      }

      // Send SMS via edge function with correct parameters
      const { error: smsError } = await supabase.functions.invoke('send-gift-card-sms', {
        body: {
          deliveryId: smsLogEntry.id,
          giftCardCode: giftCardCode,
          giftCardValue: giftCardValue,
          recipientPhone: recipientPhone,
          recipientName: recipient.first_name || '',
          customMessage: customMessage || undefined,
          recipientId: recipientId,
          giftCardId: giftCardId,
        },
      });

      if (smsError) throw smsError;

      return smsLogEntry;
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
