import { RevealSettings } from "@/types/aceForms";

export interface CardStylePreset {
  name: string;
  description: string;
  settings: Partial<RevealSettings>;
  preview: {
    gradient: string;
    textColor: string;
  };
}

export const cardStylePresets: CardStylePreset[] = [
  {
    name: "Modern",
    description: "Clean gradients with subtle shadows",
    settings: {
      cardStyle: 'modern',
      cardGradient: true,
      showBrandLogo: true,
      animationStyle: 'confetti',
      showConfetti: true,
    },
    preview: {
      gradient: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)',
      textColor: 'hsl(var(--primary-foreground))',
    },
  },
  {
    name: "Classic",
    description: "Traditional card with elegant accents",
    settings: {
      cardStyle: 'classic',
      cardGradient: true,
      customGradientStart: '#1e3a8a',
      customGradientEnd: '#3b82f6',
      showBrandLogo: true,
      animationStyle: 'fade',
      showConfetti: false,
    },
    preview: {
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      textColor: '#ffffff',
    },
  },
  {
    name: "Minimal",
    description: "Simple, flat design focused on content",
    settings: {
      cardStyle: 'minimal',
      cardGradient: false,
      showBrandLogo: false,
      animationStyle: 'fade',
      showConfetti: false,
      revealBackground: 'solid',
    },
    preview: {
      gradient: 'hsl(var(--card))',
      textColor: 'hsl(var(--foreground))',
    },
  },
  {
    name: "Playful",
    description: "Bright colors with fun animations",
    settings: {
      cardStyle: 'playful',
      cardGradient: true,
      customGradientStart: '#ec4899',
      customGradientEnd: '#8b5cf6',
      showBrandLogo: true,
      animationStyle: 'confetti',
      showConfetti: true,
    },
    preview: {
      gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
      textColor: '#ffffff',
    },
  },
];
