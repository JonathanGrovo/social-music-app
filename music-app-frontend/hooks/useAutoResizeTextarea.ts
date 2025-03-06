// hooks/useAutoResizeTextarea.ts
import { useCallback, useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';

interface AutoResizeOptions {
  minHeight?: number;
  maxHeight?: number;
  debounceMs?: number;
}

/**
 * Hook to automatically resize a textarea based on its content
 * @param options Configuration options
 * @returns An object with the ref and reset function
 */
export function useAutoResizeTextarea({
  minHeight = 40,
  maxHeight = 200,
  debounceMs = 10 // Much faster response time
}: AutoResizeOptions = {}) {
  // Reference to the textarea element
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Track if we've done initial sizing
  const initialSizingDoneRef = useRef(false);
  
  // Non-debounced direct height adjustment
  const adjustHeightImmediate = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Store the current scroll position
    const scrollTop = textarea.scrollTop;
    
    // Reset height temporarily to get the correct scrollHeight
    textarea.style.height = `${minHeight}px`;
    
    // Calculate new height
    const scrollHeight = textarea.scrollHeight;
    
    // Apply height constraints
    if (scrollHeight <= maxHeight) {
      textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
      textarea.style.overflowY = 'hidden';
    } else {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    }
    
    // Restore the scroll position
    textarea.scrollTop = scrollTop;
    
    // Mark initial sizing as done
    initialSizingDoneRef.current = true;
  }, [maxHeight, minHeight]);
  
  // Create a debounced version for performance on key repeat
  const debouncedAdjustHeight = useCallback(
    debounce(adjustHeightImmediate, debounceMs), 
    [adjustHeightImmediate, debounceMs]
  );
  
  // Set up event listeners when the component mounts
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Set initial fixed height without calculation
    if (!initialSizingDoneRef.current) {
      textarea.style.height = `${minHeight}px`;
      // Do immediate sizing once
      adjustHeightImmediate();
    }
    
    // For keydown events - needed to catch key repeats
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if it's a character key or keys that affect content
      if (
        e.key.length === 1 || // Character keys
        e.key === 'Backspace' || 
        e.key === 'Delete' || 
        e.key === 'Enter'
      ) {
        // Use immediate adjustment for better response
        // We'll use requestAnimationFrame to ensure it happens on the next paint
        requestAnimationFrame(adjustHeightImmediate);
      }
    };
    
    // For input events - catches paste and other non-keyboard inputs
    const handleInput = () => {
      adjustHeightImmediate();
    };
    
    // Add both event types for comprehensive coverage
    textarea.addEventListener('keydown', handleKeyDown);
    textarea.addEventListener('input', handleInput);
    
    // Clean up
    return () => {
      textarea.removeEventListener('keydown', handleKeyDown);
      textarea.removeEventListener('input', handleInput);
      debouncedAdjustHeight.cancel();
    };
  }, [adjustHeightImmediate, debouncedAdjustHeight, minHeight]);
  
  // Function to reset the textarea height
  const resetHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [minHeight]);
  
  return { textareaRef, resetHeight, adjustHeight: adjustHeightImmediate };
}

export default useAutoResizeTextarea;