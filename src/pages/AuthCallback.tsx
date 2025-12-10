/**
 * AuthCallback Page
 * 
 * Handles OAuth redirect after Google/Apple sign-in.
 * Processes the authentication callback and redirects user appropriately.
 * 
 * Flow:
 * 1. OAuth provider redirects here with auth code
 * 2. Supabase exchanges code for session
 * 3. On success: redirect to dashboard (/)
 * 4. On error: redirect to auth page with error message
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@core/services/supabase';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the session from the URL hash/query params
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('OAuth callback error:', error);
        setError(error.message);
        // Redirect to auth page with error after 3 seconds
        setTimeout(() => {
          navigate(`/auth?error=${encodeURIComponent(error.message)}`);
        }, 3000);
        return;
      }

      if (data.session) {
        // Successfully authenticated
        console.log('OAuth authentication successful');
        // Redirect to dashboard
        navigate('/');
      } else {
        // No session found
        setError('No session found. Please try signing in again.');
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    } catch (err) {
      console.error('Unexpected error during OAuth callback:', err);
      setError('An unexpected error occurred. Please try again.');
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Authentication Error</CardTitle>
            <CardDescription>
              There was a problem completing your sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <p className="text-xs text-muted-foreground">
              Redirecting to sign-in page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Completing Sign-In</CardTitle>
          <CardDescription>
            Please wait while we complete your authentication...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Verifying your credentials...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

