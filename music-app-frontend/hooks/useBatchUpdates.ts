// hooks/useBatchUpdates.ts
import { useCallback, useRef } from 'react';

/**
 * A hook to batch updates to state to prevent multiple re-renders
 * @param updateFn The function to call with batched updates
 * @param delay The delay in ms before applying batched updates
 */
export function useBatchUpdates<T>(
  updateFn: (updates: T[]) => void,
  delay: number = 100
) {
  // Use a ref to keep track of pending updates
  const pendingUpdatesRef = useRef<T[]>([]);
  
  // Use a ref for the timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to flush updates
  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length > 0) {
      updateFn([...pendingUpdatesRef.current]);
      pendingUpdatesRef.current = [];
    }
    timeoutRef.current = null;
  }, [updateFn]);
  
  // Function to queue an update
  const queueUpdate = useCallback((update: T) => {
    // Add to pending updates
    pendingUpdatesRef.current.push(update);
    
    // Schedule a flush if not already scheduled
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(flushUpdates, delay);
    }
  }, [flushUpdates, delay]);
  
  // Function to immediately flush all pending updates
  const forceFlush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    flushUpdates();
  }, [flushUpdates]);
  
  // Function to clear all pending updates
  const clearUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    pendingUpdatesRef.current = [];
  }, []);
  
  return {
    queueUpdate,
    forceFlush,
    clearUpdates,
    pendingCount: pendingUpdatesRef.current.length
  };
}

export default useBatchUpdates;