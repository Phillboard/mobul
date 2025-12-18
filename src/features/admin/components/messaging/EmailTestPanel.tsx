/**
 * EmailTestPanel
 * 
 * Admin panel for testing email delivery.
 * Allows sending test emails of different types (plain, verification, gift card).
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Loader2, CheckCircle2, XCircle, Send, Mail, FileText, AlertCircle } from 'lucide-react';
import { useMessagingTest } from '../../hooks/useMessagingTest';

// Email type options
const emailTypes = [
  { value: 'plain', label: 'Plain Text', description: 'Simple text email' },
  { value: 'verification', label: 'Verification Email', description: 'User verification email template' },
  { value: 'gift-card', label: 'Gift Card Email', description: 'Gift card delivery email' },
  { value: 'marketing', label: 'Marketing Email', description: 'Marketing campaign email' },
];

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailTestPanel() {
  const {
    emailTestResult,
    isSendingEmail,
    sendTestEmail,
    clearResults,
  } = useMessagingTest();

  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Test Email from Mobul Platform');
  const [body, setBody] = useState('This is a test email from the Mobul platform. If you received this message, your email configuration is working correctly!\n\nThis is a test message and can be safely ignored.');
  const [emailType, setEmailType] = useState('plain');

  const isValidEmail = EMAIL_REGEX.test(email);

  const handleSendTest = async () => {
    if (!email || !isValidEmail) return;
    await sendTestEmail(email, subject, body, emailType);
  };

  return (
    <div className="space-y-6">
      {/* Email Provider Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration
          </CardTitle>
          <CardDescription>
            Email is sent via Supabase Edge Functions using configured SMTP or email service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium">Email Service</div>
              <div className="text-sm text-muted-foreground">
                Configured via Edge Functions (Resend/NotificationAPI)
              </div>
            </div>
            <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Send Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Test Email
          </CardTitle>
          <CardDescription>
            Send a test email to verify delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-type" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Email Type
            </Label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emailTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Recipient Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {email && !isValidEmail && (
              <div className="text-xs text-amber-600">
                Enter a valid email address
              </div>
            )}
          </div>

          {emailType === 'plain' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message Body</Label>
                <Textarea
                  id="body"
                  placeholder="Enter email body..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                />
              </div>
            </>
          )}

          {emailType === 'verification' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will send a verification email using the system template. 
                The email will contain a test verification link.
              </AlertDescription>
            </Alert>
          )}

          {emailType === 'gift-card' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will send a gift card notification email using the system template.
                No actual gift card will be created - this is a test only.
              </AlertDescription>
            </Alert>
          )}

          {emailType === 'marketing' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will send a marketing email using the standard marketing template.
                The email will be marked as a test and won't affect campaign metrics.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSendTest}
            disabled={!isValidEmail || isSendingEmail}
            className="w-full"
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {emailTestResult && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {emailTestResult.success ? (
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
                  <Badge variant={emailTestResult.success ? 'default' : 'destructive'}>
                    {emailTestResult.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  {(emailTestResult.duration / 1000).toFixed(2)}s
                </div>
                {emailTestResult.messageId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Message ID:</span>{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{emailTestResult.messageId}</code>
                  </div>
                )}
              </div>

              {emailTestResult.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{emailTestResult.error}</AlertDescription>
                </Alert>
              )}

              {emailTestResult.success && (
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  Check your inbox at <strong>{email}</strong> for the test email.
                  It may take a few moments to arrive.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
