/**
 * AI Landing Page Generator
 * 
 * Lovable-style AI-powered landing page generation with image and website analysis
 */

import { supabase } from '@core/services/supabase';

export interface StyleGuide {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  messaging: {
    headline: string;
    subheadline: string;
    cta: string;
    value_props: string[];
  };
  style: 'modern' | 'professional' | 'playful' | 'elegant' | 'bold';
}

export interface PageGenerationRequest {
  prompt: string;
  styleGuide?: StyleGuide;
  postcardImageUrl?: string;
  websiteUrl?: string;
  campaignId?: string;
  includeForm?: boolean;
  includeGiftCardRedemption?: boolean;
}

export interface PageGenerationResponse {
  success: boolean;
  html: string;
  css?: string;
  js?: string;
  styleGuide?: StyleGuide;
  error?: string;
}

/**
 * Analyze postcard image to extract style guide
 */
export async function analyzePostcardImage(imageFile: File): Promise<StyleGuide> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const { data, error } = await supabase.functions.invoke('analyze-image-for-landing-page', {
    body: formData,
  });

  if (error) throw error;

  return data.styleGuide;
}

/**
 * Analyze website to extract style guide
 */
export async function analyzeWebsite(url: string): Promise<StyleGuide> {
  const { data, error } = await supabase.functions.invoke('analyze-website-style', {
    body: { url },
  });

  if (error) throw error;

  return data.styleGuide;
}

/**
 * Generate landing page with AI
 */
export async function generateLandingPage(
  request: PageGenerationRequest
): Promise<PageGenerationResponse> {
  const { data, error } = await supabase.functions.invoke('generate-landing-page-ai', {
    body: request,
  });

  if (error) {
    return {
      success: false,
      html: '',
      error: error.message || 'Failed to generate landing page',
    };
  }

  return {
    success: true,
    ...data,
  };
}

/**
 * Refine existing landing page
 */
export async function refineLandingPage(
  currentHTML: string,
  refinementPrompt: string
): Promise<PageGenerationResponse> {
  const { data, error } = await supabase.functions.invoke('refine-landing-page', {
    body: {
      html: currentHTML,
      prompt: refinementPrompt,
    },
  });

  if (error) {
    return {
      success: false,
      html: currentHTML,
      error: error.message || 'Failed to refine landing page',
    };
  }

  return {
    success: true,
    ...data,
  };
}

/**
 * Publish landing page to campaign
 */
export async function publishLandingPage(
  html: string,
  css: string,
  campaignId?: string
): Promise<{ success: boolean; landingPageId?: string; error?: string }> {
  try {
    const { data: landingPage, error } = await supabase
      .from('landing_pages')
      .insert({
        name: `AI Generated - ${new Date().toLocaleString()}`,
        html_content: html,
        css_content: css,
        published: true,
        editor_type: 'ai-html',
      })
      .select()
      .single();

    if (error) throw error;

    // Link to campaign if provided
    if (campaignId && landingPage) {
      await supabase
        .from('campaigns')
        .update({ landing_page_id: landingPage.id })
        .eq('id', campaignId);
    }

    return {
      success: true,
      landingPageId: landingPage?.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

