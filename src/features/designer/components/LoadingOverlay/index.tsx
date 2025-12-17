/**
 * Loading Overlay Component
 * Full-screen loading overlay for AI generation
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { DesignerContext } from '../../types/context';
import { useContextualLoadingMessage } from '../../utils/loadingMessages';

export interface LoadingOverlayProps {
  isVisible: boolean;
  context: DesignerContext;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Loading overlay component
 */
export function LoadingOverlay({
  isVisible,
  context,
  error,
  onRetry,
  onDismiss,
}: LoadingOverlayProps) {
  // Don't render if not visible and no error
  if (!isVisible && !error) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300" />
      
      {/* Content card */}
      <div className="relative bg-white rounded-2xl p-12 max-w-md shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {error ? (
          <ErrorContent error={error} onRetry={onRetry} onDismiss={onDismiss} />
        ) : (
          <LoadingContent context={context} />
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * Loading content (when generating)
 */
function LoadingContent({ context }: { context: DesignerContext }) {
  const message = useContextualLoadingMessage(context, true);
  
  return (
    <div className="text-center">
      {/* Animated spinner */}
      <div className="flex justify-center mb-6">
        <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
      </div>
      
      {/* Main message - rotates */}
      <p className="text-lg font-semibold text-gray-900 min-h-[54px] flex items-center justify-center">
        {message}
      </p>
      
      {/* Secondary message - static */}
      <p className="text-sm text-gray-600 mt-2">
        This may take 10-15 seconds for image generation
      </p>
      
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mt-6">
        <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}

/**
 * Error content (when generation fails)
 */
function ErrorContent({ 
  error, 
  onRetry, 
  onDismiss 
}: { 
  error: string; 
  onRetry?: () => void; 
  onDismiss?: () => void;
}) {
  return (
    <div className="text-center">
      {/* Error icon */}
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
      </div>
      
      {/* Error title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      
      {/* Error message */}
      <p className="text-sm text-gray-600 mb-6">
        {error}
      </p>
      
      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        {onRetry && (
          <Button onClick={onRetry} size="sm">
            Try Again
          </Button>
        )}
        {onDismiss && (
          <Button onClick={onDismiss} variant="ghost" size="sm">
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
