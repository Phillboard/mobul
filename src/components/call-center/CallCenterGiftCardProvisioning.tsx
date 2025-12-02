/**
 * Call Center Gift Card Provisioning Component
 * 
 * Handles gift card provisioning for call center agents using unified system
 * Replaces old pool-based system with brand-denomination + unified provisioning
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useProvisionCard } from '@/hooks/useGiftCardProvisioning';
import { Gift, Loader2, CheckCircle, Copy, Send } from 'lucide-react';
import { formatCardCode, formatCurrency } from '@/lib/gift-cards/provisioning-utils';

interface CallCenterGiftCardProvisioningProps {
  campaignId: string;
  recipientId: string;
  brandId?: string;
  denomination?: number;
  conditionNumber: number;
  disabled?: boolean;
  onSuccess?: (cardDetails: any) => void;
}

export function CallCenterGiftCardProvisioning({
  campaignId,
  recipientId,
  brandId,
  denomination,
  conditionNumber,
  disabled,
  onSuccess,
}: CallCenterGiftCardProvisioningProps) {
  const { toast } = useToast();
  const [provisionedCard, setProvisionedCard] = useState<any>(null);
  const provisionMutation = useProvisionCard();

  const handleProvision = async () => {
    if (!brandId || !denomination) {
      toast({
        title: 'Missing gift card configuration',
        description: 'This condition does not have a gift card configured',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await provisionMutation.mutateAsync({
        campaignId,
        recipientId,
        brandId,
        denomination,
        conditionNumber,
      });

      if (result.success && result.card) {
        setProvisionedCard(result.card);
        toast({
          title: 'Gift card provisioned!',
          description: `${result.card.brandName} ${formatCurrency(result.card.denomination)} ready for delivery`,
        });
        onSuccess?.(result.card);
      }
    } catch (error: any) {
      toast({
        title: 'Provisioning failed',
        description: error.message || 'Failed to provision gift card',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  if (!brandId || !denomination) {
    return (
      <Alert>
        <AlertDescription>
          No gift card configured for this condition
        </AlertDescription>
      </Alert>
    );
  }

  if (provisionedCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Gift Card Ready
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {provisionedCard.brandLogo && (
              <img
                src={provisionedCard.brandLogo}
                alt={provisionedCard.brandName}
                className="w-16 h-16 rounded object-contain"
              />
            )}
            <div>
              <div className="font-semibold text-lg">{provisionedCard.brandName}</div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(provisionedCard.denomination)}
              </div>
            </div>
            <Badge variant={provisionedCard.source === 'inventory' ? 'default' : 'secondary'}>
              {provisionedCard.source === 'inventory' ? 'From Inventory' : 'From Tillo API'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded">
              <div>
                <div className="text-xs text-muted-foreground">Card Code</div>
                <div className="font-mono font-semibold">{formatCardCode(provisionedCard.cardCode)}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(provisionedCard.cardCode)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {provisionedCard.cardNumber && (
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <div className="text-xs text-muted-foreground">Card Number</div>
                  <div className="font-mono font-semibold">{provisionedCard.cardNumber}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(provisionedCard.cardNumber)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}

            {provisionedCard.expirationDate && (
              <div className="text-sm text-muted-foreground">
                Expires: {new Date(provisionedCard.expirationDate).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Send className="mr-2 h-4 w-4" />
              Send via SMS
            </Button>
            <Button variant="outline" className="flex-1">
              <Send className="mr-2 h-4 w-4" />
              Send via Email
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Gift Card Reward
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Click below to provision a gift card for this recipient. The system will use available inventory
              or purchase from Tillo API if needed.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleProvision}
            disabled={disabled || provisionMutation.isPending}
            className="w-full"
            size="lg"
          >
            {provisionMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Provisioning...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-5 w-5" />
                Provision Gift Card
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

