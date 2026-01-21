/**
 * DesignUploader Component
 * 
 * Allows uploading front and back design images directly.
 * Supports drag-and-drop and file selection.
 */

import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/utils/cn';
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

interface DesignUploaderProps {
  side: 'front' | 'back';
  currentImageUrl?: string | null;
  onImageUpload: (url: string, side: 'front' | 'back') => void;
  onImageRemove: (side: 'front' | 'back') => void;
  className?: string;
}

export function DesignUploader({
  side,
  currentImageUrl,
  onImageUpload,
  onImageRemove,
  className,
}: DesignUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, PDF, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${side}-${Date.now()}.${fileExt}`;
      const filePath = `mail-designs/${fileName}`;

      const { data, error } = await supabase.storage
        .from('templates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      onImageUpload(urlData.publicUrl, side);

      toast({
        title: 'Upload successful',
        description: `${side === 'front' ? 'Front' : 'Back'} design uploaded.`,
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [side, onImageUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      uploadImage(file);
    }
  }, [uploadImage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  }, [uploadImage]);

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">
        {side === 'front' ? 'Front Design' : 'Back Design'}
      </label>

      {currentImageUrl ? (
        <Card className="relative overflow-hidden">
          <img
            src={currentImageUrl}
            alt={`${side} design`}
            className="w-full h-48 object-contain bg-muted"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => onImageRemove(side)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      ) : (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            isUploading && 'opacity-50 pointer-events-none'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drag & drop or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, or PDF (max 10MB)
                </p>
                <input
                  type="file"
                  id={`file-upload-${side}`}
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`file-upload-${side}`)?.click()}
                  className="mt-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
