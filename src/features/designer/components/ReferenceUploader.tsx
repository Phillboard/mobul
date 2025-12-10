/**
 * ReferenceUploader Component
 * 
 * Allows users to upload a reference postcard for style matching.
 * Analyzes the image using Vision API and enables "generate similar" functionality.
 * 
 * CRITICAL: This component is for STYLE REFERENCE ONLY.
 * The AI analyzes colors, layout, mood - NOT personal data.
 * Generated images never contain text/names/addresses.
 */

import { useCallback, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Upload, X, Sparkles, Loader2 } from 'lucide-react';
import type { ReferenceImageState, ReferenceAnalysis } from '../types/designer';

export interface ReferenceUploaderProps {
  /** Current reference image state */
  referenceImage: ReferenceImageState;
  /** Handler when file is selected */
  onFileSelect: (file: File) => Promise<void>;
  /** Handler to generate similar background */
  onGenerateSimilar: (analysis: ReferenceAnalysis) => Promise<void>;
  /** Handler to clear reference image */
  onClear: () => void;
  /** Whether generation is in progress */
  isGenerating?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/** Maximum file size (5MB) */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Accepted file types */
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function ReferenceUploader({
  referenceImage,
  onFileSelect,
  onGenerateSimilar,
  onClear,
  isGenerating = false,
  className = '',
}: ReferenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate and process file selection
   */
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    await onFileSelect(file);
    
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onFileSelect]);

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, or WebP)');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    await onFileSelect(file);
  }, [onFileSelect]);

  /**
   * Prevent default drag behavior
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Empty state - show upload zone
  if (!referenceImage.file && !referenceImage.previewUrl) {
    return (
      <div className={className}>
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors"
        >
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Upload Reference</p>
          <p className="text-xs text-muted-foreground mt-1">
            Drop a postcard to match its style
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Has image - show preview and analysis
  return (
    <Card className={`p-3 ${className}`}>
      <div className="flex gap-3">
        {/* Preview thumbnail */}
        <div className="relative w-20 h-20 flex-shrink-0">
          {referenceImage.previewUrl && (
            <img
              src={referenceImage.previewUrl}
              alt="Reference postcard"
              className="w-full h-full object-cover rounded border"
            />
          )}
          <button
            onClick={onClear}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm"
            title="Remove reference image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Analysis content */}
        <div className="flex-1 min-w-0">
          {referenceImage.isAnalyzing ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground h-full">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing design...</span>
            </div>
          ) : referenceImage.error ? (
            <div className="text-sm text-red-500">
              {referenceImage.error}
              <button
                onClick={onClear}
                className="block text-xs text-muted-foreground hover:text-foreground mt-1"
              >
                Try another image
              </button>
            </div>
          ) : referenceImage.analysis ? (
            <>
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {referenceImage.analysis.style}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {referenceImage.analysis.mood}
                </Badge>
              </div>
              
              {/* Color palette preview */}
              {referenceImage.analysis.colorPalette && (
                <div className="flex gap-1 mb-2">
                  {Object.values(referenceImage.analysis.colorPalette).map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-sm border border-muted"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              )}

              <Button
                size="sm"
                onClick={() => onGenerateSimilar(referenceImage.analysis!)}
                disabled={isGenerating}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate Similar
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Processing image...
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default ReferenceUploader;

