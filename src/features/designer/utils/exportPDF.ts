/**
 * PDF Export Utility
 * 
 * Export canvas designs to PDF for mail pieces.
 * Handles high-resolution rendering for print.
 */

import type { CanvasState, PDFExportOptions, DesignElement } from '../types/designer';
import { replaceTokens } from './tokenParser';

/**
 * Export canvas to PDF
 * 
 * Note: This is a placeholder implementation.
 * Full PDF export would require jsPDF library integration.
 * 
 * For now, this provides the interface and basic logic.
 * Actual implementation would:
 * 1. Render canvas to high-res image using Fabric.js
 * 2. Generate PDF with jsPDF at 300 DPI
 * 3. Replace tokens with actual data
 * 4. Add print marks/bleed if needed
 */
export async function exportToPDF(
  canvasState: CanvasState,
  options: PDFExportOptions
): Promise<Blob> {
  const {
    quality = 'print',
    includeBleed = false,
    tokenData = {},
    usePlaceholders = true,
  } = options;

  // DPI settings based on quality
  const dpiSettings = {
    low: 72,      // Screen resolution
    medium: 150,  // Draft print
    high: 300,    // Standard print
    print: 300,   // Production print
  };

  const dpi = dpiSettings[quality];
  const scale = dpi / 72; // Scale factor from screen (72 DPI) to print

  try {
    // Step 1: Create a temporary canvas for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Set canvas size based on DPI
    canvas.width = canvasState.width * scale;
    canvas.height = canvasState.height * scale;

    // Step 2: Render background
    if (canvasState.backgroundImage) {
      await renderBackgroundImage(
        ctx,
        canvasState.backgroundImage,
        canvas.width,
        canvas.height
      );
    } else {
      ctx.fillStyle = canvasState.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Step 3: Render elements
    const elementsWithReplacedTokens = replaceTokensInElements(
      canvasState.elements,
      tokenData,
      usePlaceholders
    );

    for (const element of elementsWithReplacedTokens) {
      await renderElementToPDF(ctx, element, scale);
    }

    // Step 4: Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });

    // Note: In a full implementation with jsPDF:
    // const pdf = new jsPDF({
    //   orientation: canvasState.width > canvasState.height ? 'landscape' : 'portrait',
    //   unit: 'px',
    //   format: [canvasState.width, canvasState.height],
    //   compress: true,
    // });
    // pdf.addImage(canvas, 'PNG', 0, 0, canvasState.width, canvasState.height);
    // return pdf.output('blob');

  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
}

/**
 * Render background image to canvas context
 */
async function renderBackgroundImage(
  ctx: CanvasRenderingContext2D,
  imageUrl: string,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve();
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load background image: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Replace tokens in design elements
 */
function replaceTokensInElements(
  elements: DesignElement[],
  tokenData: Record<string, string>,
  usePlaceholders: boolean
): DesignElement[] {
  return elements.map(element => {
    if (element.type === 'text' && 'content' in element) {
      return {
        ...element,
        content: replaceTokens(element.content, tokenData, {
          useFallback: usePlaceholders,
          preserveUnknown: usePlaceholders,
        }),
      };
    }
    
    if (element.type === 'template-token' && 'tokenContent' in element) {
      const replacement = tokenData[element.tokenContent.token.replace(/[{}]/g, '')] ||
        (usePlaceholders ? element.tokenContent.fallback : '');
      
      // Convert to text element for rendering
      return {
        ...element,
        type: 'text',
        content: replacement,
      } as any;
    }
    
    return element;
  });
}

/**
 * Render a design element to PDF canvas context
 */
async function renderElementToPDF(
  ctx: CanvasRenderingContext2D,
  element: DesignElement,
  scale: number
): Promise<void> {
  ctx.save();
  
  // Apply transformations
  ctx.translate(element.x * scale, element.y * scale);
  ctx.rotate((element.rotation * Math.PI) / 180);
  ctx.globalAlpha = element.styles.opacity || 1;

  try {
    switch (element.type) {
      case 'text':
        if ('content' in element) {
          renderTextElement(ctx, element, scale);
        }
        break;

      case 'image':
        if ('src' in element && element.src) {
          await renderImageElement(ctx, element, scale);
        }
        break;

      case 'shape':
        if ('shapeType' in element) {
          renderShapeElement(ctx, element, scale);
        }
        break;

      case 'qr-code':
        if ('data' in element) {
          renderQRCodePlaceholder(ctx, element, scale);
        }
        break;
    }
  } finally {
    ctx.restore();
  }
}

/**
 * Render text element
 */
function renderTextElement(
  ctx: CanvasRenderingContext2D,
  element: any,
  scale: number
): void {
  const fontSize = (element.styles.fontSize || 16) * scale;
  const fontFamily = element.styles.fontFamily || 'Arial';
  const fontWeight = element.styles.fontWeight || 'normal';
  
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = element.styles.color || '#000000';
  ctx.textAlign = element.styles.textAlign || 'left';
  ctx.textBaseline = 'top';

  // Handle multi-line text
  const lines = element.content.split('\n');
  const lineHeight = fontSize * (element.styles.lineHeight || 1.2);
  
  lines.forEach((line: string, index: number) => {
    ctx.fillText(line, 0, index * lineHeight);
  });
}

/**
 * Render image element
 */
async function renderImageElement(
  ctx: CanvasRenderingContext2D,
  element: any,
  scale: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const width = element.width * scale;
      const height = element.height * scale;
      
      // Apply background if set
      if (element.styles.backgroundColor) {
        ctx.fillStyle = element.styles.backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Draw image with fit mode
      switch (element.fit) {
        case 'cover':
          drawImageCover(ctx, img, width, height);
          break;
        case 'contain':
          drawImageContain(ctx, img, width, height);
          break;
        default:
          ctx.drawImage(img, 0, 0, width, height);
      }
      
      resolve();
    };
    
    img.onerror = () => {
      console.warn(`Failed to load image: ${element.src}`);
      // Draw placeholder
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, element.width * scale, element.height * scale);
      resolve();
    };
    
    img.src = element.src;
  });
}

/**
 * Draw image with 'cover' fit mode
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
): void {
  const imgRatio = img.width / img.height;
  const boxRatio = width / height;
  
  let drawWidth, drawHeight, offsetX, offsetY;
  
  if (imgRatio > boxRatio) {
    drawHeight = height;
    drawWidth = img.width * (height / img.height);
    offsetX = (width - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = width;
    drawHeight = img.height * (width / img.width);
    offsetX = 0;
    offsetY = (height - drawHeight) / 2;
  }
  
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

/**
 * Draw image with 'contain' fit mode
 */
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number
): void {
  const imgRatio = img.width / img.height;
  const boxRatio = width / height;
  
  let drawWidth, drawHeight, offsetX, offsetY;
  
  if (imgRatio > boxRatio) {
    drawWidth = width;
    drawHeight = img.height * (width / img.width);
    offsetX = 0;
    offsetY = (height - drawHeight) / 2;
  } else {
    drawHeight = height;
    drawWidth = img.width * (height / img.height);
    offsetX = (width - drawWidth) / 2;
    offsetY = 0;
  }
  
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

/**
 * Render shape element
 */
function renderShapeElement(
  ctx: CanvasRenderingContext2D,
  element: any,
  scale: number
): void {
  const width = element.width * scale;
  const height = element.height * scale;
  
  ctx.fillStyle = element.styles.backgroundColor || 'transparent';
  ctx.strokeStyle = element.styles.borderColor || '#000000';
  ctx.lineWidth = (element.styles.borderWidth || 1) * scale;

  switch (element.shapeType) {
    case 'rectangle':
      const radius = (element.styles.borderRadius || 0) * scale;
      if (radius > 0) {
        drawRoundedRect(ctx, 0, 0, width, height, radius);
      } else {
        ctx.fillRect(0, 0, width, height);
        if (ctx.lineWidth > 0) {
          ctx.strokeRect(0, 0, width, height);
        }
      }
      break;

    case 'circle':
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
      ctx.fill();
      if (ctx.lineWidth > 0) {
        ctx.stroke();
      }
      break;

    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (ctx.lineWidth > 0) {
        ctx.stroke();
      }
      break;
  }
}

/**
 * Draw rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
  if (ctx.lineWidth > 0) {
    ctx.stroke();
  }
}

/**
 * Render QR code placeholder
 * Full implementation would use qrcode library
 */
function renderQRCodePlaceholder(
  ctx: CanvasRenderingContext2D,
  element: any,
  scale: number
): void {
  const size = Math.min(element.width, element.height) * scale;
  
  // Draw placeholder
  ctx.fillStyle = element.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, size, size);
  
  ctx.fillStyle = element.foregroundColor || '#000000';
  ctx.font = `${size / 10}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[QR Code]', size / 2, size / 2);
  
  // Draw border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);
}

/**
 * Calculate optimal PDF dimensions
 */
export function calculatePDFDimensions(
  canvasWidth: number,
  canvasHeight: number,
  dpi: number = 300
): { width: number; height: number; unit: string } {
  // Convert pixels to inches at given DPI
  const widthInches = canvasWidth / dpi;
  const heightInches = canvasHeight / dpi;
  
  return {
    width: widthInches,
    height: heightInches,
    unit: 'in',
  };
}

/**
 * Get print-ready canvas dimensions
 */
export function getPrintDimensions(mailSize: '4x6' | '6x9' | '6x11' | 'letter' | 'trifold'): {
  width: number;
  height: number;
  dpi: number;
} {
  const dpi = 300;
  
  const dimensions = {
    '4x6': { width: 4, height: 6 },
    '6x9': { width: 6, height: 9 },
    '6x11': { width: 6, height: 11 },
    'letter': { width: 8.5, height: 11 },
    'trifold': { width: 11, height: 8.5 },
  };
  
  const { width, height } = dimensions[mailSize];
  
  return {
    width: width * dpi,
    height: height * dpi,
    dpi,
  };
}

