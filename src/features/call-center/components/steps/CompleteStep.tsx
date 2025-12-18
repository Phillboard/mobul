/**
 * Complete Step Component
 * 
 * Displays the provisioned gift card details and allows
 * resending SMS or starting a new redemption.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { PoolInventoryWidget } from '../PoolInventoryWidget';
import { ResendSmsButton } from '../ResendSmsButton';
import { 
  CheckCircle, Copy, RotateCcw, User, Phone, 
  AlertCircle, Zap 
} from 'lucide-react';
import { useToast } from '@shared/hooks';
import type { ProvisionResult } from '../hooks/useRedemptionWorkflow';

interface CompleteStepProps {
  result: ProvisionResult;
  isSimulatedMode: boolean;
  onStartNew: () => void;
}

export function CompleteStep({
  result,
  isSimulatedMode,
  onStartNew,
}: CompleteStepProps) {
  const { toast } = useToast();

  const card = result.giftCard;
  const pool = card.gift_card_pools;
  const brand = pool?.gift_card_brands;
  const value = pool?.card_value || card.card_value || 0;

  const copyAllDetails = () => {
    const details = `${brand?.brand_name || pool?.provider || 'Gift Card'}
Value: $${value.toFixed(2)}
${card.card_number ? `Card Number: ${card.card_number}` : ''}
Code: ${card.card_code}
${card.expiration_date ? `Expires: ${new Date(card.expiration_date).toLocaleDateString()}` : ''}`;

    navigator.clipboard.writeText(details);
    toast({
      title: 'Copied!',
      description: 'All gift card details copied to clipboard',
    });
  };

  return (
    <>
      {/* Pool Inventory */}
      {pool?.id && (
        <PoolInventoryWidget poolId={pool.id} />
      )}

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Gift Card Provisioned
            </span>
            <Button onClick={copyAllDetails} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
          </CardTitle>
          <CardDescription>
            Share these details with the customer
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Customer Info */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {result.recipient.firstName} {result.recipient.lastName}
            </span>
            {result.recipient.phone && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{result.recipient.phone}</span>
              </>
            )}
          </div>

          {/* Brand and Value */}
          <div className="text-center space-y-2">
            {brand?.logo_url && (
              <img
                src={brand.logo_url}
                alt={brand.brand_name}
                className="h-12 mx-auto object-contain"
              />
            )}
            <div className="text-4xl font-bold text-primary">
              ${value.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              {brand?.brand_name || pool?.provider || 'Gift Card'}
            </div>
          </div>

          <Separator />

          {/* Card Details */}
          <div className="space-y-3">
            {card.card_number && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Gift Card Number</div>
                <div className="font-mono text-xl font-bold tracking-wider">
                  {card.card_number}
                </div>
              </div>
            )}

            <div className="bg-muted p-4 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Gift Card Code</div>
              <div className="font-mono text-lg font-semibold">
                {card.card_code}
              </div>
            </div>

            {card.expiration_date && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Expires: {new Date(card.expiration_date).toLocaleDateString()}
                </span>
              </div>
            )}

            {brand?.balance_check_url && (
              <div className="pt-2">
                <a
                  href={brand.balance_check_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Check balance online →
                </a>
              </div>
            )}
          </div>

          {/* Simulation Mode Banner */}
          {isSimulatedMode && (
            <Alert className="border-yellow-400 bg-yellow-50">
              <Zap className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                <strong>🧪 Simulation Mode Active</strong> - SMS delivery was skipped.
                You can manually send the gift card details to the customer.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="pt-4 space-y-2">
            {result.recipient.phone && !isSimulatedMode && (
              <ResendSmsButton
                giftCardId={card.id}
                recipientId={result.recipient.id}
                recipientPhone={result.recipient.phone}
                giftCardCode={card.card_code}
                giftCardValue={value}
                brandName={brand?.brand_name || pool?.provider}
                cardNumber={card.card_number || undefined}
              />
            )}

            {/* Simulated mode - show imitate resend button */}
            {isSimulatedMode && result.recipient.phone && (
              <Button
                className="w-full border-dashed border-2 border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                variant="outline"
                onClick={() => {
                  toast({
                    title: '🧪 Simulated SMS Resent',
                    description: `Would send gift card to ${result.recipient.phone}`,
                  });
                }}
              >
                <Zap className="h-4 w-4 mr-2" />
                Imitate SMS Resend
              </Button>
            )}

            <Button onClick={onStartNew} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Redeem Another Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
