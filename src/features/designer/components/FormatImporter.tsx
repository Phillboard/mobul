/**
 * FormatImporter Component
 * 
 * Import designs from various formats:
 * - PDF (as background image)
 * - PNG/JPG (as background)
 * - Canva (URL or download)
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileImage,
  FileText,
  Link,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@shared/hooks';

export interface FormatImporterProps {
  /** Callback when background is set from import */
  onBackgroundSet: (url: string) => void;
  /** Callback when import is complete */
  onImportComplete?: (data: ImportResult) => void;
  /** Optional className */
  className?: string;
}

export interface ImportResult {
  type: 'pdf' | 'image' | 'canva';
  url: string;
  width?: number;
  height?: number;
}

export function FormatImporter({
  onBackgroundSet,
  onImportComplete,
  className = '',
}: FormatImporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canvaUrl, setCanvaUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      // For images, create a data URL
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          onBackgroundSet(url);
          onImportComplete?.({
            type: 'image',
            url,
          });
          toast({
            title: 'Image imported',
            description: 'The image has been set as your background.',
          });
          setIsOpen(false);
        };
        reader.readAsDataURL(file);
      }
      // For PDFs, we'd need server-side conversion
      else if (file.type === 'application/pdf') {
        toast({
          title: 'PDF Import',
          description: 'PDF import requires server-side processing. Feature coming soon.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onBackgroundSet, onImportComplete, toast]);

  const handleCanvaImport = useCallback(async () => {
    if (!canvaUrl.trim()) return;

    setIsLoading(true);
    try {
      // For Canva designs, we'd typically need to:
      // 1. Extract the design ID from the URL
      // 2. Use Canva API to export as image
      // For now, show a placeholder message
      toast({
        title: 'Canva Import',
        description: 'Canva API integration coming soon. For now, export from Canva and upload the image.',
        variant: 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [canvaUrl, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Design</DialogTitle>
          <DialogDescription>
            Import a design from various formats to use as your starting point.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="image" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="image">
              <FileImage className="h-4 w-4 mr-2" />
              Image
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="canva">
              <Link className="h-4 w-4 mr-2" />
              Canva
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="space-y-4 pt-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileImage className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload a PNG or JPG image to use as your background
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="pdf" className="space-y-4 pt-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload a PDF to convert to an editable design
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-input"
              />
              <Button
                onClick={() => document.getElementById('pdf-input')?.click()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose PDF
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              PDF import converts your PDF to an image background
            </p>
          </TabsContent>

          <TabsContent value="canva" className="space-y-4 pt-4">
            <div className="space-y-3">
              <Label>Canva Design URL</Label>
              <Input
                type="url"
                placeholder="https://www.canva.com/design/..."
                value={canvaUrl}
                onChange={(e) => setCanvaUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paste the share link from your Canva design
              </p>
              <Button
                onClick={handleCanvaImport}
                disabled={!canvaUrl.trim() || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import from Canva
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

