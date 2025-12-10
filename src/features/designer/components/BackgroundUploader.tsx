/**
 * BackgroundUploader Component
 * 
 * Upload and manage background images for the design canvas.
 * Supports drag-and-drop and file selection.
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Upload, Image as ImageIcon, X, Check } from 'lucide-react';
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

export interface BackgroundUploaderProps {
  /** Current background image URL */
  currentBackground: string | null;
  /** Callback when background is set */
  onBackgroundSet: (url: string) => void;
  /** Callback when background is removed */
  onBackgroundRemove: () => void;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Custom className */
  className?: string;
}

/**
 * BackgroundUploader component
 */
export function BackgroundUploader({
  currentBackground,
  onBackgroundSet,
  onBackgroundRemove,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  className = '',
}: BackgroundUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Handle file upload to Supabase Storage
   */
  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `design-backgrounds/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('designs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('designs')
        .getPublicUrl(filePath);

      onBackgroundSet(urlData.publicUrl);

      toast({
        title: 'Background uploaded',
        description: 'Your background image has been set.',
      });
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload background image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onBackgroundSet, toast]);

  /**
   * Handle file drop/selection
   */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];

    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        variant: 'destructive',
      });
      return;
    }

    uploadFile(file);
  }, [uploadFile, maxFileSize, toast]);

  /**
   * Setup dropzone
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    multiple: false,
    disabled: isUploading,
  });

  /**
   * Remove background
   */
  const handleRemove = useCallback(() => {
    onBackgroundRemove();
    toast({
      title: 'Background removed',
      description: 'Canvas background has been cleared.',
    });
  }, [onBackgroundRemove, toast]);

  return (
    <div className={className}>
      {currentBackground ? (
        // Show current background with remove option
        <Card className="p-4">
          <div className="space-y-3">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={currentBackground}
                alt="Current background"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Background image set
            </p>
          </div>
        </Card>
      ) : (
        // Show upload area
        <Card
          {...getRootProps()}
          className={`p-8 border-2 border-dashed cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            {isUploading ? (
              <>
                <Upload className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-sm font-medium">Uploading...</p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </>
            ) : isDragActive ? (
              <>
                <ImageIcon className="h-12 w-12 text-primary" />
                <p className="text-sm font-medium">Drop your background image here</p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium mb-1">
                    Upload Background Image
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag & drop or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF, WEBP up to {Math.round(maxFileSize / 1024 / 1024)}MB
                </p>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

