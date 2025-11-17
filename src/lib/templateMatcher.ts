// Smart template matching algorithm based on branding context

import { templates, LandingPageTemplate } from "./landingPageTemplates";

export interface BrandingContext {
  industry: string;
  designStyle: string;
  emotionalTone: string;
  primaryColor: string;
  accentColor: string;
}

interface TemplateScore {
  template: LandingPageTemplate;
  score: number;
  reasons: string[];
}

// Industry keyword mapping
const industryKeywords: Record<string, string[]> = {
  auto: ["auto", "car", "vehicle", "automotive", "dealer", "warranty"],
  realestate: ["real estate", "property", "home", "house", "realtor", "mortgage"],
  financial: ["financial", "finance", "investment", "banking", "insurance", "wealth"],
  luxury: ["luxury", "premium", "high-end", "exclusive", "elite"],
  fitness: ["fitness", "gym", "health", "wellness", "workout", "training"],
  events: ["event", "party", "celebration", "wedding", "conference"],
  entertainment: ["entertainment", "fun", "music", "show", "performance"],
  retail: ["retail", "store", "shop", "shopping", "merchandise"],
  restaurant: ["restaurant", "food", "dining", "cafe", "bistro"],
  homeservices: ["home services", "contractor", "repair", "plumbing", "hvac", "roofing"],
  legal: ["legal", "law", "attorney", "lawyer", "firm"],
  healthcare: ["healthcare", "medical", "dental", "doctor", "clinic", "hospital"],
  tech: ["tech", "technology", "software", "saas", "startup", "digital"],
  consulting: ["consulting", "consulting", "advisory", "professional services"],
};

// Style keyword mapping
const styleKeywords: Record<string, string[]> = {
  modern: ["modern", "contemporary", "sleek", "minimalist", "clean"],
  bold: ["bold", "vibrant", "energetic", "dynamic", "exciting"],
  professional: ["professional", "corporate", "business", "formal", "traditional"],
  friendly: ["friendly", "warm", "approachable", "casual", "inviting"],
  tech: ["tech", "futuristic", "innovative", "cutting-edge", "digital"],
  elegant: ["elegant", "sophisticated", "classic", "refined", "timeless"],
};

// Tone keyword mapping
const toneKeywords: Record<string, string[]> = {
  professional: ["professional", "trustworthy", "reliable", "credible"],
  friendly: ["friendly", "warm", "welcoming", "approachable"],
  exciting: ["exciting", "energetic", "enthusiastic", "dynamic"],
  premium: ["premium", "luxury", "exclusive", "sophisticated"],
  innovative: ["innovative", "modern", "cutting-edge", "advanced"],
  trustworthy: ["trustworthy", "secure", "safe", "reliable"],
};

function normalizeIndustry(industry: string): string {
  const lowerIndustry = industry.toLowerCase();
  
  for (const [key, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => lowerIndustry.includes(keyword))) {
      return key;
    }
  }
  
  return "general";
}

function normalizeStyle(style: string): string {
  const lowerStyle = style.toLowerCase();
  
  for (const [key, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some(keyword => lowerStyle.includes(keyword))) {
      return key;
    }
  }
  
  return "modern";
}

function normalizeTone(tone: string): string {
  const lowerTone = tone.toLowerCase();
  
  for (const [key, keywords] of Object.entries(toneKeywords)) {
    if (keywords.some(keyword => lowerTone.includes(keyword))) {
      return key;
    }
  }
  
  return "professional";
}

function scoreTemplate(
  template: LandingPageTemplate,
  context: BrandingContext
): TemplateScore {
  let score = 0;
  const reasons: string[] = [];
  
  const normalizedIndustry = normalizeIndustry(context.industry);
  const normalizedStyle = normalizeStyle(context.designStyle);
  const normalizedTone = normalizeTone(context.emotionalTone);
  
  // Industry match (40% weight)
  if (template.bestFor.includes(normalizedIndustry)) {
    score += 40;
    reasons.push(`Perfect industry match: ${normalizedIndustry}`);
  } else if (template.bestFor.some(industry => 
    industryKeywords[normalizedIndustry]?.some(keyword => 
      industryKeywords[industry]?.includes(keyword)
    )
  )) {
    score += 20;
    reasons.push(`Related industry match`);
  }
  
  // Style match (30% weight)
  if (template.designStyle === normalizedStyle) {
    score += 30;
    reasons.push(`Perfect style match: ${normalizedStyle}`);
  } else {
    // Partial style match
    const styleCompatibility: Record<string, string[]> = {
      modern: ["tech", "elegant"],
      bold: ["friendly"],
      professional: ["elegant"],
      friendly: ["modern"],
      tech: ["modern"],
      elegant: ["professional"],
    };
    
    if (styleCompatibility[template.designStyle]?.includes(normalizedStyle)) {
      score += 15;
      reasons.push(`Compatible style`);
    }
  }
  
  // Tone match (20% weight)
  if (template.emotionalTone.includes(normalizedTone)) {
    score += 20;
    reasons.push(`Perfect tone match: ${normalizedTone}`);
  } else {
    // Check for similar tones
    const toneCompatibility: Record<string, string[]> = {
      professional: ["trustworthy", "premium"],
      friendly: ["exciting"],
      exciting: ["friendly", "innovative"],
      premium: ["professional", "sophisticated"],
      innovative: ["exciting"],
      trustworthy: ["professional"],
    };
    
    const compatibleTones = toneCompatibility[normalizedTone] || [];
    if (template.emotionalTone.some(t => compatibleTones.includes(t))) {
      score += 10;
      reasons.push(`Compatible tone`);
    }
  }
  
  // Color harmony check (10% weight)
  // Simple heuristic: check if primary color suggests a certain mood
  const colorHue = getColorHue(context.primaryColor);
  const templateColorPreference = getTemplateColorPreference(template);
  
  if (colorHue === templateColorPreference) {
    score += 10;
    reasons.push(`Excellent color harmony`);
  } else if (isColorCompatible(colorHue, templateColorPreference)) {
    score += 5;
    reasons.push(`Good color compatibility`);
  }
  
  return { template, score, reasons };
}

function getColorHue(hexColor: string): string {
  // Simple heuristic based on color
  const color = hexColor.toLowerCase();
  
  if (color.includes("blue") || color.match(/^#[0-4][0-9a-f]{5}$/)) return "cool";
  if (color.includes("red") || color.includes("orange")) return "warm";
  if (color.includes("green")) return "natural";
  if (color.includes("purple")) return "luxe";
  if (color.includes("gray") || color.includes("grey")) return "neutral";
  
  // Parse hex to determine hue
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  if (b > r && b > g) return "cool";
  if (r > g && r > b) return "warm";
  if (g > r && g > b) return "natural";
  
  return "neutral";
}

function getTemplateColorPreference(template: LandingPageTemplate): string {
  // Map templates to preferred color schemes
  const preferences: Record<string, string> = {
    "modern-luxury": "cool",
    "bold-energetic": "warm",
    "professional-trust": "cool",
    "warm-friendly": "warm",
    "tech-modern": "cool",
    "classic-elegant": "neutral",
  };
  
  return preferences[template.id] || "neutral";
}

function isColorCompatible(hue1: string, hue2: string): boolean {
  const compatibilityMap: Record<string, string[]> = {
    cool: ["neutral", "luxe"],
    warm: ["neutral", "natural"],
    natural: ["warm", "neutral"],
    luxe: ["cool", "neutral"],
    neutral: ["cool", "warm", "natural", "luxe"],
  };
  
  return compatibilityMap[hue1]?.includes(hue2) || false;
}

export function selectBestTemplates(
  context: BrandingContext,
  count: number = 3
): TemplateScore[] {
  const allTemplates = Object.values(templates);
  
  const scoredTemplates = allTemplates.map(template => 
    scoreTemplate(template, context)
  );
  
  // Sort by score descending
  scoredTemplates.sort((a, b) => b.score - a.score);
  
  // Return top N templates
  return scoredTemplates.slice(0, count);
}

export function selectBestTemplate(context: BrandingContext): LandingPageTemplate {
  const topTemplates = selectBestTemplates(context, 1);
  return topTemplates[0].template;
}

export function getTemplateRecommendations(
  context: BrandingContext
): { template: LandingPageTemplate; score: number; reasons: string[] }[] {
  return selectBestTemplates(context, 3);
}
