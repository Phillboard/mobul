/**
 * PreviewModal Component
 * 
 * Preview and export options for mail designs:
 * - Quick preview (PDF)
 * - Proof with sample data (variable replacement)
 * - Print preview with trim marks
 * - Export options (PDF, PNG, JPG)
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Eye,
  Download,
  FileText,
  Image,
  Printer,
  Loader2,
  CheckCircle,
  Scissors,
  User,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useToast } from '@shared/hooks';
import type { CanvasState } from '../types/designer';

export interface PreviewModalProps {
  /** Current canvas state */
  canvasState: CanvasState;
  /** Mail format (for dimensions) */
  format?: string;
  /** Export function */
  onExportPDF?: () => Promise<void>;
  onExportPNG?: () => Promise<void>;
  onExportJPG?: () => Promise<void>;
  /** Whether exporting */
  isExporting?: boolean;
  /** Optional className */
  className?: string;
}

/** Sample data for proof preview */
const SAMPLE_DATA = {
  first_name: 'John',
  last_name: 'Smith',
  full_name: 'John Smith',
  unique_code: 'ABC123XYZ',
  company_name: 'Acme Corporation',
  purl: 'https://landing.example.com/john-smith',
  gift_card_amount: '$50',
  address_line1: '123 Main Street',
  city: 'Springfield',
  state: 'IL',
  zip: '62701',
};

export function PreviewModal({
  canvasState,
  format = 'postcard-4x6',
  onExportPDF,
  onExportPNG,
  onExportJPG,
  isExporting = false,
  className = '',
}: PreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'normal' | 'proof' | 'print'>('normal');
  const [previewZoom, setPreviewZoom] = useState(50);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const { toast } = useToast();

  // Calculate scaled dimensions for preview
  const scale = previewZoom / 100;
  const scaledWidth = canvasState.width * scale;
  const scaledHeight = canvasState.height * scale;

  // Replace tokens with sample data
  const replaceTokens = useCallback((content: string): string => {
    let result = content;
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'gi'), value);
    });
    return result;
  }, []);

  // Handle export actions
  const handleExportPDF = async () => {
    try {
      await onExportPDF?.();
      toast({
        title: 'PDF Exported',
        description: 'Your mail piece has been downloaded as PDF.',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleExportPNG = async () => {
    try {
      await onExportPNG?.();
      toast({
        title: 'PNG Exported',
        description: 'Your mail piece has been downloaded as PNG.',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleExportJPG = async () => {
    try {
      await onExportJPG?.();
      toast({
        title: 'JPG Exported',
        description: 'Your mail piece has been downloaded as JPG.',
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGenerateProof = () => {
    setIsGeneratingProof(true);
    // Simulate proof generation
    setTimeout(() => {
      setPreviewMode('proof');
      setIsGeneratingProof(false);
      toast({
        title: 'Proof Generated',
        description: 'Preview shows design with sample recipient data.',
      });
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Preview & Export
            <Badge variant="secondary" className="ml-2">
              {format.replace('-', ' ')}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Preview your design, generate a proof with sample data, or export for production
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Preview Area */}
          <div className="flex-1 space-y-4">
            {/* Preview Mode Tabs */}
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
              <div className="flex items-center justify-between mb-2">
                <TabsList>
                  <TabsTrigger value="normal">
                    <Eye className="h-4 w-4 mr-1" />
                    Normal
                  </TabsTrigger>
                  <TabsTrigger value="proof">
                    <User className="h-4 w-4 mr-1" />
                    Proof
                  </TabsTrigger>
                  <TabsTrigger value="print">
                    <Scissors className="h-4 w-4 mr-1" />
                    Print
                  </TabsTrigger>
                </TabsList>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))}
                    disabled={previewZoom <= 25}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-mono w-12 text-center">{previewZoom}%</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewZoom(Math.min(100, previewZoom + 25))}
                    disabled={previewZoom >= 100}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value="normal" className="mt-0">
                {/* Normal Preview */}
                <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[400px]">
                  <div
                    className="mx-auto shadow-lg"
                    style={{
                      width: scaledWidth,
                      height: scaledHeight,
                      backgroundColor: canvasState.backgroundColor,
                      backgroundImage: canvasState.backgroundImage
                        ? `url(${canvasState.backgroundImage})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                    }}
                  >
                    {canvasState.elements.map((element) => (
                      <div
                        key={element.id}
                        style={{
                          position: 'absolute',
                          left: element.x * scale,
                          top: element.y * scale,
                          width: element.width * scale,
                          height: element.height * scale,
                          fontSize: `${((element.styles?.fontSize || 16) * scale)}px`,
                          color: element.styles?.color,
                          backgroundColor: element.styles?.backgroundColor,
                          fontWeight: element.styles?.fontWeight,
                          fontFamily: element.styles?.fontFamily,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: element.styles?.textAlign || 'left',
                          overflow: 'hidden',
                        }}
                      >
                        {'content' in element && element.content}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="proof" className="mt-0">
                {/* Proof Preview with Sample Data */}
                <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[400px]">
                  <div className="mb-2 p-2 bg-green-100 text-green-800 rounded text-xs flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Showing proof with sample recipient data
                  </div>
                  <div
                    className="mx-auto shadow-lg"
                    style={{
                      width: scaledWidth,
                      height: scaledHeight,
                      backgroundColor: canvasState.backgroundColor,
                      backgroundImage: canvasState.backgroundImage
                        ? `url(${canvasState.backgroundImage})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                    }}
                  >
                    {canvasState.elements.map((element) => {
                      const content = 'content' in element
                        ? replaceTokens(String(element.content))
                        : '';
                      return (
                        <div
                          key={element.id}
                          style={{
                            position: 'absolute',
                            left: element.x * scale,
                            top: element.y * scale,
                            width: element.width * scale,
                            height: element.height * scale,
                            fontSize: `${((element.styles?.fontSize || 16) * scale)}px`,
                            color: element.styles?.color,
                            backgroundColor: element.styles?.backgroundColor,
                            fontWeight: element.styles?.fontWeight,
                            fontFamily: element.styles?.fontFamily,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: element.styles?.textAlign || 'left',
                            overflow: 'hidden',
                          }}
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="print" className="mt-0">
                {/* Print Preview with Trim Marks */}
                <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[400px]">
                  <div className="mb-2 p-2 bg-blue-100 text-blue-800 rounded text-xs flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Print preview with trim marks
                  </div>
                  <div
                    className="mx-auto relative"
                    style={{
                      width: scaledWidth + 40,
                      height: scaledHeight + 40,
                      padding: 20,
                    }}
                  >
                    {/* Trim marks */}
                    <div className="absolute top-0 left-5 w-px h-4 bg-black" />
                    <div className="absolute top-0 right-5 w-px h-4 bg-black" />
                    <div className="absolute bottom-0 left-5 w-px h-4 bg-black" />
                    <div className="absolute bottom-0 right-5 w-px h-4 bg-black" />
                    <div className="absolute left-0 top-5 w-4 h-px bg-black" />
                    <div className="absolute left-0 bottom-5 w-4 h-px bg-black" />
                    <div className="absolute right-0 top-5 w-4 h-px bg-black" />
                    <div className="absolute right-0 bottom-5 w-4 h-px bg-black" />

                    {/* Canvas */}
                    <div
                      className="shadow-lg"
                      style={{
                        width: scaledWidth,
                        height: scaledHeight,
                        backgroundColor: canvasState.backgroundColor,
                        backgroundImage: canvasState.backgroundImage
                          ? `url(${canvasState.backgroundImage})`
                          : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                      }}
                    >
                      {canvasState.elements.map((element) => (
                        <div
                          key={element.id}
                          style={{
                            position: 'absolute',
                            left: element.x * scale,
                            top: element.y * scale,
                            width: element.width * scale,
                            height: element.height * scale,
                            fontSize: `${((element.styles?.fontSize || 16) * scale)}px`,
                            color: element.styles?.color,
                            backgroundColor: element.styles?.backgroundColor,
                            fontWeight: element.styles?.fontWeight,
                            fontFamily: element.styles?.fontFamily,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: element.styles?.textAlign || 'left',
                            overflow: 'hidden',
                          }}
                        >
                          {'content' in element && element.content}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Export Options */}
          <div className="w-56 space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Export Options</h4>
              <div className="space-y-2">
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-start bg-purple-600 hover:bg-purple-700"
                  onClick={handleExportPDF}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Export PDF (Print Ready)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleExportPNG}
                  disabled={isExporting}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Export PNG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleExportJPG}
                  disabled={isExporting}
                >
                  <Image className="h-4 w-4 mr-2" />
                  Export JPG
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Proofing</h4>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleGenerateProof}
                disabled={isGeneratingProof}
              >
                {isGeneratingProof ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                Generate Proof
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Shows your design with sample recipient data
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Sample Data</h4>
              <div className="space-y-1 text-xs">
                {Object.entries(SAMPLE_DATA).slice(0, 5).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground font-mono">{`{{${key}}}`}</span>
                    <span className="text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

