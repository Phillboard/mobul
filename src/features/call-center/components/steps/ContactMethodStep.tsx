/**
 * Contact Method Step Component
 * 
 * Handles entering the phone number for SMS gift card delivery.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { MessageSquare, CheckCircle, User, ArrowRight } from 'lucide-react';
import type { RecipientData } from '../hooks/useRedemptionWorkflow';

interface ContactMethodStepProps {
  recipient: RecipientData;
  phone: string;
  cellPhone: string;
  onPhoneChange: (phone: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function ContactMethodStep({
  recipient,
  phone,
  cellPhone,
  onPhoneChange,
  onBack,
  onContinue,
}: ContactMethodStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Gift Card SMS Delivery
        </CardTitle>
        <CardDescription>
          Enter the phone number to send the gift card via text message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Opt-in status badge */}
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-700">Customer Opted In</span>
          </div>
          <span className="text-sm text-green-600">Ready to proceed</span>
        </div>

        {/* Show customer name if available */}
        {(recipient.first_name || recipient.last_name) && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {recipient.first_name} {recipient.last_name}
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number for SMS Delivery</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 555-5555"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
            />
            {cellPhone && phone === cellPhone && (
              <p className="text-xs text-muted-foreground">
                ✓ Using the same number from opt-in
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            onClick={onContinue}
            disabled={!phone}
            className="flex-1"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
