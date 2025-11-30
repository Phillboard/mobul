import { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { logger } from '@/lib/services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for Gift Card Operations
 * 
 * Catches errors in gift card provisioning, redemption, and management
 * without crashing the entire application
 */
export class GiftCardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Gift Card Error Boundary caught error:", {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container mx-auto p-6 max-w-2xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Gift Card Error</AlertTitle>
            <AlertDescription>
              <div className="space-y-4">
                <p>
                  Something went wrong with the gift card operation. This could be due to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Gift card pool out of stock</li>
                  <li>Network connectivity issues</li>
                  <li>Invalid redemption code</li>
                  <li>Provisioning system temporarily unavailable</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Error: {this.state.error?.message}
                </p>
                <div className="flex gap-2">
                  <Button onClick={this.handleReset} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={() => window.location.href = '/gift-cards'} variant="default">
                    Back to Gift Cards
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

