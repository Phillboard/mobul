// Comprehensive landing page validation

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100
}

export interface ValidationCategory {
  category: string;
  passed: boolean;
  issues: string[];
}

export function validateLandingPage(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const categories: ValidationCategory[] = [];
  
  // 1. Structural validation
  const structureValidation = validateStructure(html);
  categories.push(structureValidation);
  if (!structureValidation.passed) {
    errors.push(...structureValidation.issues);
  }
  
  // 2. Form validation
  const formValidation = validateForm(html);
  categories.push(formValidation);
  if (!formValidation.passed) {
    errors.push(...formValidation.issues);
  }
  
  // 3. Accessibility validation
  const a11yValidation = validateAccessibility(html);
  categories.push(a11yValidation);
  if (!a11yValidation.passed) {
    warnings.push(...a11yValidation.issues);
  }
  
  // 4. Performance validation
  const perfValidation = validatePerformance(html);
  categories.push(perfValidation);
  if (!perfValidation.passed) {
    warnings.push(...perfValidation.issues);
  }
  
  // 5. SEO validation
  const seoValidation = validateSEO(html);
  categories.push(seoValidation);
  if (!seoValidation.passed) {
    warnings.push(...seoValidation.issues);
  }
  
  // Calculate score
  const passedCategories = categories.filter(c => c.passed).length;
  const score = Math.round((passedCategories / categories.length) * 100);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score
  };
}

function validateStructure(html: string): ValidationCategory {
  const issues: string[] = [];
  
  if (!html.includes('<!DOCTYPE html>')) {
    issues.push('Missing DOCTYPE declaration');
  }
  
  if (!html.includes('<html')) {
    issues.push('Missing html tag');
  }
  
  if (!html.includes('<head>')) {
    issues.push('Missing head section');
  }
  
  if (!html.includes('<body')) {
    issues.push('Missing body tag');
  }
  
  if (!html.includes('tailwindcss')) {
    issues.push('Missing Tailwind CSS');
  }
  
  return {
    category: 'Structure',
    passed: issues.length === 0,
    issues
  };
}

function validateForm(html: string): ValidationCategory {
  const issues: string[] = [];
  
  // Check for required form elements - flexible matching
  if (!html.includes('giftCardRedemptionForm') && !html.includes('<form')) {
    issues.push('Missing redemption form');
  }
  
  if (!html.includes('codeInput') && !html.match(/<input[^>]*type=["']?text["']?/)) {
    issues.push('Missing code input field');
  }
  
  if (!html.includes('submitButton') && !html.match(/<button[^>]*type=["']?submit["']?/)) {
    issues.push('Missing submit button');
  }
  
  // Check for required attributes
  if (html.includes('<input') && !html.includes('required')) {
    issues.push('Input should be marked as required');
  }
  
  if (html.includes('<input') && !html.includes('placeholder')) {
    issues.push('Input should have placeholder text');
  }
  
  return {
    category: 'Form Elements',
    passed: issues.length === 0,
    issues
  };
}

function validateAccessibility(html: string): ValidationCategory {
  const issues: string[] = [];
  
  // Check for labels
  const inputCount = (html.match(/<input/g) || []).length;
  const labelCount = (html.match(/<label/g) || []).length;
  
  if (inputCount > labelCount) {
    issues.push('Some inputs are missing labels');
  }
  
  // Check for alt attributes on images
  const imgWithoutAlt = html.match(/<img(?![^>]*alt=)/g);
  if (imgWithoutAlt && imgWithoutAlt.length > 0) {
    issues.push(`${imgWithoutAlt.length} images missing alt attributes`);
  }
  
  // Check for semantic HTML
  const hasSemanticTags = html.includes('<header') || 
                          html.includes('<main') || 
                          html.includes('<footer') ||
                          html.includes('<section');
  
  if (!hasSemanticTags) {
    issues.push('Consider using semantic HTML tags (header, main, footer, section)');
  }
  
  // Check for sufficient color contrast (basic check)
  if (html.includes('text-gray-300') && html.includes('bg-gray-200')) {
    issues.push('Potential color contrast issues detected');
  }
  
  return {
    category: 'Accessibility',
    passed: issues.length === 0,
    issues
  };
}

function validatePerformance(html: string): ValidationCategory {
  const issues: string[] = [];
  
  // Check page size
  const sizeKB = new Blob([html]).size / 1024;
  if (sizeKB > 500) {
    issues.push(`Page size is ${Math.round(sizeKB)}KB (recommended: <500KB)`);
  }
  
  // Check for external resources
  const externalScripts = html.match(/<script[^>]*src=["']https?:\/\//g) || [];
  if (externalScripts.length > 3) {
    issues.push(`${externalScripts.length} external scripts (recommended: ≤3)`);
  }
  
  // Check for inline styles
  const inlineStyles = html.match(/style="/g) || [];
  if (inlineStyles.length > 10) {
    issues.push('Consider moving inline styles to CSS classes');
  }
  
  // Check for animations
  if (html.includes('@keyframes') && html.includes('transform: scale')) {
    // Good - using GPU-accelerated properties
  } else if (html.includes('animation') && html.includes('width')) {
    issues.push('Avoid animating layout properties (width, height) - use transform instead');
  }
  
  return {
    category: 'Performance',
    passed: issues.length === 0,
    issues
  };
}

function validateSEO(html: string): ValidationCategory {
  const issues: string[] = [];
  
  // Check for title
  if (!html.includes('<title>')) {
    issues.push('Missing page title');
  }
  
  // Check for meta description
  if (!html.includes('meta name="description"')) {
    issues.push('Missing meta description');
  }
  
  // Check for viewport meta tag
  if (!html.includes('meta name="viewport"')) {
    issues.push('Missing viewport meta tag');
  }
  
  // Check for h1
  const h1Count = (html.match(/<h1/g) || []).length;
  if (h1Count === 0) {
    issues.push('Missing h1 heading');
  } else if (h1Count > 1) {
    issues.push('Multiple h1 headings (should have only one)');
  }
  
  // Check for heading hierarchy
  const hasH2 = html.includes('<h2');
  const hasH3 = html.includes('<h3');
  const hasH4 = html.includes('<h4');
  
  if (hasH4 && !hasH3) {
    issues.push('Improper heading hierarchy (h4 without h3)');
  }
  if (hasH3 && !hasH2) {
    issues.push('Improper heading hierarchy (h3 without h2)');
  }
  
  return {
    category: 'SEO',
    passed: issues.length === 0,
    issues
  };
}

// Simple validation function for backwards compatibility
export function validateGeneratedHTML(html: string): { valid: boolean; errors: string[] } {
  const result = validateLandingPage(html);
  return {
    valid: result.valid,
    errors: result.errors
  };
}
