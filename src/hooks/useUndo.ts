/**
 * Undo/Redo Hook using Immer
 * Replaces custom useCanvasHistory with battle-tested Immer for immutable state updates
 */
import { useCallback, useState } from 'react';
import { produce } from 'immer';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndo<T>(initialState: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const set = useCallback((newPresent: T, clearFuture = true) => {
    setHistory(
      produce((draft) => {
        if (clearFuture) {
          draft.past.push(draft.present);
          draft.present = newPresent as any;
          draft.future = [];
        } else {
          draft.present = newPresent as any;
        }
      })
    );
  }, []);

  const undo = useCallback(() => {
    setHistory(
      produce((draft) => {
        if (draft.past.length > 0) {
          const previous = draft.past.pop()!;
          draft.future.unshift(draft.present);
          draft.present = previous;
        }
      })
    );
  }, []);

  const redo = useCallback(() => {
    setHistory(
      produce((draft) => {
        if (draft.future.length > 0) {
          const next = draft.future.shift()!;
          draft.past.push(draft.present);
          draft.present = next;
        }
      })
    );
  }, []);

  const reset = useCallback((newPresent: T) => {
    setHistory({
      past: [],
      present: newPresent,
      future: [],
    });
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
