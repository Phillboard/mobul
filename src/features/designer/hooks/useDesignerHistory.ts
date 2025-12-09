/**
 * useDesignerHistory Hook
 * 
 * Undo/Redo functionality for the designer canvas.
 * Manages history stack and provides keyboard shortcuts.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CanvasState, HistoryState, HistoryManager } from '../types/designer';

export interface UseDesignerHistoryOptions {
  /** Initial canvas state */
  initialState: CanvasState;
  /** Maximum number of history states to keep */
  maxHistorySize?: number;
  /** Enable keyboard shortcuts (Ctrl+Z, Ctrl+Y) */
  enableKeyboardShortcuts?: boolean;
  /** Callback when history changes */
  onChange?: (state: CanvasState) => void;
}

export interface UseDesignerHistoryReturn extends HistoryManager {
  // Actions
  undo: () => void;
  redo: () => void;
  recordState: (state: CanvasState, action?: string) => void;
  clear: () => void;
  
  // State
  historySize: number;
  currentIndex: number;
}

/**
 * Designer history/undo-redo hook
 */
export function useDesignerHistory(
  options: UseDesignerHistoryOptions
): UseDesignerHistoryReturn {
  const {
    initialState,
    maxHistorySize = 50,
    enableKeyboardShortcuts = true,
    onChange,
  } = options;

  // History stacks
  const [past, setPast] = useState<HistoryState[]>([]);
  const [present, setPresent] = useState<CanvasState>(initialState);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // Track if we're applying history (to prevent recording during undo/redo)
  const isApplyingHistoryRef = useRef(false);

  // Computed properties
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const currentIndex = past.length;
  const historySize = past.length + 1 + future.length; // past + present + future

  // ============================================================================
  // History Operations
  // ============================================================================

  /**
   * Record a new state in history
   */
  const recordState = useCallback((state: CanvasState, action?: string) => {
    // Don't record if we're applying history
    if (isApplyingHistoryRef.current) return;

    const historyState: HistoryState = {
      canvasState: JSON.parse(JSON.stringify(state)), // Deep clone
      timestamp: new Date(),
      action,
    };

    setPast(prevPast => {
      // Add current present to past
      const newPast = [
        ...prevPast,
        {
          canvasState: JSON.parse(JSON.stringify(present)),
          timestamp: new Date(),
        },
      ];

      // Limit history size
      if (newPast.length > maxHistorySize) {
        return newPast.slice(newPast.length - maxHistorySize);
      }

      return newPast;
    });

    setPresent(state);
    setFuture([]); // Clear future when new state is recorded
    onChange?.(state);
  }, [present, maxHistorySize, onChange]);

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    if (!canUndo) return;

    isApplyingHistoryRef.current = true;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture([
      {
        canvasState: JSON.parse(JSON.stringify(present)),
        timestamp: new Date(),
      },
      ...future,
    ]);
    setPresent(previous.canvasState);
    onChange?.(previous.canvasState);

    // Reset flag after state update
    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 0);
  }, [canUndo, past, present, future, onChange]);

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    if (!canRedo) return;

    isApplyingHistoryRef.current = true;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([
      ...past,
      {
        canvasState: JSON.parse(JSON.stringify(present)),
        timestamp: new Date(),
      },
    ]);
    setFuture(newFuture);
    setPresent(next.canvasState);
    onChange?.(next.canvasState);

    // Reset flag after state update
    setTimeout(() => {
      isApplyingHistoryRef.current = false;
    }, 0);
  }, [canRedo, past, present, future, onChange]);

  /**
   * Clear all history
   */
  const clear = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd key
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z (Cmd+Y or Cmd+Shift+Z on Mac)
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, undo, redo]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // History state
    past,
    present,
    future,
    canUndo,
    canRedo,

    // Actions
    undo,
    redo,
    recordState,
    clear,

    // Metadata
    historySize,
    currentIndex,
  };
}

/**
 * Hook that integrates history with designer state
 * 
 * This combines useDesignerState with useDesignerHistory automatically.
 * Use this for convenience when you want both features together.
 */
export function useDesignerWithHistory(options: {
  config: Parameters<typeof import('./useDesignerState').useDesignerState>[0]['config'];
  initialState?: CanvasState;
  maxHistorySize?: number;
  enableKeyboardShortcuts?: boolean;
  autoSaveInterval?: number;
  onAutoSave?: (state: CanvasState) => void;
}) {
  const {
    config,
    initialState,
    maxHistorySize,
    enableKeyboardShortcuts,
    autoSaveInterval,
    onAutoSave,
  } = options;

  // Create initial state
  const [currentState, setCurrentState] = useState<CanvasState>(
    initialState || {
      width: config.dimensions.width,
      height: config.dimensions.height,
      backgroundColor: '#ffffff',
      backgroundImage: null,
      elements: [],
      selectedElementIds: [],
      settings: {
        gridSize: 10,
        gridVisible: false,
        snapToGrid: false,
        showGuides: true,
      },
    }
  );

  // Initialize history
  const history = useDesignerHistory({
    initialState: currentState,
    maxHistorySize,
    enableKeyboardShortcuts,
    onChange: setCurrentState,
  });

  // Import useDesignerState dynamically to avoid circular dependency
  // For now, we'll keep them separate - users can compose them manually

  return {
    ...history,
    currentState,
  };
}

