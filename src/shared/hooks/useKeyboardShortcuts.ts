/**
 * Keyboard Shortcuts Hook
 * 
 * Provides global keyboard shortcuts for power users.
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatureFlags } from './useFeatureFlags';

interface ShortcutAction {
  key: string;
  modifiers?: ('ctrl' | 'meta' | 'shift' | 'alt')[];
  action: () => void;
  description: string;
  category: string;
}

/**
 * Hook to register global keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { isEnabled } = useFeatureFlags();

  // Define all shortcuts
  const shortcuts: ShortcutAction[] = [
    // Navigation shortcuts
    { key: 'g', modifiers: ['meta'], action: () => navigate('/'), description: 'Go to Dashboard', category: 'Navigation' },
    { key: 'c', modifiers: ['meta', 'shift'], action: () => navigate('/campaigns'), description: 'Go to Campaigns', category: 'Navigation' },
    { key: 'u', modifiers: ['meta', 'shift'], action: () => navigate('/contacts'), description: 'Go to Contacts', category: 'Navigation' },
    { key: 'f', modifiers: ['meta', 'shift'], action: () => navigate('/forms'), description: 'Go to Forms', category: 'Navigation' },
    { key: ',', modifiers: ['meta'], action: () => navigate('/settings'), description: 'Go to Settings', category: 'Navigation' },
    
    // Action shortcuts (these trigger modals/dialogs in their respective pages)
    { key: 'n', modifiers: ['meta'], action: () => {
      // Dispatch custom event that pages can listen to
      window.dispatchEvent(new CustomEvent('shortcut:new'));
    }, description: 'Create New (context-sensitive)', category: 'Actions' },
    
    { key: 's', modifiers: ['meta'], action: () => {
      // Dispatch custom event for saving
      window.dispatchEvent(new CustomEvent('shortcut:save'));
    }, description: 'Save (context-sensitive)', category: 'Actions' },
    
    { key: 'Escape', modifiers: [], action: () => {
      window.dispatchEvent(new CustomEvent('shortcut:escape'));
    }, description: 'Close dialog/modal', category: 'Actions' },
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled('keyboard_shortcuts')) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Cmd+S even in inputs
      if (!(event.key === 's' && (event.metaKey || event.ctrlKey))) {
        return;
      }
    }

    for (const shortcut of shortcuts) {
      const modifiersMatch = (shortcut.modifiers || []).every(mod => {
        switch (mod) {
          case 'ctrl': return event.ctrlKey;
          case 'meta': return event.metaKey || event.ctrlKey; // Support both Mac and Windows
          case 'shift': return event.shiftKey;
          case 'alt': return event.altKey;
          default: return false;
        }
      });

      // Check that no extra modifiers are pressed
      const noExtraModifiers = 
        (shortcut.modifiers?.includes('ctrl') || shortcut.modifiers?.includes('meta') || !event.ctrlKey && !event.metaKey) &&
        (shortcut.modifiers?.includes('shift') || !event.shiftKey) &&
        (shortcut.modifiers?.includes('alt') || !event.altKey);

      if (event.key.toLowerCase() === shortcut.key.toLowerCase() && modifiersMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts, isEnabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

/**
 * Get all available shortcuts for display
 */
export function getKeyboardShortcuts(): Array<{
  key: string;
  modifiers: string[];
  description: string;
  category: string;
}> {
  return [
    // Search
    { key: 'K', modifiers: ['⌘'], description: 'Open search', category: 'Search' },
    
    // Navigation
    { key: 'G', modifiers: ['⌘'], description: 'Go to Dashboard', category: 'Navigation' },
    { key: 'C', modifiers: ['⌘', '⇧'], description: 'Go to Campaigns', category: 'Navigation' },
    { key: 'U', modifiers: ['⌘', '⇧'], description: 'Go to Contacts', category: 'Navigation' },
    { key: 'F', modifiers: ['⌘', '⇧'], description: 'Go to Forms', category: 'Navigation' },
    { key: ',', modifiers: ['⌘'], description: 'Go to Settings', category: 'Navigation' },
    
    // Actions
    { key: 'N', modifiers: ['⌘'], description: 'Create new item', category: 'Actions' },
    { key: 'S', modifiers: ['⌘'], description: 'Save', category: 'Actions' },
    { key: 'Esc', modifiers: [], description: 'Close dialog', category: 'Actions' },
  ];
}

