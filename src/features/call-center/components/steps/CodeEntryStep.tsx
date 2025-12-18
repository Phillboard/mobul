/**
 * Code Entry Step Component
 * 
 * First step in the call center redemption workflow.
 * Handles entering and validating the customer's redemption code.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Gift, Search, Loader2 } from 'lucide-react';

interface CodeEntryStepProps {
  redemptionCode: string;
  onCodeChange: (code: string) => void;
  onLookup: () => void;
  isLoading: boolean;
}

export function CodeEntryStep({
  redemptionCode,
  onCodeChange,
  onLookup,
  isLoading,
}: CodeEntryStepProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && redemptionCode.trim()) {
      onLookup();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Enter Confirmation Code
        </CardTitle>
        <CardDescription>
          Enter the unique confirmation code provided by the customer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Confirmation Code</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              value={redemptionCode}
              onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g., ABC-1234)"
              className="text-lg font-mono uppercase"
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={onLookup}
              disabled={isLoading || !redemptionCode.trim()}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Looking up...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Look Up
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
