// components/MessageInput.tsx

'use client'

import { useRef, useCallback, useState, memo, useEffect } from 'react';
import useAutoResizeTextarea from '../hooks/useAutoResizeTextarea';
import React from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  roomName?: string;
}

function MessageInput({ onSendMessage, roomName = "the room" }: MessageInputProps) {
  // Dynamic import of emoji-picker-element that only occurs client side
  useEffect(() => {
    // Dynamically import emoji-picker-element only on the client side
    import('emoji-picker-element');
  }, []);
  
  // Using useRef for the textarea content to avoid re-renders during typing
  const messageContentRef = useRef<string>('');
  
  // We still need a minimal state for controlled component
  const [isEmpty, setIsEmpty] = useState(true);
  
  // State for emoji picker visibility
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // Reference to the emoji picker container for click-away detection
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<any>(null);

  // Use our custom hook for textarea auto-resizing with faster response
  const { textareaRef, resetHeight, adjustHeight } = useAutoResizeTextarea({
    minHeight: 44, // Set to 44px to match the natural height
    maxHeight: 200,
    debounceMs: 10 // Fast response time
  });
  
  // Initialize emoji picker when it's shown
  useEffect(() => {
    if (showEmojiPicker && pickerRef.current) {
      // Initialize picker once it's in the DOM
      const picker = pickerRef.current;
      
      // Add click handler
      const handleEmojiClick = (event: any) => {
        const emoji = event.detail.unicode;
        
        if (textareaRef.current) {
          const start = textareaRef.current.selectionStart || 0;
          const end = textareaRef.current.selectionEnd || 0;
          const text = textareaRef.current.value;
          
          // Insert the emoji at cursor position
          const newText = text.substring(0, start) + emoji + text.substring(end);
          textareaRef.current.value = newText;
          
          // Update the ref
          messageContentRef.current = newText;
          
          // Update the isEmpty state
          setIsEmpty(newText.trim().length === 0);
          
          // Adjust height if needed
          adjustHeight();
          
          // Set cursor position after the inserted emoji
          const newCursorPos = start + emoji.length;
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.selectionStart = newCursorPos;
              textareaRef.current.selectionEnd = newCursorPos;
            }
          }, 0);
        }
        
        // Close the picker after selection
        setShowEmojiPicker(false);
      };
      
      picker.addEventListener('emoji-click', handleEmojiClick);
      
      // Cleanup handler on unmount
      return () => {
        picker.removeEventListener('emoji-click', handleEmojiClick);
      };
    }
  }, [showEmojiPicker, adjustHeight, textareaRef]);
  
  // Click away listener for emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && 
          emojiPickerRef.current && 
          emojiButtonRef.current && 
          !emojiPickerRef.current.contains(event.target as Node) &&
          !emojiButtonRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    // Add event listener when emoji picker is shown
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);
  
  // Handle input change without causing re-renders
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    messageContentRef.current = value;
    setIsEmpty(value.trim().length === 0);
  }, []);

  // Handle send message
  const handleSend = useCallback(() => {
    const content = messageContentRef.current.trim();
    if (content) {
      // Send the message first
      onSendMessage(content);
      
      // Clear the textarea
      if (textareaRef.current) {
        textareaRef.current.value = '';
        resetHeight();
        
        // Focus back on the textarea
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 0);
      }
      
      // Reset our state
      messageContentRef.current = '';
      setIsEmpty(true);
    }
  }, [onSendMessage, resetHeight, textareaRef]);

  // Handle key presses with Shift+Enter support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: add a new line
        requestAnimationFrame(adjustHeight);
        return; // Let the default behavior happen
      } else {
        // Just Enter: send the message
        e.preventDefault();
        handleSend();
      }
    } else if (e.key === 'Escape' && showEmojiPicker) {
      // Close emoji picker on Escape key
      setShowEmojiPicker(false);
    }
  }, [handleSend, adjustHeight, showEmojiPicker]);
  
  // Toggle emoji picker
  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
    
    // Focus the textarea after a delay to ensure cursor position is maintained
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  }, [textareaRef]);

  return (
    <div className="px-4 pb-4">
      {/* Emoji picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="fixed bottom-16 right-4 z-50 rounded-lg overflow-hidden"
          style={{ 
            transform: 'translateZ(0)',
            contain: 'layout paint style'
          }}
        >
          {/* Use createElement instead of JSX for the custom element */}
          {React.createElement('emoji-picker', {
            ref: pickerRef,
            class: 'dark-theme',
          })}
        </div>
      )}
      
      <div className="flex items-start bg-[#383a40] dark:bg-[#40444b] rounded-lg overflow-hidden">
        {/* Message textarea with auto-resize */}
        <textarea
          ref={textareaRef}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2.5 bg-transparent text-foreground border-none focus:outline-none placeholder:text-muted-foreground resize-none overflow-y-auto"
          style={{ 
            height: '44px',
          }}
          placeholder={`Message ${roomName?.length > 15 ? roomName.substring(0, 15) + '...' : roomName}`}
          rows={1}
        />
        
        {/* Emoji button */}
        <button
          ref={emojiButtonRef}
          type="button" 
          onClick={toggleEmojiPicker}
          className="p-2 mx-1 rounded flex-shrink-0 mt-1 text-[#959ba4] hover:text-[#bdc0c5] transition-colors duration-200"
          title="Add emoji"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>
        
        {/* Send button */}
        <button
          type="button" 
          onClick={handleSend}
          disabled={isEmpty}
          className={`p-2 mx-2 rounded flex-shrink-0 mt-1 ${
            !isEmpty 
              ? 'text-[#5865f2] hover:text-[#4752c4] transition-colors duration-200' 
              : 'text-[#4f5660] cursor-not-allowed'
          }`}
          style={{
            cursor: !isEmpty ? 'pointer' : 'not-allowed'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Export with memo to prevent unnecessary re-renders
export default memo(MessageInput);