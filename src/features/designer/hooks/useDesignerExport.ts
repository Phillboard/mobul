/**
 * useDesignerExport Hook
 * 
 * Unified export hook for PDF, HTML, and image exports.
 * Provides preview generation and download functionality.
 */

import { useState, useCallback } from 'react';
import type {
  CanvasState,
  PDFExportOptions,
  HTMLExportOptions,
  ImageExportOptions,
  ExportFormat,
} from '../types/designer';
import { exportToPDF } from '../utils/exportPDF';
import { exportToHTML, exportToEmailSafeHTML, minifyHTML } from '../utils/exportHTML';
import { replaceTokensWithSampleData } from '../utils/tokenParser';

export interface UseDesignerExportOptions {
  /** Current canvas state */
  canvasState: CanvasState;
  /** Designer type (determines default export format) */
  designerType: 'mail' | 'landing-page' | 'email';
}

export interface UseDesignerExportReturn {
  // State
  isExporting: boolean;
  exportError: string | null;
  lastExportedBlob: Blob | null;
  lastExportedHTML: string | null;

  // Export actions
  exportToPDF: (options?: Partial<PDFExportOptions>) => Promise<Blob>;
  exportToHTML: (options?: Partial<HTMLExportOptions>) => Promise<string>;
  exportToImage: (options?: Partial<ImageExportOptions>) => Promise<Blob>;
  exportAs: (format: ExportFormat, options?: any) => Promise<Blob | string>;

  // Preview
  generatePreview: (tokenData?: Record<string, string>) => Promise<string>;
  generateThumbnail: () => Promise<Blob>;

  // Download
  downloadExport: (format: ExportFormat, filename?: string) => Promise<void>;
  
  // Utilities
  clearError: () => void;
}

/**
 * Export hook for designer
 */
export function useDesignerExport(
  options: UseDesignerExportOptions
): UseDesignerExportReturn {
  const { canvasState, designerType } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExportedBlob, setLastExportedBlob] = useState<Blob | null>(null);
  const [lastExportedHTML, setLastExportedHTML] = useState<string | null>(null);

  /**
   * Export to PDF format
   */
  const exportPDF = useCallback(async (
    options: Partial<PDFExportOptions> = {}
  ): Promise<Blob> => {
    setIsExporting(true);
    setExportError(null);

    try {
      const defaultOptions: PDFExportOptions = {
        quality: 'print',
        includeBleed: false,
        usePlaceholders: true,
        tokenData: {},
        ...options,
      };

      const blob = await exportToPDF(canvasState, defaultOptions);
      setLastExportedBlob(blob);
      return blob;
    } catch (error: any) {
      const errorMsg = error.message || 'PDF export failed';
      setExportError(errorMsg);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [canvasState]);

  /**
   * Export to HTML format
   */
  const exportHTML = useCallback(async (
    options: Partial<HTMLExportOptions> = {}
  ): Promise<string> => {
    setIsExporting(true);
    setExportError(null);

    try {
      const defaultOptions: HTMLExportOptions = {
        responsive: designerType === 'landing-page',
        inlineStyles: designerType === 'email',
        emailSafe: designerType === 'email',
        tokenData: {},
        ...options,
      };

      const html = defaultOptions.emailSafe
        ? exportToEmailSafeHTML(canvasState, defaultOptions.tokenData || {})
        : exportToHTML(canvasState, defaultOptions);

      const minified = minifyHTML(html);
      setLastExportedHTML(minified);
      return minified;
    } catch (error: any) {
      const errorMsg = error.message || 'HTML export failed';
      setExportError(errorMsg);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [canvasState, designerType]);

  /**
   * Export to image (PNG/JPG)
   */
  const exportImage = useCallback(async (
    options: Partial<ImageExportOptions> = {}
  ): Promise<Blob> => {
    setIsExporting(true);
    setExportError(null);

    try {
      const {
        format = 'png',
        quality = 100,
        scale = 1,
        tokenData = {},
      } = options;

      // Create temporary canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      canvas.width = canvasState.width * scale;
      canvas.height = canvasState.height * scale;

      // Draw background
      ctx.fillStyle = canvasState.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (canvasState.backgroundImage) {
        await loadAndDrawImage(
          ctx,
          canvasState.backgroundImage,
          0,
          0,
          canvas.width,
          canvas.height
        );
      }

      // TODO: Render elements (would need full rendering logic)
      // For now, this is a placeholder

      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create image'));
          },
          `image/${format}`,
          quality / 100
        );
      });

      setLastExportedBlob(blob);
      return blob;
    } catch (error: any) {
      const errorMsg = error.message || 'Image export failed';
      setExportError(errorMsg);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [canvasState]);

  /**
   * Export in specified format
   */
  const exportAs = useCallback(async (
    format: ExportFormat,
    options: any = {}
  ): Promise<Blob | string> => {
    switch (format) {
      case 'pdf':
        return exportPDF(options);
      case 'html':
        return exportHTML(options);
      case 'png':
      case 'jpg':
        return exportImage({ ...options, format });
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }, [exportPDF, exportHTML, exportImage]);

  /**
   * Generate preview with sample data
   */
  const generatePreview = useCallback(async (
    tokenData?: Record<string, string>
  ): Promise<string> => {
    // Use provided token data or generate sample data
    const previewData = tokenData || {
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
      unique_code: 'ABC12345',
      company_name: 'Acme Corp',
      purl: 'https://example.com/p/ABC12345',
      qr_code: '[QR]',
      gift_card_amount: '$25',
    };

    return exportHTML({
      tokenData: previewData,
      responsive: true,
      inlineStyles: false,
    });
  }, [exportHTML]);

  /**
   * Generate thumbnail image
   */
  const generateThumbnail = useCallback(async (): Promise<Blob> => {
    return exportImage({
      format: 'jpg',
      quality: 80,
      scale: 0.25, // 25% size for thumbnail
    });
  }, [exportImage]);

  /**
   * Download export to user's computer
   */
  const downloadExport = useCallback(async (
    format: ExportFormat,
    filename?: string
  ): Promise<void> => {
    try {
      const result = await exportAs(format, {});

      // Generate filename if not provided
      const defaultFilename = `design-${Date.now()}.${format === 'html' ? 'html' : format}`;
      const finalFilename = filename || defaultFilename;

      // Create download link
      const url = typeof result === 'string'
        ? URL.createObjectURL(new Blob([result], { type: 'text/html' }))
        : URL.createObjectURL(result);

      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error: any) {
      const errorMsg = error.message || 'Download failed';
      setExportError(errorMsg);
      throw error;
    }
  }, [exportAs]);

  /**
   * Clear export error
   */
  const clearError = useCallback(() => {
    setExportError(null);
  }, []);

  return {
    // State
    isExporting,
    exportError,
    lastExportedBlob,
    lastExportedHTML,

    // Export actions
    exportToPDF: exportPDF,
    exportToHTML: exportHTML,
    exportToImage: exportImage,
    exportAs,

    // Preview
    generatePreview,
    generateThumbnail,

    // Download
    downloadExport,

    // Utilities
    clearError,
  };
}

/**
 * Helper: Load and draw image to canvas
 */
async function loadAndDrawImage(
  ctx: CanvasRenderingContext2D,
  imageUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      ctx.drawImage(img, x, y, width, height);
      resolve();
    };
    
    img.onerror = () => {
      console.warn(`Failed to load image: ${imageUrl}`);
      // Draw placeholder
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#cccccc';
      ctx.strokeRect(x, y, width, height);
      resolve();
    };
    
    img.src = imageUrl;
  });
}

/**
 * Get recommended filename for export
 */
export function getExportFilename(
  designerType: 'mail' | 'landing-page' | 'email',
  format: ExportFormat,
  customName?: string
): string {
  const prefix = customName || designerType.replace('-', '_');
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const extension = format === 'html' ? 'html' : format;
  
  return `${prefix}_${timestamp}.${extension}`;
}

