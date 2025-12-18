/**
 * useClickToEdit Hook
 * 
 * Manages element selection state and generates contextual prompts
 * for editing specific elements in the landing page.
 */

import { useState, useCallback, useMemo } from 'react';
import type { ElementContext } from '../types';

// ============================================================================
// Element Type Mappings
// ============================================================================

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  H1: 'heading',
  H2: 'heading',
  H3: 'heading',
  H4: 'heading',
  H5: 'heading',
  H6: 'heading',
  P: 'paragraph',
  SPAN: 'text',
  DIV: 'section',
  SECTION: 'section',
  ARTICLE: 'article',
  HEADER: 'header',
  FOOTER: 'footer',
  NAV: 'navigation',
  BUTTON: 'button',
  A: 'link',
  IMG: 'image',
  FORM: 'form',
  INPUT: 'input field',
  TEXTAREA: 'text area',
  SELECT: 'dropdown',
  UL: 'list',
  OL: 'numbered list',
  LI: 'list item',
  TABLE: 'table',
  FIGURE: 'figure',
  FIGCAPTION: 'caption',
  BLOCKQUOTE: 'quote',
  VIDEO: 'video',
  AUDIO: 'audio',
  IFRAME: 'embedded content',
  SVG: 'icon',
  MAIN: 'main content',
  ASIDE: 'sidebar',
};

// ============================================================================
// Edit Suggestion Templates
// ============================================================================

interface EditSuggestion {
  label: string;
  prompt: string;
}

function getEditSuggestions(element: ElementContext): EditSuggestion[] {
  const tagName = element.tagName.toUpperCase();
  const suggestions: EditSuggestion[] = [];

  // Common suggestions for all elements
  suggestions.push({
    label: 'Change text',
    prompt: `Change the text to: `,
  });

  // Element-specific suggestions
  switch (tagName) {
    case 'BUTTON':
    case 'A':
      suggestions.push(
        { label: 'Change color', prompt: 'Make this button ' },
        { label: 'Make larger', prompt: 'Make this button larger and more prominent' },
        { label: 'Add hover effect', prompt: 'Add a hover animation effect to this button' },
      );
      break;

    case 'H1':
    case 'H2':
    case 'H3':
      suggestions.push(
        { label: 'Make bolder', prompt: 'Make this heading bolder and more eye-catching' },
        { label: 'Add gradient', prompt: 'Add a gradient text effect to this heading' },
        { label: 'Center', prompt: 'Center this heading' },
      );
      break;

    case 'IMG':
      suggestions.push(
        { label: 'Add border', prompt: 'Add a rounded border to this image' },
        { label: 'Add shadow', prompt: 'Add a drop shadow to this image' },
        { label: 'Make circular', prompt: 'Make this image circular' },
      );
      break;

    case 'DIV':
    case 'SECTION':
      suggestions.push(
        { label: 'Add padding', prompt: 'Add more padding to this section' },
        { label: 'Change background', prompt: 'Change the background color to ' },
        { label: 'Add border', prompt: 'Add a subtle border to this section' },
      );
      break;

    case 'FORM':
      suggestions.push(
        { label: 'Add field', prompt: 'Add a phone number field to this form' },
        { label: 'Style inputs', prompt: 'Make the form inputs more modern looking' },
        { label: 'Add validation', prompt: 'Add visual validation styling to this form' },
      );
      break;

    case 'INPUT':
    case 'TEXTAREA':
      suggestions.push(
        { label: 'Change placeholder', prompt: 'Change the placeholder text to: ' },
        { label: 'Make required', prompt: 'Make this field required with a visual indicator' },
        { label: 'Add icon', prompt: 'Add an icon inside this input field' },
      );
      break;

    case 'UL':
    case 'OL':
      suggestions.push(
        { label: 'Add icons', prompt: 'Replace bullet points with checkmark icons' },
        { label: 'Make horizontal', prompt: 'Display this list horizontally' },
        { label: 'Add spacing', prompt: 'Add more spacing between list items' },
      );
      break;

    default:
      suggestions.push(
        { label: 'Change style', prompt: 'Change the styling of this element to ' },
        { label: 'Add animation', prompt: 'Add a subtle fade-in animation to this element' },
      );
  }

  // Add remove option for all elements
  suggestions.push({
    label: 'Remove',
    prompt: 'Remove this element from the page',
  });

  return suggestions;
}

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseClickToEditOptions {
  onEditRequest?: (prompt: string) => void;
}

export interface UseClickToEditReturn {
  // State
  selectedElement: ElementContext | null;
  isElementSelected: boolean;

  // Actions
  selectElement: (element: ElementContext | null) => void;
  clearSelection: () => void;

  // Helpers
  getElementLabel: () => string;
  getContextualPrompt: () => string;
  getEditSuggestions: () => EditSuggestion[];

  // Prompt generation
  generateEditPrompt: (instruction: string) => string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useClickToEdit(options: UseClickToEditOptions = {}): UseClickToEditReturn {
  const { onEditRequest } = options;
  const [selectedElement, setSelectedElement] = useState<ElementContext | null>(null);

  // ============================================================================
  // Actions
  // ============================================================================

  const selectElement = useCallback((element: ElementContext | null) => {
    setSelectedElement(element);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedElement(null);
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isElementSelected = selectedElement !== null;

  const getElementLabel = useCallback((): string => {
    if (!selectedElement) return '';
    
    const label = ELEMENT_TYPE_LABELS[selectedElement.tagName.toUpperCase()] || 'element';
    const textPreview = selectedElement.textContent?.substring(0, 30);
    
    if (textPreview) {
      return `${label} "${textPreview}${selectedElement.textContent && selectedElement.textContent.length > 30 ? '...' : ''}"`;
    }
    
    return label;
  }, [selectedElement]);

  const getContextualPrompt = useCallback((): string => {
    if (!selectedElement) return '';

    const label = ELEMENT_TYPE_LABELS[selectedElement.tagName.toUpperCase()] || 'element';
    const textPreview = selectedElement.textContent?.substring(0, 30);

    let prompt = `Edit the ${label}`;
    
    if (textPreview) {
      prompt += ` that says "${textPreview}${selectedElement.textContent && selectedElement.textContent.length > 30 ? '...' : ''}"`;
    }

    if (selectedElement.className) {
      const shortClass = selectedElement.className.split(' ')[0];
      if (shortClass && !shortClass.startsWith('_')) {
        prompt += ` (class: ${shortClass})`;
      }
    }

    return prompt + ': ';
  }, [selectedElement]);

  const getSuggestions = useCallback((): EditSuggestion[] => {
    if (!selectedElement) return [];
    return getEditSuggestions(selectedElement);
  }, [selectedElement]);

  // ============================================================================
  // Prompt Generation
  // ============================================================================

  const generateEditPrompt = useCallback((instruction: string): string => {
    if (!selectedElement) return instruction;

    const label = ELEMENT_TYPE_LABELS[selectedElement.tagName.toUpperCase()] || 'element';
    const textPreview = selectedElement.textContent?.substring(0, 50);

    let prompt = `Edit the ${label}`;
    
    if (textPreview) {
      prompt += ` that contains "${textPreview}${selectedElement.textContent && selectedElement.textContent.length > 50 ? '...' : ''}"`;
    }

    if (selectedElement.selector) {
      prompt += ` (selector: ${selectedElement.selector})`;
    }

    prompt += `: ${instruction}`;

    return prompt;
  }, [selectedElement]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    selectedElement,
    isElementSelected,
    selectElement,
    clearSelection,
    getElementLabel,
    getContextualPrompt,
    getEditSuggestions: getSuggestions,
    generateEditPrompt,
  };
}
