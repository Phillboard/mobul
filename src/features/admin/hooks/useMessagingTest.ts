/**
 * useMessagingTest
 * 
 * Hook for testing SMS and email delivery from the admin dashboard.
 * Provides provider status checking and test message sending capabilities.
 */

import { useState, useCallback } from "react";
import { supabase } from "@core/services/supabase";
import { useToast } from "@/shared/hooks";

// SMS Provider types
export type SMSProvider = 'notificationapi' | 'infobip' | 'twilio' | 'eztexting';

export interface ProviderStatus {
  available: boolean;
  active: boolean;
  role: string;
  credits?: number;
}

export interface SMSProviderConfig {
  providers: Record<SMSProvider, ProviderStatus>;
  primaryProvider: SMSProvider;
  fallbackChain: SMSProvider[];
  fallbackEnabled: boolean;
  activeProvider: SMSProvider;
}

export interface SMSTestResult {
  success: boolean;
  provider: SMSProvider;
  messageId?: string;
  status?: string;
  error?: string;
  fallbackUsed?: boolean;
  attempts?: Array<{
    provider: SMSProvider;
    success: boolean;
    error?: string;
  }>;
  formattedPhone?: string;
  duration: number;
}

export interface EmailTestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  duration: number;
}

export interface UseMessagingTestReturn {
  // SMS
  smsProviderConfig: SMSProviderConfig | null;
  smsTestResult: SMSTestResult | null;
  isFetchingProviders: boolean;
  isSendingSMS: boolean;
  fetchProviderStatus: () => Promise<void>;
  sendTestSMS: (phone: string, message: string) => Promise<SMSTestResult>;
  
  // Email
  emailTestResult: EmailTestResult | null;
  isSendingEmail: boolean;
  sendTestEmail: (email: string, subject: string, body: string, type?: string) => Promise<EmailTestResult>;
  
  // General
  clearResults: () => void;
}

export function useMessagingTest(): UseMessagingTestReturn {
  const { toast } = useToast();

  // SMS state
  const [smsProviderConfig, setSmsProviderConfig] = useState<SMSProviderConfig | null>(null);
  const [smsTestResult, setSmsTestResult] = useState<SMSTestResult | null>(null);
  const [isFetchingProviders, setIsFetchingProviders] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  // Email state
  const [emailTestResult, setEmailTestResult] = useState<EmailTestResult | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  /**
   * Fetch SMS provider configuration and status
   */
  const fetchProviderStatus = useCallback(async () => {
    setIsFetchingProviders(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-sms-provider', {
        body: { mode: 'status' }
      });

      if (error) {
        console.error('[useMessagingTest] Provider status error:', error);
        toast({
          title: 'Failed to fetch provider status',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        setSmsProviderConfig({
          providers: data.providers,
          primaryProvider: data.primaryProvider,
          fallbackChain: data.fallbackChain,
          fallbackEnabled: data.fallbackEnabled,
          activeProvider: data.activeProvider,
        });
      } else {
        toast({
          title: 'Failed to fetch provider status',
          description: data?.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[useMessagingTest] Provider status exception:', err);
      toast({
        title: 'Failed to fetch provider status',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingProviders(false);
    }
  }, [toast]);

  /**
   * Send a test SMS
   */
  const sendTestSMS = useCallback(async (phone: string, message: string): Promise<SMSTestResult> => {
    setIsSendingSMS(true);
    setSmsTestResult(null);

    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke('test-sms-provider', {
        body: { 
          mode: 'send',
          phone,
          message,
        }
      });

      const duration = Date.now() - startTime;

      if (error) {
        const result: SMSTestResult = {
          success: false,
          provider: 'notificationapi', // fallback
          error: error.message,
          duration,
        };
        setSmsTestResult(result);
        
        toast({
          title: 'SMS send failed',
          description: error.message,
          variant: 'destructive',
        });
        
        return result;
      }

      const result: SMSTestResult = {
        success: data.success,
        provider: data.provider,
        messageId: data.messageId,
        status: data.status,
        error: data.error,
        fallbackUsed: data.fallbackUsed,
        attempts: data.attempts,
        formattedPhone: data.formattedPhone,
        duration: data.duration || duration,
      };

      setSmsTestResult(result);

      if (result.success) {
        toast({
          title: 'Test SMS sent successfully',
          description: `Sent via ${result.provider}${result.fallbackUsed ? ' (fallback)' : ''}`,
        });
      } else {
        toast({
          title: 'SMS send failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      const result: SMSTestResult = {
        success: false,
        provider: 'notificationapi',
        error: err instanceof Error ? err.message : 'Unknown error',
        duration,
      };
      setSmsTestResult(result);
      
      toast({
        title: 'SMS send failed',
        description: result.error,
        variant: 'destructive',
      });
      
      return result;
    } finally {
      setIsSendingSMS(false);
    }
  }, [toast]);

  /**
   * Send a test email
   */
  const sendTestEmail = useCallback(async (
    email: string, 
    subject: string, 
    body: string,
    type: string = 'plain'
  ): Promise<EmailTestResult> => {
    setIsSendingEmail(true);
    setEmailTestResult(null);

    const startTime = Date.now();

    try {
      // Determine which edge function to use based on type
      let functionName = 'send-email';
      let functionBody: Record<string, unknown> = {
        to: email,
        subject,
        body,
        html: body,
      };

      if (type === 'verification') {
        functionName = 'send-verification-email';
        functionBody = {
          email,
          type: 'test',
        };
      } else if (type === 'gift-card') {
        functionName = 'send-gift-card-email';
        functionBody = {
          email,
          subject,
          testMode: true,
        };
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: functionBody,
      });

      const duration = Date.now() - startTime;

      if (error) {
        const result: EmailTestResult = {
          success: false,
          error: error.message,
          duration,
        };
        setEmailTestResult(result);
        
        toast({
          title: 'Email send failed',
          description: error.message,
          variant: 'destructive',
        });
        
        return result;
      }

      const result: EmailTestResult = {
        success: data?.success !== false,
        messageId: data?.messageId || data?.id,
        error: data?.error,
        duration,
      };

      setEmailTestResult(result);

      if (result.success) {
        toast({
          title: 'Test email sent successfully',
          description: `Email sent to ${email}`,
        });
      } else {
        toast({
          title: 'Email send failed',
          description: result.error || 'Unknown error',
          variant: 'destructive',
        });
      }

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      const result: EmailTestResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        duration,
      };
      setEmailTestResult(result);
      
      toast({
        title: 'Email send failed',
        description: result.error,
        variant: 'destructive',
      });
      
      return result;
    } finally {
      setIsSendingEmail(false);
    }
  }, [toast]);

  /**
   * Clear all test results
   */
  const clearResults = useCallback(() => {
    setSmsTestResult(null);
    setEmailTestResult(null);
  }, []);

  return {
    // SMS
    smsProviderConfig,
    smsTestResult,
    isFetchingProviders,
    isSendingSMS,
    fetchProviderStatus,
    sendTestSMS,
    
    // Email
    emailTestResult,
    isSendingEmail,
    sendTestEmail,
    
    // General
    clearResults,
  };
}
