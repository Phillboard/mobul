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
      const smsMessage = `Your ${brandName || "Gift Card"} is ready!\n\nCode: ${giftCardCode}\n${cardNumber ? `Card: ${cardNumber}\n` : ""}Value: $${giftCardValue}\n\nRedeem at the store`;

      // Create SMS delivery log entry
      const { data: smsLogEntry, error: logError } = await supabase
        .from('sms_delivery_log')
        .insert({
          recipient_id: recipientId,
          gift_card_id: giftCardId,
          phone_number: recipientPhone,
          message_body: smsMessage,
          delivery_status: 'pending',
          retry_count: 0,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Send SMS via edge function
      const { error: smsError } = await supabase.functions.invoke('send-gift-card-sms', {
        body: {
          deliveryId: smsLogEntry.id,
          phone: recipientPhone,
          message: smsMessage,
          recipientId,
          giftCardId,
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
