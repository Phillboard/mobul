/**
 * HTML Export Utility
 * 
 * Export canvas designs to HTML for landing pages and email templates.
 * Generates responsive, accessible HTML with inline styles.
 */

import type { CanvasState, HTMLExportOptions, DesignElement } from '../types/designer';
import { replaceTokens } from './tokenParser';

/**
 * Export canvas to HTML
 */
export function exportToHTML(
  canvasState: CanvasState,
  options: HTMLExportOptions
): string {
  const {
    responsive = true,
    inlineStyles = false,
    tokenData = {},
    emailSafe = false,
  } = options;

  // Replace tokens in elements
  const elementsWithTokens = replaceTokensInElements(
    canvasState.elements,
    tokenData
  );

  // Generate HTML structure
  const head = generateHTMLHead(canvasState, responsive, emailSafe);
  const body = generateHTMLBody(canvasState, elementsWithTokens, inlineStyles, emailSafe);

  return `<!DOCTYPE html>
<html lang="en">
${head}
${body}
</html>`;
}

/**
 * Generate HTML head section
 */
function generateHTMLHead(
  canvasState: CanvasState,
  responsive: boolean,
  emailSafe: boolean
): string {
  const styles: string[] = [];

  // Reset styles
  styles.push(`
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
  `);

  // Container styles
  styles.push(`
    .canvas-container {
      position: relative;
      width: ${canvasState.width}px;
      height: ${canvasState.height}px;
      background-color: ${canvasState.backgroundColor};
      ${canvasState.backgroundImage ? `background-image: url('${canvasState.backgroundImage}');` : ''}
      background-size: cover;
      background-position: center;
      margin: 0 auto;
      ${emailSafe ? '' : 'overflow: hidden;'}
    }
  `);

  // Element styles
  styles.push(`
    .design-element {
      position: absolute;
      transform-origin: top left;
    }
  `);

  // Responsive styles
  if (responsive && !emailSafe) {
    styles.push(`
    @media (max-width: 768px) {
      .canvas-container {
        width: 100%;
        height: auto;
        aspect-ratio: ${canvasState.width} / ${canvasState.height};
      }
      .design-element {
        /* Elements will scale proportionally */
      }
    }
    `);
  }

  const styleTag = emailSafe
    ? '' // Email clients often strip <style> tags
    : `<style>${styles.join('\n')}</style>`;

  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mobul Design</title>
  ${styleTag}
</head>`;
}

/**
 * Generate HTML body section
 */
function generateHTMLBody(
  canvasState: CanvasState,
  elements: DesignElement[],
  inlineStyles: boolean,
  emailSafe: boolean
): string {
  const elementHTML = elements
    .sort((a, b) => a.zIndex - b.zIndex) // Render in z-index order
    .map(element => generateElementHTML(element, inlineStyles, emailSafe))
    .join('\n    ');

  return `<body>
  <div class="canvas-container"${inlineStyles ? ` style="${generateContainerInlineStyles(canvasState)}"` : ''}>
    ${elementHTML}
  </div>
</body>`;
}

/**
 * Generate inline styles for container (email-safe)
 */
function generateContainerInlineStyles(canvasState: CanvasState): string {
  const styles = [
    `position: relative`,
    `width: ${canvasState.width}px`,
    `height: ${canvasState.height}px`,
    `background-color: ${canvasState.backgroundColor}`,
  ];

  if (canvasState.backgroundImage) {
    styles.push(`background-image: url('${canvasState.backgroundImage}')`);
    styles.push(`background-size: cover`);
    styles.push(`background-position: center`);
  }

  return styles.join('; ');
}

/**
 * Generate HTML for a single element
 */
function generateElementHTML(
  element: DesignElement,
  inlineStyles: boolean,
  emailSafe: boolean
): string {
  const styleAttr = inlineStyles
    ? ` style="${generateElementInlineStyles(element, emailSafe)}"`
    : '';

  switch (element.type) {
    case 'text':
      if ('content' in element) {
        return `<div class="design-element text-element"${styleAttr}>${escapeHTML(element.content)}</div>`;
      }
      break;

    case 'image':
      if ('src' in element && element.src) {
        return `<img class="design-element image-element" src="${element.src}" alt="${element.alt || ''}"${styleAttr} />`;
      }
      break;

    case 'shape':
      if ('shapeType' in element) {
        return generateShapeHTML(element, styleAttr);
      }
      break;

    case 'button':
      if ('text' in element && 'href' in element) {
        return `<a class="design-element button-element" href="${element.href || '#'}"${styleAttr}>${escapeHTML(element.text)}</a>`;
      }
      break;

    case 'form-field':
      if ('fieldType' in element) {
        return generateFormFieldHTML(element, styleAttr);
      }
      break;

    case 'qr-code':
      // QR code would be generated server-side or with a library
      return `<div class="design-element qr-code-element"${styleAttr}>[QR Code]</div>`;
  }

  return '';
}

/**
 * Generate inline styles for an element
 */
function generateElementInlineStyles(
  element: DesignElement,
  emailSafe: boolean
): string {
  const styles = [
    `position: absolute`,
    `left: ${element.x}px`,
    `top: ${element.y}px`,
    `width: ${element.width}px`,
    `height: ${element.height}px`,
  ];

  if (element.rotation !== 0 && !emailSafe) {
    styles.push(`transform: rotate(${element.rotation}deg)`);
  }

  if (element.styles.opacity !== undefined && element.styles.opacity !== 1) {
    styles.push(`opacity: ${element.styles.opacity}`);
  }

  if (!element.visible) {
    styles.push(`display: none`);
  }

  // Type-specific styles
  if (element.type === 'text') {
    if (element.styles.fontSize) {
      styles.push(`font-size: ${element.styles.fontSize}px`);
    }
    if (element.styles.fontFamily) {
      styles.push(`font-family: ${element.styles.fontFamily}`);
    }
    if (element.styles.fontWeight) {
      styles.push(`font-weight: ${element.styles.fontWeight}`);
    }
    if (element.styles.color) {
      styles.push(`color: ${element.styles.color}`);
    }
    if (element.styles.textAlign) {
      styles.push(`text-align: ${element.styles.textAlign}`);
    }
    if (element.styles.lineHeight) {
      styles.push(`line-height: ${element.styles.lineHeight}`);
    }
  }

  // Background and border
  if (element.styles.backgroundColor) {
    styles.push(`background-color: ${element.styles.backgroundColor}`);
  }
  if (element.styles.borderColor && element.styles.borderWidth) {
    styles.push(`border: ${element.styles.borderWidth}px ${element.styles.borderStyle || 'solid'} ${element.styles.borderColor}`);
  }
  if (element.styles.borderRadius) {
    styles.push(`border-radius: ${element.styles.borderRadius}px`);
  }

  return styles.join('; ');
}

/**
 * Generate HTML for shape elements
 */
function generateShapeHTML(element: any, styleAttr: string): string {
  // For HTML, shapes are represented as divs with styles
  return `<div class="design-element shape-element"${styleAttr}></div>`;
}

/**
 * Generate HTML for form field elements
 */
function generateFormFieldHTML(element: any, styleAttr: string): string {
  const { fieldType, label, placeholder, required, options } = element;

  let inputHTML = '';

  switch (fieldType) {
    case 'text':
    case 'email':
    case 'tel':
      inputHTML = `<input type="${fieldType}" placeholder="${placeholder || ''}" ${required ? 'required' : ''}${styleAttr} />`;
      break;

    case 'textarea':
      inputHTML = `<textarea placeholder="${placeholder || ''}" ${required ? 'required' : ''}${styleAttr}></textarea>`;
      break;

    case 'select':
      inputHTML = `<select ${required ? 'required' : ''}${styleAttr}>
        ${options?.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('\n        ')}
      </select>`;
      break;

    case 'checkbox':
    case 'radio':
      inputHTML = `<input type="${fieldType}" ${required ? 'required' : ''}${styleAttr} />`;
      break;
  }

  if (label) {
    return `<label class="design-element form-field-element">
      <span>${escapeHTML(label)}</span>
      ${inputHTML}
    </label>`;
  }

  return inputHTML;
}

/**
 * Replace tokens in elements before HTML export
 */
function replaceTokensInElements(
  elements: DesignElement[],
  tokenData: Record<string, string>
): DesignElement[] {
  return elements.map(element => {
    if (element.type === 'text' && 'content' in element) {
      return {
        ...element,
        content: replaceTokens(element.content, tokenData, {
          useFallback: true,
          preserveUnknown: true,
        }),
      };
    }

    if (element.type === 'template-token' && 'tokenContent' in element) {
      const tokenName = element.tokenContent.token.replace(/[{}]/g, '');
      const replacement = tokenData[tokenName] || element.tokenContent.fallback;

      // Convert to text element for export
      return {
        ...element,
        type: 'text',
        content: replacement,
      } as any;
    }

    if (element.type === 'button' && 'text' in element) {
      return {
        ...element,
        text: replaceTokens(element.text, tokenData, {
          useFallback: true,
          preserveUnknown: true,
        }),
      };
    }

    return element;
  });
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate email-safe HTML
 * Heavily inlined styles, limited CSS, table-based layout
 */
export function exportToEmailSafeHTML(
  canvasState: CanvasState,
  tokenData: Record<string, string> = {}
): string {
  const elementsWithTokens = replaceTokensInElements(
    canvasState.elements,
    tokenData
  );

  // Email templates typically use table-based layouts
  // This is a simplified version
  const elementsHTML = elementsWithTokens
    .sort((a, b) => a.y - b.y) // Sort by vertical position
    .map(element => generateElementHTML(element, true, true))
    .join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: ${canvasState.width}px; margin: 0 auto; background-color: ${canvasState.backgroundColor};">
    <tr>
      <td style="padding: 20px;">
        ${elementsHTML}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Minify HTML (remove unnecessary whitespace)
 */
export function minifyHTML(html: string): string {
  return html
    .replace(/\n\s+/g, '\n') // Remove leading spaces on each line
    .replace(/\n{2,}/g, '\n') // Remove multiple newlines
    .trim();
}

/**
 * Validate HTML structure
 */
export function validateHTML(html: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for basic structure
  if (!html.includes('<!DOCTYPE html>')) {
    errors.push('Missing DOCTYPE declaration');
  }
  if (!html.includes('<html')) {
    errors.push('Missing <html> tag');
  }
  if (!html.includes('<head>')) {
    errors.push('Missing <head> section');
  }
  if (!html.includes('<body>')) {
    errors.push('Missing <body> section');
  }

  // Check for closed tags
  const openTags = html.match(/<(\w+)[^>]*>/g) || [];
  const closeTags = html.match(/<\/(\w+)>/g) || [];
  
  if (openTags.length > closeTags.length + 5) {
    // Allow some self-closing tags
    errors.push('Possible unclosed tags');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

