/**
 * SMSTestPanel
 * 
 * Admin panel for testing SMS delivery and viewing provider status.
 * Shows provider availability, fallback chain, and allows sending test messages.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Send, Phone, MessageSquare, Zap, AlertCircle } from 'lucide-react';
import { useMessagingTest, type SMSProvider, type ProviderStatus } from '../../hooks/useMessagingTest';

// Format phone number for display
function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// Format to E.164 for preview
function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return phone;
}

// Provider display config
const providerConfig: Record<SMSProvider, { name: string; color: string }> = {
  notificationapi: { name: 'NotificationAPI', color: 'bg-blue-100 text-blue-800' },
  infobip: { name: 'Infobip', color: 'bg-purple-100 text-purple-800' },
  twilio: { name: 'Twilio', color: 'bg-red-100 text-red-800' },
  eztexting: { name: 'EZTexting', color: 'bg-green-100 text-green-800' },
};

interface ProviderCardProps {
  provider: SMSProvider;
  status: ProviderStatus;
}

function ProviderCard({ provider, status }: ProviderCardProps) {
  const config = providerConfig[provider];
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${status.active ? 'bg-primary/5 border-primary' : 'bg-muted/30'}`}>
      <div className="flex items-center gap-3">
        {status.available ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <div className="font-medium">{config.name}</div>
          {status.credits !== undefined && (
            <div className="text-xs text-muted-foreground">Credits: {status.credits.toLocaleString()}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status.available ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Configured
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-50 text-gray-500">
            Not configured
          </Badge>
        )}
        {status.role === 'primary' && (
          <Badge className="bg-primary">Primary</Badge>
        )}
        {status.role.startsWith('fallback') && (
          <Badge variant="secondary">{status.role.replace('-', ' ')}</Badge>
        )}
        {status.active && status.role !== 'primary' && (
          <Badge className="bg-amber-500">Active (fallback)</Badge>
        )}
      </div>
    </div>
  );
}

export function SMSTestPanel() {
  const {
    smsProviderConfig,
    smsTestResult,
    isFetchingProviders,
    isSendingSMS,
    fetchProviderStatus,
    sendTestSMS,
    clearResults,
  } = useMessagingTest();

  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('This is a test SMS from the Mobul platform. If you received this message, your SMS configuration is working correctly!');

  // Fetch provider status on mount
  useEffect(() => {
    fetchProviderStatus();
  }, [fetchProviderStatus]);

  const handleSendTest = async () => {
    if (!phone || !message) return;
    await sendTestSMS(phone, message);
  };

  const phoneDigits = phone.replace(/\D/g, '');
  const isValidPhone = phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith('1'));

  return (
    <div className="space-y-6">
      {/* Provider Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              SMS Provider Status
            </CardTitle>
            <CardDescription>
              View configured SMS providers and their current status
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchProviderStatus}
            disabled={isFetchingProviders}
          >
            {isFetchingProviders ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isFetchingProviders && !smsProviderConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : smsProviderConfig ? (
            <div className="space-y-4">
              <div className="grid gap-3">
                {(Object.entries(smsProviderConfig.providers) as [SMSProvider, ProviderStatus][]).map(([provider, status]) => (
                  <ProviderCard key={provider} provider={provider} status={status} />
                ))}
              </div>
              
              {smsProviderConfig.fallbackEnabled && smsProviderConfig.fallbackChain.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Fallback Chain:</span>{' '}
                    {smsProviderConfig.fallbackChain.map((p, i) => (
                      <span key={p}>
                        {i > 0 && ' → '}
                        {providerConfig[p].name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load provider status. Check your connection and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Send Test SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Test SMS
          </CardTitle>
          <CardDescription>
            Send a test message to verify SMS delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {phone && (
              <div className="text-xs text-muted-foreground">
                {isValidPhone ? (
                  <span className="text-green-600">
                    Formatted: {formatE164(phone)}
                  </span>
                ) : (
                  <span className="text-amber-600">
                    Enter a valid 10-digit US phone number
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message
            </Label>
            <Textarea
              id="message"
              placeholder="Enter test message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <div className="text-xs text-muted-foreground">
              {message.length}/160 characters
              {message.length > 160 && (
                <span className="text-amber-600"> (will be sent as {Math.ceil(message.length / 153)} segments)</span>
              )}
            </div>
          </div>

          <Button
            onClick={handleSendTest}
            disabled={!isValidPhone || !message || isSendingSMS}
            className="w-full"
          >
            {isSendingSMS ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test SMS
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {smsTestResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {smsTestResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Test Results
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={clearResults}>
              Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge variant={smsTestResult.success ? 'default' : 'destructive'}>
                    {smsTestResult.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider:</span>{' '}
                  <Badge className={providerConfig[smsTestResult.provider]?.color || ''}>
                    {providerConfig[smsTestResult.provider]?.name || smsTestResult.provider}
                  </Badge>
                </div>
                {smsTestResult.messageId && (
                  <div>
                    <span className="text-muted-foreground">Message ID:</span>{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{smsTestResult.messageId}</code>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  {(smsTestResult.duration / 1000).toFixed(2)}s
                </div>
                {smsTestResult.fallbackUsed && (
                  <div className="col-span-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Fallback provider was used
                    </Badge>
                  </div>
                )}
              </div>

              {smsTestResult.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{smsTestResult.error}</AlertDescription>
                </Alert>
              )}

              {smsTestResult.attempts && smsTestResult.attempts.length > 1 && (
                <div className="pt-3 border-t">
                  <div className="text-sm font-medium mb-2">Delivery Attempts:</div>
                  <div className="space-y-2">
                    {smsTestResult.attempts.map((attempt, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {attempt.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span>{providerConfig[attempt.provider]?.name || attempt.provider}</span>
                        {attempt.error && (
                          <span className="text-muted-foreground">- {attempt.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {smsTestResult.formattedPhone && (
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  Sent to: {formatPhoneDisplay(smsTestResult.formattedPhone)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
