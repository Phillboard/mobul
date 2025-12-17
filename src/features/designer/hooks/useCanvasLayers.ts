/**
 * useCanvasLayers Hook
 * 
 * Manages canvas layers including selection, CRUD operations,
 * ordering, and undo/redo functionality.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  CanvasLayer,
  TextLayer,
  HistoryEntry,
  HistoryState,
} from '../types/layers';
import {
  generateLayerId,
  createBackgroundLayer,
  isTextLayer,
} from '../types/layers';

// ============================================================================
// Types
// ============================================================================

export interface UseCanvasLayersReturn {
  // State
  layers: CanvasLayer[];
  selectedLayer: CanvasLayer | null;
  selectedLayerId: string | null;
  
  // Selection
  selectLayer: (id: string | null) => void;
  
  // CRUD Operations
  addLayer: (layer: Omit<CanvasLayer, 'id' | 'zIndex'>) => string; // returns new id
  updateLayer: (id: string, updates: Partial<CanvasLayer>) => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => string; // returns new id
  
  // Ordering
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;
  moveLayerToTop: (id: string) => void;
  moveLayerToBottom: (id: string) => void;
  
  // Bulk operations
  setBackgroundImage: (imageUrl: string) => void;
  clearAllLayers: () => void;
  setLayers: (layers: CanvasLayer[]) => void;
  
  // Utilities
  getLayerById: (id: string) => CanvasLayer | undefined;
  getLayersWithTokens: () => TextLayer[];
  getLayersByType: (type: CanvasLayer['type']) => CanvasLayer[];
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // History
  pushHistory: (action?: string) => void;
}

const MAX_HISTORY = 50; // Maximum number of history entries

// ============================================================================
// Hook
// ============================================================================

export function useCanvasLayers(initialLayers: CanvasLayer[] = []): UseCanvasLayersReturn {
  const [layers, setLayersState] = useState<CanvasLayer[]>(initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // History state for undo/redo
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialLayers,
    future: [],
  });
  
  /**
   * Update layers and sync with history present
   */
  const setLayers = useCallback((newLayers: CanvasLayer[]) => {
    setLayersState(newLayers);
    setHistory(prev => ({ ...prev, present: newLayers }));
  }, []);
  
  /**
   * Push current state to history
   */
  const pushHistory = useCallback((action?: string) => {
    setHistory(prev => {
      const entry: HistoryEntry = {
        layers: prev.present,
        timestamp: Date.now(),
        action,
      };
      
      return {
        past: [...prev.past.slice(-MAX_HISTORY + 1), entry],
        present: layers,
        future: [], // Clear future when new action is performed
      };
    });
  }, [layers]);
  
  /**
   * Get selected layer
   */
  const selectedLayer = useMemo(() => {
    return layers.find(l => l.id === selectedLayerId) || null;
  }, [layers, selectedLayerId]);
  
  /**
   * Select a layer
   */
  const selectLayer = useCallback((id: string | null) => {
    setSelectedLayerId(id);
  }, []);
  
  /**
   * Add a new layer
   */
  const addLayer = useCallback((layerData: Omit<CanvasLayer, 'id' | 'zIndex'>) => {
    const id = generateLayerId();
    const zIndex = layers.length;
    const newLayer = { ...layerData, id, zIndex } as CanvasLayer;
    
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    pushHistory(`Add ${layerData.type} layer`);
    
    return id;
  }, [layers, setLayers, pushHistory]);
  
  /**
   * Update a layer
   */
  const updateLayer = useCallback((id: string, updates: Partial<CanvasLayer>) => {
    const newLayers = layers.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    );
    setLayers(newLayers);
    pushHistory(`Update layer`);
  }, [layers, setLayers, pushHistory]);
  
  /**
   * Delete a layer
   */
  const deleteLayer = useCallback((id: string) => {
    const layerToDelete = layers.find(l => l.id === id);
    const newLayers = layers.filter(layer => layer.id !== id);
    setLayers(newLayers);
    pushHistory(`Delete ${layerToDelete?.type || ''} layer`);
    
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  }, [layers, selectedLayerId, setLayers, pushHistory]);
  
  /**
   * Duplicate a layer
   */
  const duplicateLayer = useCallback((id: string) => {
    const layerToDuplicate = layers.find(l => l.id === id);
    if (!layerToDuplicate) return '';
    
    const newId = generateLayerId();
    const newLayer = {
      ...layerToDuplicate,
      id: newId,
      name: `${layerToDuplicate.name} Copy`,
      position: {
        x: layerToDuplicate.position.x + 10,
        y: layerToDuplicate.position.y + 10,
      },
      zIndex: layers.length,
    };
    
    const newLayers = [...layers, newLayer];
    setLayers(newLayers);
    pushHistory(`Duplicate layer`);
    
    return newId;
  }, [layers, setLayers, pushHistory]);
  
  /**
   * Move layer up in z-index
   */
  const moveLayerUp = useCallback((id: string) => {
    const index = layers.findIndex(l => l.id === id);
    if (index === -1 || index === layers.length - 1) return;
    
    const newLayers = [...layers];
    const temp = newLayers[index + 1];
    newLayers[index + 1] = { ...newLayers[index], zIndex: index + 1 };
    newLayers[index] = { ...temp, zIndex: index };
    
    setLayers(newLayers);
    pushHistory('Move layer up');
  }, [layers, setLayers, pushHistory]);
  
  /**
   * Move layer down in z-index
   */
  const moveLayerDown = useCallback((id: string) => {
    const index = layers.findIndex(l => l.id === id);
    if (index === -1 || index === 0) return;
    
    const newLayers = [...layers];
    const temp = newLayers[index - 1];
    newLayers[index - 1] = { ...newLayers[index], zIndex: index - 1 };
    newLayers[index] = { ...temp, zIndex: index };
    
    setLayers(newLayers);
    pushHistory('Move layer down');
  }, [layers, setLayers, pushHistory]);
  
  /**
   * Move layer to top
   */
  const moveLayerToTop = useCallback((id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    
    const filtered = layers.filter(l => l.id !== id);
    const newLayers = [...filtered, { ...layer, zIndex: filtered.length }].map((l, i) => ({
      ...l,
      zIndex: i,
    }));
    
    setLayers(newLayers);
    pushHistory('Move layer to top');
  }, [layers, setLayers, pushHistory]);
  
  /**
   * Move layer to bottom
   */
  const moveLayerToBottom = useCallback((id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    
    const filtered = layers.filter(l => l.id !== id);
    const newLayers = [{ ...layer, zIndex: 0 }, ...filtered].map((l, i) => ({
      ...l,
      zIndex: i,
    }));
    
    setLayers(newLayers);
    pushHistory('Move layer to bottom');
  }, [layers, setLayers, pushHistory]);
  
  /**
   * Set background image (convenience method)
   */
  const setBackgroundImage = useCallback((imageUrl: string) => {
    // Remove existing background layer if any
    const withoutBackground = layers.filter(l => l.type !== 'background');
    
    const backgroundLayer = createBackgroundLayer(imageUrl);
    
    // Background always at bottom
    const newLayers = [backgroundLayer, ...withoutBackground.map((l, i) => ({ ...l, zIndex: i + 1 }))];
    setLayers(newLayers);
    pushHistory('Set background');
  }, [layers, setLayers, pushHistory]);
  
  /**
   * Clear all layers
   */
  const clearAllLayers = useCallback(() => {
    setLayers([]);
    setSelectedLayerId(null);
    pushHistory('Clear all layers');
  }, [setLayers, pushHistory]);
  
  /**
   * Get layer by ID
   */
  const getLayerById = useCallback((id: string) => {
    return layers.find(l => l.id === id);
  }, [layers]);
  
  /**
   * Get all text layers that contain tokens
   */
  const getLayersWithTokens = useCallback(() => {
    return layers.filter((l): l is TextLayer => 
      isTextLayer(l) && l.containsTokens
    );
  }, [layers]);
  
  /**
   * Get all layers of a specific type
   */
  const getLayersByType = useCallback((type: CanvasLayer['type']) => {
    return layers.filter(l => l.type === type);
  }, [layers]);
  
  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (history.past.length === 0) return;
    
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    
    setHistory({
      past: newPast,
      present: previous.layers,
      future: [
        { layers: history.present, timestamp: Date.now() },
        ...history.future,
      ],
    });
    
    setLayersState(previous.layers);
  }, [history]);
  
  /**
   * Redo previously undone action
   */
  const redo = useCallback(() => {
    if (history.future.length === 0) return;
    
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    setHistory({
      past: [
        ...history.past,
        { layers: history.present, timestamp: Date.now() },
      ],
      present: next.layers,
      future: newFuture,
    });
    
    setLayersState(next.layers);
  }, [history]);
  
  return {
    // State
    layers,
    selectedLayer,
    selectedLayerId,
    
    // Selection
    selectLayer,
    
    // CRUD
    addLayer,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    
    // Ordering
    moveLayerUp,
    moveLayerDown,
    moveLayerToTop,
    moveLayerToBottom,
    
    // Bulk operations
    setBackgroundImage,
    clearAllLayers,
    setLayers,
    
    // Utilities
    getLayerById,
    getLayersWithTokens,
    getLayersByType,
    
    // Undo/Redo
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    
    // History
    pushHistory,
  };
}

