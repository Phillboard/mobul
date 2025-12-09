/**
 * useDesignerState Hook
 * 
 * Primary state management for the designer canvas.
 * Manages elements, selection, canvas settings, and persistence.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import type {
  CanvasState,
  DesignElement,
  DesignerConfig,
  ElementUpdate,
} from '../types/designer';

export interface UseDesignerStateOptions {
  /** Designer configuration */
  config: DesignerConfig;
  /** Initial canvas state */
  initialState?: Partial<CanvasState>;
  /** Auto-save interval in milliseconds (0 to disable) */
  autoSaveInterval?: number;
  /** Callback when state changes */
  onChange?: (state: CanvasState) => void;
  /** Callback for auto-save */
  onAutoSave?: (state: CanvasState) => void;
}

export interface UseDesignerStateReturn {
  // State
  canvasState: CanvasState;
  config: DesignerConfig;
  isDirty: boolean;
  selectedElements: DesignElement[];
  
  // Element operations
  addElement: (element: Partial<DesignElement>) => string;
  updateElement: (id: string, updates: ElementUpdate) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  duplicateElement: (id: string) => string;
  
  // Selection operations
  selectElement: (id: string, multiSelect?: boolean) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Layer operations
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  
  // Canvas operations
  setBackgroundColor: (color: string) => void;
  setBackgroundImage: (url: string | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  toggleGrid: () => void;
  toggleGuides: () => void;
  
  // State management
  resetCanvas: () => void;
  loadState: (state: CanvasState) => void;
  exportState: () => CanvasState;
  markClean: () => void;
}

/**
 * Designer state management hook
 */
export function useDesignerState(
  options: UseDesignerStateOptions
): UseDesignerStateReturn {
  const {
    config,
    initialState,
    autoSaveInterval = 30000, // 30 seconds default
    onChange,
    onAutoSave,
  } = options;

  // Create initial canvas state
  const createInitialState = (): CanvasState => ({
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
    ...initialState,
  });

  const [canvasState, setCanvasState] = useState<CanvasState>(createInitialState);
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();

  // Update state helper with dirty tracking and onChange callback
  const updateState = useCallback((updater: (prev: CanvasState) => CanvasState) => {
    setCanvasState(prev => {
      const next = updater(prev);
      setIsDirty(true);
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  // Get selected elements
  const selectedElements = canvasState.elements.filter(
    el => canvasState.selectedElementIds.includes(el.id)
  );

  // ============================================================================
  // Element Operations
  // ============================================================================

  const addElement = useCallback((element: Partial<DesignElement>): string => {
    const id = element.id || nanoid();
    const newElement: DesignElement = {
      id,
      type: element.type || 'text',
      name: element.name,
      x: element.x ?? 100,
      y: element.y ?? 100,
      width: element.width ?? 200,
      height: element.height ?? 100,
      rotation: element.rotation ?? 0,
      zIndex: canvasState.elements.length,
      locked: element.locked ?? false,
      visible: element.visible ?? true,
      styles: element.styles ?? {},
      ...element,
    } as DesignElement;

    updateState(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
      selectedElementIds: [id], // Auto-select new element
    }));

    return id;
  }, [canvasState.elements.length, updateState]);

  const updateElement = useCallback((id: string, updates: ElementUpdate) => {
    updateState(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  }, [updateState]);

  const deleteElement = useCallback((id: string) => {
    updateState(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== id),
      selectedElementIds: prev.selectedElementIds.filter(selId => selId !== id),
    }));
  }, [updateState]);

  const deleteSelectedElements = useCallback(() => {
    const idsToDelete = new Set(canvasState.selectedElementIds);
    updateState(prev => ({
      ...prev,
      elements: prev.elements.filter(el => !idsToDelete.has(el.id)),
      selectedElementIds: [],
    }));
  }, [canvasState.selectedElementIds, updateState]);

  const duplicateElement = useCallback((id: string): string => {
    const element = canvasState.elements.find(el => el.id === id);
    if (!element) return '';

    const newId = nanoid();
    const duplicated: DesignElement = {
      ...element,
      id: newId,
      x: element.x + 20,
      y: element.y + 20,
      zIndex: canvasState.elements.length,
    };

    updateState(prev => ({
      ...prev,
      elements: [...prev.elements, duplicated],
      selectedElementIds: [newId],
    }));

    return newId;
  }, [canvasState.elements, updateState]);

  // ============================================================================
  // Selection Operations
  // ============================================================================

  const selectElement = useCallback((id: string, multiSelect = false) => {
    updateState(prev => ({
      ...prev,
      selectedElementIds: multiSelect
        ? prev.selectedElementIds.includes(id)
          ? prev.selectedElementIds.filter(selId => selId !== id)
          : [...prev.selectedElementIds, id]
        : [id],
    }));
  }, [updateState]);

  const selectElements = useCallback((ids: string[]) => {
    updateState(prev => ({
      ...prev,
      selectedElementIds: ids,
    }));
  }, [updateState]);

  const clearSelection = useCallback(() => {
    updateState(prev => ({
      ...prev,
      selectedElementIds: [],
    }));
  }, [updateState]);

  const selectAll = useCallback(() => {
    updateState(prev => ({
      ...prev,
      selectedElementIds: prev.elements.map(el => el.id),
    }));
  }, [updateState]);

  // ============================================================================
  // Layer Operations
  // ============================================================================

  const reorderElements = useCallback((reorderer: (elements: DesignElement[]) => DesignElement[]) => {
    updateState(prev => {
      const reordered = reorderer([...prev.elements]);
      // Update zIndex to match new order
      return {
        ...prev,
        elements: reordered.map((el, index) => ({ ...el, zIndex: index })),
      };
    });
  }, [updateState]);

  const bringToFront = useCallback((id: string) => {
    reorderElements(elements => {
      const element = elements.find(el => el.id === id);
      if (!element) return elements;
      return [...elements.filter(el => el.id !== id), element];
    });
  }, [reorderElements]);

  const sendToBack = useCallback((id: string) => {
    reorderElements(elements => {
      const element = elements.find(el => el.id === id);
      if (!element) return elements;
      return [element, ...elements.filter(el => el.id !== id)];
    });
  }, [reorderElements]);

  const bringForward = useCallback((id: string) => {
    reorderElements(elements => {
      const index = elements.findIndex(el => el.id === id);
      if (index === -1 || index === elements.length - 1) return elements;
      const result = [...elements];
      [result[index], result[index + 1]] = [result[index + 1], result[index]];
      return result;
    });
  }, [reorderElements]);

  const sendBackward = useCallback((id: string) => {
    reorderElements(elements => {
      const index = elements.findIndex(el => el.id === id);
      if (index <= 0) return elements;
      const result = [...elements];
      [result[index], result[index - 1]] = [result[index - 1], result[index]];
      return result;
    });
  }, [reorderElements]);

  // ============================================================================
  // Canvas Operations
  // ============================================================================

  const setBackgroundColor = useCallback((color: string) => {
    updateState(prev => ({
      ...prev,
      backgroundColor: color,
    }));
  }, [updateState]);

  const setBackgroundImage = useCallback((url: string | null) => {
    updateState(prev => ({
      ...prev,
      backgroundImage: url,
    }));
  }, [updateState]);

  const setCanvasSize = useCallback((width: number, height: number) => {
    updateState(prev => ({
      ...prev,
      width,
      height,
    }));
  }, [updateState]);

  const toggleGrid = useCallback(() => {
    updateState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        gridVisible: !prev.settings?.gridVisible,
      },
    }));
  }, [updateState]);

  const toggleGuides = useCallback(() => {
    updateState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        showGuides: !prev.settings?.showGuides,
      },
    }));
  }, [updateState]);

  // ============================================================================
  // State Management
  // ============================================================================

  const resetCanvas = useCallback(() => {
    const newState = createInitialState();
    setCanvasState(newState);
    setIsDirty(false);
    onChange?.(newState);
  }, [onChange]);

  const loadState = useCallback((state: CanvasState) => {
    setCanvasState(state);
    setIsDirty(false);
    onChange?.(state);
  }, [onChange]);

  const exportState = useCallback((): CanvasState => {
    return { ...canvasState };
  }, [canvasState]);

  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  // ============================================================================
  // Auto-save
  // ============================================================================

  useEffect(() => {
    if (autoSaveInterval <= 0 || !isDirty || !onAutoSave) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      onAutoSave(canvasState);
      setIsDirty(false);
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [canvasState, isDirty, autoSaveInterval, onAutoSave]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    canvasState,
    config,
    isDirty,
    selectedElements,

    // Element operations
    addElement,
    updateElement,
    deleteElement,
    deleteSelectedElements,
    duplicateElement,

    // Selection operations
    selectElement,
    selectElements,
    clearSelection,
    selectAll,

    // Layer operations
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,

    // Canvas operations
    setBackgroundColor,
    setBackgroundImage,
    setCanvasSize,
    toggleGrid,
    toggleGuides,

    // State management
    resetCanvas,
    loadState,
    exportState,
    markClean,
  };
}

