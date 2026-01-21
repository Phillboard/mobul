/**
 * TwilioNumberSelector Component
 * 
 * Allows user to select a phone number from their Twilio account or enter manually.
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Phone, MessageSquare, Volume2, RefreshCw, Check } from 'lucide-react';
import { useFetchTwilioNumbers } from '../../hooks/useTwilioConfig';
import { cn } from '@/shared/utils/cn';
import type { TwilioPhoneNumber } from '../../types/twilio';

interface TwilioNumberSelectorProps {
  accountSid: string;
  authToken: string;
  value: string;
  onChange: (phoneNumber: string) => void;
  disabled?: boolean;
}

export function TwilioNumberSelector({
  accountSid,
  authToken,
  value,
  onChange,
  disabled = false,
}: TwilioNumberSelectorProps) {
  const [tab, setTab] = useState<'fetch' | 'manual'>('fetch');
  const [manualValue, setManualValue] = useState(value || '');
  
  const canFetch = accountSid?.length >= 34 && authToken?.length > 0;
  
  const { 
    data: numbers, 
    isLoading, 
    error, 
    refetch 
  } = useFetchTwilioNumbers(accountSid, authToken);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setManualValue(newValue);
    
    // Basic E.164 validation
    if (/^\+[1-9]\d{1,14}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleSelectNumber = (number: TwilioPhoneNumber) => {
    onChange(number.phoneNumber);
  };

  const formatPhoneDisplay = (phone: string) => {
    // Format +12025551234 as +1 (202) 555-1234
    if (phone.startsWith('+1') && phone.length === 12) {
      return `+1 (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-3">
      <Label>Phone Number</Label>
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'fetch' | 'manual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fetch" disabled={!canFetch || disabled}>
            Fetch from Twilio
          </TabsTrigger>
          <TabsTrigger value="manual" disabled={disabled}>
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fetch" className="mt-3">
          {!canFetch ? (
            <p className="text-sm text-muted-foreground">
              Enter Account SID and Auth Token to fetch available numbers.
            </p>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-4 space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground mb-2">
                  Unable to fetch phone numbers automatically.
                </p>
                <p className="text-xs text-muted-foreground">
                  You can enter your phone number manually using the "Manual Entry" tab.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button variant="default" size="sm" onClick={() => setTab('manual')}>
                  Enter Manually
                </Button>
              </div>
            </div>
          ) : !numbers || numbers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-2">
                No SMS-capable phone numbers found in this account.
              </p>
              <a 
                href="https://console.twilio.com/us1/develop/phone-numbers/manage/search"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Purchase numbers at Twilio
              </a>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {numbers.map((number) => (
                <button
                  key={number.sid}
                  type="button"
                  onClick={() => handleSelectNumber(number)}
                  disabled={disabled}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors',
                    value === number.phoneNumber
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div>
                    <p className="font-medium">{formatPhoneDisplay(number.phoneNumber)}</p>
                    {number.friendlyName !== number.phoneNumber && (
                      <p className="text-sm text-muted-foreground">{number.friendlyName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {number.capabilities.sms && (
                      <MessageSquare className="h-4 w-4 text-muted-foreground" title="SMS" />
                    )}
                    {number.capabilities.mms && (
                      <Phone className="h-4 w-4 text-muted-foreground" title="MMS" />
                    )}
                    {number.capabilities.voice && (
                      <Volume2 className="h-4 w-4 text-muted-foreground" title="Voice" />
                    )}
                    {value === number.phoneNumber && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-3">
          <div className="space-y-2">
            <Input
              placeholder="+12025551234"
              value={manualValue}
              onChange={handleManualChange}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Enter in E.164 format: +[country code][number]
            </p>
            {manualValue && !/^\+[1-9]\d{1,14}$/.test(manualValue) && (
              <p className="text-xs text-destructive">
                Invalid format. Example: +12025551234
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Selected number display */}
      {value && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Selected: <strong>{formatPhoneDisplay(value)}</strong></span>
        </div>
      )}
    </div>
  );
}
