/**
 * PreviewModeToggle Component
 * 
 * Toggle between showing template tokens ({{first_name}}) vs preview values (John).
 * Helps users visualize how the final personalized mail will look.
 */

import React from 'react';
import { Braces, User } from 'lucide-react';
import { cn } from '@shared/utils/cn';

export interface PreviewModeToggleProps {
  isPreviewMode: boolean;
  onToggle: (value: boolean) => void;
  className?: string;
}

export function PreviewModeToggle({
  isPreviewMode,
  onToggle,
  className,
}: PreviewModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-gray-600 font-medium">Preview:</span>
      <div className="flex rounded-md overflow-hidden border border-gray-300 shadow-sm">
        <button
          className={cn(
            "px-4 py-2 text-sm font-medium transition-all flex items-center gap-2",
            !isPreviewMode 
              ? "bg-white text-gray-900 shadow-sm" 
              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
          )}
          onClick={() => onToggle(false)}
          title="Show template tokens ({{first_name}})"
        >
          <Braces className="w-4 h-4" />
          <span>Tokens</span>
        </button>
        <button
          className={cn(
            "px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 border-l",
            isPreviewMode 
              ? "bg-white text-gray-900 shadow-sm" 
              : "bg-gray-50 text-gray-500 hover:bg-gray-100"
          )}
          onClick={() => onToggle(true)}
          title="Show preview values (John)"
        >
          <User className="w-4 h-4" />
          <span>Preview</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Compact version for toolbars
 */
export function PreviewModeToggleCompact({
  isPreviewMode,
  onToggle,
  className,
}: PreviewModeToggleProps) {
  return (
    <div className={cn("flex rounded-md overflow-hidden border border-gray-300", className)}>
      <button
        className={cn(
          "p-2 transition-all",
          !isPreviewMode 
            ? "bg-white text-gray-900" 
            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
        )}
        onClick={() => onToggle(false)}
        title="Show tokens"
      >
        <Braces className="w-4 h-4" />
      </button>
      <button
        className={cn(
          "p-2 transition-all border-l",
          isPreviewMode 
            ? "bg-white text-gray-900" 
            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
        )}
        onClick={() => onToggle(true)}
        title="Show preview"
      >
        <User className="w-4 h-4" />
      </button>
    </div>
  );
}

