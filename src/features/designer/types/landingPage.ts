/**
 * Landing Page Types
 * Types and configurations for landing page designer
 */

export type LandingPageSection = 
  | 'hero'
  | 'form'
  | 'gift-card'
  | 'benefits'
  | 'trust'
  | 'faq'
  | 'footer';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface LandingPageConfig {
  sections: LandingPageSection[];
  style: 'minimal' | 'standard' | 'detailed';
  form: {
    fields: FormField[];
    submitLabel: string;
    successMessage: string;
  };
  previewDevice: 'desktop' | 'tablet' | 'mobile';
}

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  sections: ['hero', 'form', 'gift-card', 'trust', 'footer'],
  style: 'standard',
  form: {
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'phone', required: true },
    ],
    submitLabel: 'CLAIM MY GIFT CARD',
    successMessage: 'Thanks! Your gift card is on the way.',
  },
  previewDevice: 'desktop',
};

export const LANDING_PAGE_DIMENSIONS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};
