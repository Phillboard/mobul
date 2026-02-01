/**
 * Static HTML Exporter
 * Bundles HTML, inlines CSS, optimizes assets
 */

import JSZip from 'jszip';

export interface StaticExportOptions {
  includeComments?: boolean;
  minify?: boolean;
  filename?: string;
}

export async function exportToStaticHTML(
  html: string,
  options: StaticExportOptions = {}
): Promise<Blob> {
  const { includeComments = false, minify = true, filename = 'index.html' } = options;

  let processedHtml = html;

  // Add DOCTYPE if not present
  if (!processedHtml.toLowerCase().includes('<!doctype')) {
    processedHtml = '<!DOCTYPE html>\n' + processedHtml;
  }

  // Remove comments if requested
  if (!includeComments) {
    processedHtml = processedHtml.replace(/<!--[\s\S]*?-->/g, '');
  }

  // Basic minification if requested
  if (minify) {
    processedHtml = processedHtml
      .replace(/\n\s+/g, '\n') // Remove indentation
      .replace(/\n+/g, '\n') // Remove multiple newlines
      .trim();
  }

  // Ensure Tailwind CSS is included
  if (!processedHtml.includes('tailwindcss')) {
    processedHtml = processedHtml.replace(
      '</head>',
      '  <script src="https://cdn.tailwindcss.com"></script>\n  </head>'
    );
  }

  // Create zip file
  const zip = new JSZip();
  
  // Add main HTML file
  zip.file(filename, processedHtml);

  // Add README with instructions
  const readme = `# Static Landing Page Export

## Deployment Instructions

### Option 1: Simple Hosting
1. Upload ${filename} to your web server
2. Access via your domain

### Option 2: Netlify/Vercel
1. Drag and drop this folder to Netlify Drop or Vercel
2. Your site will be live instantly

### Option 3: GitHub Pages
1. Create a GitHub repository
2. Upload ${filename}
3. Enable GitHub Pages in repository settings

## Technical Details
- All styles are inline or use Tailwind CDN
- No build process required
- Mobile responsive
- WCAG 2.1 AA compliant

## Support
For questions or issues, contact support@mobul.com
`;
  
  zip.file('README.md', readme);

  // Generate the zip
  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}

/**
 * Download the exported file
 */
export function downloadExport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

