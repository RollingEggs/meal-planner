import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 5;

export function useUndoRedo(initialState) {
  const [state, setState] = useState(initialState);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [, forceRender] = useState(0);

  const pushState = useCallback((newState) => {
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), state];
    futureRef.current = [];
    setState(typeof newState === 'function' ? newState(state) : newState);
    forceRender((n) => n + 1);
  }, [state]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, state];
    setState(prev);
    forceRender((n) => n + 1);
  }, [state]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, state];
    setState(next);
    forceRender((n) => n + 1);
  }, [state]);

  const resetHistory = useCallback((newState) => {
    pastRef.current = [];
    futureRef.current = [];
    setState(newState);
    forceRender((n) => n + 1);
  }, []);

  return {
    state,
    pushState,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    undoCount: pastRef.current.length,
    redoCount: futureRef.current.length,
    resetHistory,
  };
}
