/**
 * Link Analyzer - Extract design elements from URLs
 * Uses Cheerio for HTML parsing
 */

export interface AnalyzedWebpage {
  url: string;
  title: string;
  description: string;
  colors: string[];
  fonts: string[];
  structure: {
    hasHero: boolean;
    hasForm: boolean;
    hasTestimonials: boolean;
    sections: string[];
  };
  images: string[];
  headings: string[];
  cta: string[];
}

/**
 * Analyze a webpage and extract design elements
 */
export async function analyzeWebpage(url: string): Promise<AnalyzedWebpage> {
  try {
    // Fetch the webpage
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();

    return {
      url,
      title: extractTitle(html),
      description: extractDescription(html),
      colors: extractColors(html),
      fonts: extractFonts(html),
      structure: analyzeStructure(html),
      images: extractImages(html, url),
      headings: extractHeadings(html),
      cta: extractCTAs(html),
    };
  } catch (error) {
    console.error('Webpage analysis error:', error);
    throw error;
  }
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : '';
}

/**
 * Extract meta description
 */
function extractDescription(html: string): string {
  const descMatch = html.match(/<meta\s+name="description"\s+content="(.*?)"/i);
  return descMatch ? descMatch[1].trim() : '';
}

/**
 * Extract colors from inline styles and stylesheets
 */
function extractColors(html: string): string[] {
  const colors = new Set<string>();
  
  // Match hex colors
  const hexMatches = html.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi);
  for (const match of hexMatches) {
    colors.add(match[0].toLowerCase());
  }
  
  // Match rgb/rgba colors
  const rgbMatches = html.matchAll(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)/gi);
  for (const match of rgbMatches) {
    colors.add(match[0]);
  }
  
  return Array.from(colors).slice(0, 10); // Limit to 10 colors
}

/**
 * Extract font families
 */
function extractFonts(html: string): string[] {
  const fonts = new Set<string>();
  
  // Match font-family declarations
  const fontMatches = html.matchAll(/font-family:\s*([^;}]+)/gi);
  for (const match of fontMatches) {
    const fontFamily = match[1].trim().replace(/['"]/g, '').split(',')[0];
    if (fontFamily) {
      fonts.add(fontFamily);
    }
  }
  
  return Array.from(fonts).slice(0, 5); // Limit to 5 fonts
}

/**
 * Analyze page structure
 */
function analyzeStructure(html: string): AnalyzedWebpage['structure'] {
  const lowerHtml = html.toLowerCase();
  
  return {
    hasHero: /(<section|<div)[^>]*hero/i.test(html) || /(<header|<div)[^>]*class="[^"]*banner/i.test(html),
    hasForm: /<form/i.test(html),
    hasTestimonials: /testimonial|review|rating/i.test(lowerHtml),
    sections: extractSections(html),
  };
}

/**
 * Extract section identifiers
 */
function extractSections(html: string): string[] {
  const sections: string[] = [];
  const sectionMatches = html.matchAll(/<section[^>]*(?:id="([^"]+)"|class="([^"]+)")/gi);
  
  for (const match of sectionMatches) {
    const id = match[1];
    const className = match[2];
    if (id) sections.push(id);
    if (className) sections.push(...className.split(' ').slice(0, 2));
  }
  
  return sections.slice(0, 10);
}

/**
 * Extract images (limited set)
 */
function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const imgMatches = html.matchAll(/<img[^>]+src="([^"]+)"/gi);
  
  for (const match of imgMatches) {
    let src = match[1];
    // Convert relative URLs to absolute
    if (src.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      src = `${urlObj.protocol}//${urlObj.host}${src}`;
    }
    images.push(src);
  }
  
  return images.slice(0, 5); // Limit to 5 images
}

/**
 * Extract headings
 */
function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const h1Matches = html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi);
  const h2Matches = html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi);
  
  for (const match of h1Matches) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) headings.push(text);
  }
  
  for (const match of h2Matches) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) headings.push(text);
  }
  
  return headings.slice(0, 5);
}

/**
 * Extract CTA text
 */
function extractCTAs(html: string): string[] {
  const ctas: string[] = [];
  const buttonMatches = html.matchAll(/<button[^>]*>(.*?)<\/button>/gi);
  const linkMatches = html.matchAll(/<a[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>(.*?)<\/a>/gi);
  
  for (const match of buttonMatches) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) ctas.push(text);
  }
  
  for (const match of linkMatches) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    if (text) ctas.push(text);
  }
  
  return ctas.slice(0, 5);
}

/**
 * Generate a summary of the analysis for AI prompts
 */
export function generateAnalysisSummary(analysis: AnalyzedWebpage): string {
  return `
Website Analysis for: ${analysis.url}

Title: ${analysis.title}
Description: ${analysis.description}

Design Elements:
- Primary Colors: ${analysis.colors.slice(0, 3).join(', ')}
- Fonts: ${analysis.fonts.join(', ')}

Structure:
- Has Hero Section: ${analysis.structure.hasHero ? 'Yes' : 'No'}
- Has Form: ${analysis.structure.hasForm ? 'Yes' : 'No'}
- Has Testimonials: ${analysis.structure.hasTestimonials ? 'Yes' : 'No'}

Key Headings:
${analysis.headings.map(h => `- ${h}`).join('\n')}

Call to Actions:
${analysis.cta.map(c => `- ${c}`).join('\n')}

Section Classes: ${analysis.structure.sections.slice(0, 5).join(', ')}
`.trim();
}

