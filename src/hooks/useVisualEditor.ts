/**
 * Visual Editor State Management Hook
 * Handles undo/redo, element selection, and state persistence
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useImmer } from 'use-immer';

export interface EditorElement {
  id: string;
  type: string;
  tagName: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  content?: string;
  children?: EditorElement[];
}

export interface EditorState {
  html: string;
  elements: EditorElement[];
  selectedElementId: string | null;
  zoom: number;
  device: 'desktop' | 'tablet' | 'mobile';
}

interface HistoryEntry {
  state: EditorState;
  timestamp: number;
}

export function useVisualEditor(initialHtml: string) {
  const [state, updateState] = useImmer<EditorState>({
    html: initialHtml,
    elements: [],
    selectedElementId: null,
    zoom: 100,
    device: 'desktop',
  });

  const [history, setHistory] = useState<HistoryEntry[]>([
    { state, timestamp: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track if we're in the middle of an undo/redo operation
  const isUndoRedoing = useRef(false);

  // Add to history when state changes (debounced)
  const addToHistory = useCallback((newState: EditorState) => {
    if (isUndoRedoing.current) return;

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ state: newState, timestamp: Date.now() });
      
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
    setHasUnsavedChanges(true);
  }, [historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoing.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      updateState(() => history[newIndex].state);
      setTimeout(() => {
        isUndoRedoing.current = false;
      }, 0);
    }
  }, [historyIndex, history, updateState]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoing.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      updateState(() => history[newIndex].state);
      setTimeout(() => {
        isUndoRedoing.current = false;
      }, 0);
    }
  }, [historyIndex, history, updateState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Update HTML
  const updateHtml = useCallback((newHtml: string) => {
    updateState((draft) => {
      draft.html = newHtml;
    });
    addToHistory({ ...state, html: newHtml });
  }, [state, updateState, addToHistory]);

  // Select element
  const selectElement = useCallback((elementId: string | null) => {
    updateState((draft) => {
      draft.selectedElementId = elementId;
    });
  }, [updateState]);

  // Update element styles
  const updateElementStyles = useCallback((elementId: string, styles: Record<string, string>) => {
    updateState((draft) => {
      // In a real implementation, this would update the element in the DOM
      // and regenerate the HTML
    });
    addToHistory(state);
  }, [state, updateState, addToHistory]);

  // Set zoom
  const setZoom = useCallback((zoom: number) => {
    updateState((draft) => {
      draft.zoom = Math.max(25, Math.min(200, zoom));
    });
  }, [updateState]);

  // Set device
  const setDevice = useCallback((device: 'desktop' | 'tablet' | 'mobile') => {
    updateState((draft) => {
      draft.device = device;
    });
  }, [updateState]);

  // Mark as saved
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  return {
    state,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    hasUnsavedChanges,
    undo,
    redo,
    updateHtml,
    selectElement,
    updateElementStyles,
    setZoom,
    setDevice,
    markAsSaved,
  };
}

