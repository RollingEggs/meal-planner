import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 5;

export function useUndoRedo(initialState) {
  const [state, setState] = useState(initialState);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [histCounts, setHistCounts] = useState({ past: 0, future: 0 });

  const pushState = useCallback((newState) => {
    pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), state];
    futureRef.current = [];
    setState(typeof newState === 'function' ? newState(state) : newState);
    setHistCounts({ past: pastRef.current.length, future: 0 });
  }, [state]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, state];
    setState(prev);
    setHistCounts({ past: pastRef.current.length, future: futureRef.current.length });
  }, [state]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, state];
    setState(next);
    setHistCounts({ past: pastRef.current.length, future: futureRef.current.length });
  }, [state]);

  const resetHistory = useCallback((newState) => {
    pastRef.current = [];
    futureRef.current = [];
    setState(newState);
    setHistCounts({ past: 0, future: 0 });
  }, []);

  return {
    state,
    pushState,
    undo,
    redo,
    canUndo: histCounts.past > 0,
    canRedo: histCounts.future > 0,
    undoCount: histCounts.past,
    redoCount: histCounts.future,
    resetHistory,
  };
}
