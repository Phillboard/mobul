import { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { logger } from '@core/services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for Form Builder
 * 
 * Catches errors in form building and submission
 * without crashing the entire application
 */
export class FormBuilderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Form Builder Error Boundary caught error:", {
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
            <AlertTitle>Form Builder Error</AlertTitle>
            <AlertDescription>
              <div className="space-y-4">
                <p>
                  Something went wrong with the form builder. This could be due to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Invalid form configuration</li>
                  <li>Corrupted form data</li>
                  <li>Browser compatibility issues</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Error: {this.state.error?.message}
                </p>
                <div className="flex gap-2">
                  <Button onClick={this.handleReset} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={() => window.location.href = '/ace-forms'} variant="default">
                    Back to Forms
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

