/**
 * TwilioConfigForm Component
 * 
 * Form for entering and validating Twilio credentials.
 * Requires successful connection test before saving.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Phone, Save } from 'lucide-react';
import { TwilioNumberSelector } from './TwilioNumberSelector';
import { useTestTwilioConnection, useUpdateTwilioConfig } from '../../hooks/useTwilioConfig';
import type { TwilioOwnConfig, TwilioTestResult } from '../../types/twilio';

const twilioConfigSchema = z.object({
  accountSid: z.string()
    .min(34, 'Account SID must be 34 characters')
    .max(34, 'Account SID must be 34 characters')
    .regex(/^AC/, 'Account SID must start with "AC"'),
  authToken: z.string().min(1, 'Auth Token is required'),
  // Phone number is optional initially - validated manually before save
  phoneNumber: z.string().optional(),
  enabled: z.boolean(),
  friendlyName: z.string().optional(),
  monthlyLimit: z.number().optional(),
});

type TwilioConfigFormValues = z.infer<typeof twilioConfigSchema>;

interface TwilioConfigFormProps {
  level: 'client' | 'agency' | 'admin';
  entityId?: string;
  initialData?: TwilioOwnConfig | null;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

type FormState = 'idle' | 'testing' | 'test_success' | 'test_failed' | 'saving' | 'saved';

export function TwilioConfigForm({
  level,
  entityId,
  initialData,
  onSaveSuccess,
  onCancel,
}: TwilioConfigFormProps) {
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [formState, setFormState] = useState<FormState>('idle');
  const [testResult, setTestResult] = useState<TwilioTestResult | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  
  const testConnection = useTestTwilioConnection();
  const updateConfig = useUpdateTwilioConfig();

  const form = useForm<TwilioConfigFormValues>({
    resolver: zodResolver(twilioConfigSchema),
    mode: 'onSubmit', // Only validate on submit, not on change
    reValidateMode: 'onSubmit',
    defaultValues: {
      accountSid: '',
      authToken: '',
      phoneNumber: '',
      enabled: true,
      friendlyName: '',
      monthlyLimit: undefined,
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData?.configured) {
      form.reset({
        accountSid: initialData.accountSidLast4 ? `AC${'*'.repeat(30)}${initialData.accountSidLast4}` : '',
        authToken: '', // Never pre-fill auth token
        phoneNumber: initialData.phoneNumber || '',
        enabled: initialData.enabled,
        friendlyName: initialData.friendlyName || '',
        monthlyLimit: initialData.monthlyLimit || undefined,
      });
    }
  }, [initialData, form]);

  const watchAccountSid = form.watch('accountSid');
  const watchAuthToken = form.watch('authToken');
  const watchPhoneNumber = form.watch('phoneNumber');

  // Reset test status when credentials change
  useEffect(() => {
    if (formState === 'test_success' || formState === 'test_failed') {
      setFormState('idle');
      setTestResult(null);
    }
  }, [watchAccountSid, watchAuthToken, watchPhoneNumber]);

  const handleTestConnection = async () => {
    setHasAttemptedSubmit(true);
    
    // Trigger validation
    const isValid = await form.trigger();
    const values = form.getValues();
    
    // Validate required fields first
    if (!values.accountSid || values.accountSid.includes('*')) {
      form.setError('accountSid', { message: 'Please enter a valid Account SID' });
      return;
    }
    if (!values.authToken) {
      form.setError('authToken', { message: 'Auth Token is required' });
      return;
    }
    
    // Phone number validation - only required if we're testing the full config
    if (values.phoneNumber && !/^\+[1-9]\d{1,14}$/.test(values.phoneNumber)) {
      form.setError('phoneNumber', { message: 'Phone number must be in E.164 format (e.g., +12025551234)' });
      return;
    }

    setFormState('testing');
    setTestResult(null);

    try {
      const result = await testConnection.mutateAsync({
        accountSid: values.accountSid,
        authToken: values.authToken,
        phoneNumber: values.phoneNumber || undefined,
      });

      setTestResult(result);
      setFormState(result.success ? 'test_success' : 'test_failed');
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      });
      setFormState('test_failed');
    }
  };

  const handleSubmit = async (values: TwilioConfigFormValues) => {
    if (formState !== 'test_success') {
      // Force test before save
      await handleTestConnection();
      return;
    }

    setFormState('saving');

    try {
      await updateConfig.mutateAsync({
        level,
        entityId,
        config: {
          accountSid: values.accountSid,
          authToken: values.authToken,
          phoneNumber: values.phoneNumber,
          enabled: values.enabled,
          friendlyName: values.friendlyName,
          monthlyLimit: values.monthlyLimit,
        },
        expectedVersion: initialData?.configVersion,
      });

      setFormState('saved');
      onSaveSuccess?.();
    } catch (error) {
      setFormState('test_success'); // Allow retry
    }
  };

  const isTestButtonDisabled = formState === 'testing' || formState === 'saving';
  const isSaveButtonDisabled = formState !== 'test_success' || formState === 'saving';

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {/* Account SID */}
      <div className="space-y-2">
        <Label htmlFor="accountSid">Account SID</Label>
        <Input
          id="accountSid"
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          {...form.register('accountSid')}
          disabled={formState === 'saving'}
        />
        {form.formState.errors.accountSid && (
          <p className="text-xs text-destructive">{form.formState.errors.accountSid.message}</p>
        )}
      </div>

      {/* Auth Token */}
      <div className="space-y-2">
        <Label htmlFor="authToken">Auth Token</Label>
        <div className="relative">
          <Input
            id="authToken"
            type={showAuthToken ? 'text' : 'password'}
            placeholder="Enter your Auth Token"
            {...form.register('authToken')}
            disabled={formState === 'saving'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowAuthToken(!showAuthToken)}
          >
            {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {form.formState.errors.authToken && (
          <p className="text-xs text-destructive">{form.formState.errors.authToken.message}</p>
        )}
      </div>

      {/* Phone Number Selector */}
      <TwilioNumberSelector
        accountSid={watchAccountSid.includes('*') ? '' : watchAccountSid}
        authToken={watchAuthToken}
        value={watchPhoneNumber || ''}
        onChange={(phone) => {
          form.setValue('phoneNumber', phone, { shouldValidate: false });
          // Clear any manual phone error when user enters a valid number
          if (phone && /^\+[1-9]\d{1,14}$/.test(phone)) {
            form.clearErrors('phoneNumber');
          }
        }}
        disabled={formState === 'saving'}
      />

      {/* Friendly Name */}
      <div className="space-y-2">
        <Label htmlFor="friendlyName">Friendly Name (optional)</Label>
        <Input
          id="friendlyName"
          placeholder="e.g., Main Business Line"
          {...form.register('friendlyName')}
          disabled={formState === 'saving'}
        />
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="enabled">Enable this Twilio configuration</Label>
          <p className="text-xs text-muted-foreground">
            When disabled, the system will use fallback Twilio instead
          </p>
        </div>
        <Switch
          id="enabled"
          checked={form.watch('enabled')}
          onCheckedChange={(checked) => form.setValue('enabled', checked)}
          disabled={formState === 'saving'}
        />
      </div>

      {/* Test Result Alert */}
      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          <div className="flex items-start gap-2">
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {testResult.success ? (
                <div>
                  <p className="font-medium">Connection successful!</p>
                  {testResult.accountName && (
                    <p className="text-sm">Account: {testResult.accountName}</p>
                  )}
                  {testResult.phoneCapabilities && (
                    <p className="text-sm">
                      Capabilities: {testResult.phoneCapabilities.sms && 'SMS'}{' '}
                      {testResult.phoneCapabilities.mms && 'MMS'}{' '}
                      {testResult.phoneCapabilities.voice && 'Voice'}
                    </p>
                  )}
                </div>
              ) : (
                <p>{testResult.error || 'Connection test failed'}</p>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          disabled={isTestButtonDisabled}
        >
          {formState === 'testing' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Phone className="h-4 w-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={formState === 'saving'}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSaveButtonDisabled}
          >
            {formState === 'saving' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>

      {formState !== 'test_success' && formState !== 'testing' && (
        <p className="text-xs text-muted-foreground text-center">
          You must test the connection before saving
        </p>
      )}
    </form>
  );
}
