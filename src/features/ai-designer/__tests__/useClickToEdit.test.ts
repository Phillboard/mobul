/**
 * useClickToEdit Hook Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClickToEdit } from '../hooks/useClickToEdit';
import type { ElementContext } from '../types';

describe('useClickToEdit', () => {
  const mockElement: ElementContext = {
    selector: 'div.container > h1',
    tagName: 'H1',
    textContent: 'Welcome to our site',
    className: 'text-4xl font-bold',
    id: undefined,
    parentContext: 'div',
  };

  describe('selectElement', () => {
    it('should select an element', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      expect(result.current.selectedElement).toEqual(mockElement);
      expect(result.current.isElementSelected).toBe(true);
    });

    it('should clear selection when null is passed', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      act(() => {
        result.current.selectElement(null);
      });
      
      expect(result.current.selectedElement).toBeNull();
      expect(result.current.isElementSelected).toBe(false);
    });
  });

  describe('clearSelection', () => {
    it('should clear the selected element', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedElement).toBeNull();
      expect(result.current.isElementSelected).toBe(false);
    });
  });

  describe('getElementLabel', () => {
    it('should return empty string when no element selected', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      expect(result.current.getElementLabel()).toBe('');
    });

    it('should return a label with element type and text', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      const label = result.current.getElementLabel();
      expect(label).toContain('heading');
      expect(label).toContain('Welcome to our site');
    });

    it('should truncate long text content', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      const longTextElement: ElementContext = {
        ...mockElement,
        textContent: 'This is a very long text that should be truncated because it exceeds thirty characters',
      };
      
      act(() => {
        result.current.selectElement(longTextElement);
      });
      
      const label = result.current.getElementLabel();
      expect(label).toContain('...');
    });
  });

  describe('getContextualPrompt', () => {
    it('should return empty string when no element selected', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      expect(result.current.getContextualPrompt()).toBe('');
    });

    it('should generate a contextual prompt for selected element', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      const prompt = result.current.getContextualPrompt();
      expect(prompt).toContain('Edit the heading');
      expect(prompt).toContain('Welcome to our site');
      expect(prompt).toEndWith(': ');
    });

    it('should include class name in prompt', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      const prompt = result.current.getContextualPrompt();
      expect(prompt).toContain('text-4xl');
    });
  });

  describe('getEditSuggestions', () => {
    it('should return empty array when no element selected', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      expect(result.current.getEditSuggestions()).toEqual([]);
    });

    it('should return suggestions for heading elements', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      const suggestions = result.current.getEditSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.label === 'Change text')).toBe(true);
      expect(suggestions.some(s => s.label === 'Remove')).toBe(true);
    });

    it('should return button-specific suggestions for button elements', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      const buttonElement: ElementContext = {
        ...mockElement,
        tagName: 'BUTTON',
        textContent: 'Click me',
      };
      
      act(() => {
        result.current.selectElement(buttonElement);
      });
      
      const suggestions = result.current.getEditSuggestions();
      expect(suggestions.some(s => s.label === 'Change color')).toBe(true);
      expect(suggestions.some(s => s.label === 'Make larger')).toBe(true);
    });

    it('should return image-specific suggestions for img elements', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      const imgElement: ElementContext = {
        ...mockElement,
        tagName: 'IMG',
        textContent: '',
      };
      
      act(() => {
        result.current.selectElement(imgElement);
      });
      
      const suggestions = result.current.getEditSuggestions();
      expect(suggestions.some(s => s.label === 'Add border')).toBe(true);
      expect(suggestions.some(s => s.label === 'Add shadow')).toBe(true);
    });
  });

  describe('generateEditPrompt', () => {
    it('should return just instruction when no element selected', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      const prompt = result.current.generateEditPrompt('Make it blue');
      expect(prompt).toBe('Make it blue');
    });

    it('should generate contextual prompt with instruction', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      const prompt = result.current.generateEditPrompt('Make it blue');
      expect(prompt).toContain('Edit the heading');
      expect(prompt).toContain('Welcome to our site');
      expect(prompt).toContain('Make it blue');
    });

    it('should include selector in the prompt', () => {
      const { result } = renderHook(() => useClickToEdit());
      
      act(() => {
        result.current.selectElement(mockElement);
      });
      
      const prompt = result.current.generateEditPrompt('Make it larger');
      expect(prompt).toContain('selector');
      expect(prompt).toContain('div.container > h1');
    });
  });

  describe('element type mapping', () => {
    const testCases = [
      { tagName: 'H1', expectedLabel: 'heading' },
      { tagName: 'H2', expectedLabel: 'heading' },
      { tagName: 'P', expectedLabel: 'paragraph' },
      { tagName: 'BUTTON', expectedLabel: 'button' },
      { tagName: 'A', expectedLabel: 'link' },
      { tagName: 'IMG', expectedLabel: 'image' },
      { tagName: 'FORM', expectedLabel: 'form' },
      { tagName: 'INPUT', expectedLabel: 'input field' },
      { tagName: 'DIV', expectedLabel: 'section' },
      { tagName: 'SECTION', expectedLabel: 'section' },
      { tagName: 'NAV', expectedLabel: 'navigation' },
      { tagName: 'FOOTER', expectedLabel: 'footer' },
      { tagName: 'UL', expectedLabel: 'list' },
    ];

    testCases.forEach(({ tagName, expectedLabel }) => {
      it(`should map ${tagName} to "${expectedLabel}"`, () => {
        const { result } = renderHook(() => useClickToEdit());
        
        act(() => {
          result.current.selectElement({
            ...mockElement,
            tagName,
            textContent: 'Test content',
          });
        });
        
        const label = result.current.getElementLabel();
        expect(label).toContain(expectedLabel);
      });
    });
  });
});



