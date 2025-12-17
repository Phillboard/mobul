/**
 * Element Presets
 * 
 * Predefined configurations for common elements like code boxes, phone boxes, etc.
 */

import type { CodeBoxStyle, PhoneBoxStyle } from '../types/layers';

// ============================================================================
// Code Box Presets
// ============================================================================

export const CODE_BOX_PRESETS = {
  classic: {
    variant: 'ticket-stub' as const,
    backgroundColor: '#FEF3C7',
    textColor: '#92400E',
    borderColor: '#D97706',
    fontSize: 14,
  },
  modern: {
    variant: 'rounded' as const,
    backgroundColor: '#1F2937',
    textColor: '#FFFFFF',
    borderColor: 'transparent',
    fontSize: 14,
  },
  minimal: {
    variant: 'plain' as const,
    backgroundColor: 'transparent',
    textColor: '#1F2937',
    borderColor: 'transparent',
    fontSize: 12,
  },
  pill: {
    variant: 'pill' as const,
    backgroundColor: '#EFF6FF',
    textColor: '#1E40AF',
    borderColor: '#3B82F6',
    fontSize: 13,
  },
} satisfies Record<string, CodeBoxStyle>;

// ============================================================================
// Phone Box Presets
// ============================================================================

export const PHONE_BOX_PRESETS = {
  'primary-banner': {
    variant: 'banner' as const,
    backgroundColor: '#CC0000',
    textColor: '#FFFFFF',
    fontSize: 24,
    icon: true,
  },
  'white-button': {
    variant: 'button' as const,
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    fontSize: 20,
    icon: true,
  },
  'cta-style': {
    variant: 'with-cta' as const,
    backgroundColor: '#10B981',
    textColor: '#FFFFFF',
    fontSize: 18,
    icon: true,
    ctaText: 'CALL NOW',
  },
  plain: {
    variant: 'plain' as const,
    backgroundColor: 'transparent',
    textColor: '#1F2937',
    fontSize: 20,
    icon: false,
  },
} satisfies Record<string, PhoneBoxStyle>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get list of available code box preset names
 */
export function getCodeBoxPresetNames(): string[] {
  return Object.keys(CODE_BOX_PRESETS);
}

/**
 * Get a code box preset by name
 */
export function getCodeBoxPreset(name: string): CodeBoxStyle | undefined {
  return CODE_BOX_PRESETS[name as keyof typeof CODE_BOX_PRESETS];
}

/**
 * Get list of available phone box preset names
 */
export function getPhoneBoxPresetNames(): string[] {
  return Object.keys(PHONE_BOX_PRESETS);
}

/**
 * Get a phone box preset by name
 */
export function getPhoneBoxPreset(name: string): PhoneBoxStyle | undefined {
  return PHONE_BOX_PRESETS[name as keyof typeof PHONE_BOX_PRESETS];
}

