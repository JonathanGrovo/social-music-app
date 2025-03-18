// components/MessageInput.tsx
'use client'

import { useRef, useCallback, useState, memo, useEffect } from 'react';
import useAutoResizeTextarea from '../hooks/useAutoResizeTextarea';
import React from 'react';
import { emojiShortcodes } from '../utils/emojiShortcodes';

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
  
  // Add new state for shortcode suggestions
  const [shortcodeSuggestions, setShortcodeSuggestions] = useState<string[]>([]);
  const [currentShortcode, setCurrentShortcode] = useState<string>('');
  const [shortcodePosition, setShortcodePosition] = useState({ start: 0, end: 0 });
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  
  // State to track window position for dropdown positioning
  const [windowPosition, setWindowPosition] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  
  // Reference to the emoji picker container for click-away detection
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<any>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const suggestionListRef = useRef<HTMLUListElement>(null);

  // Use our custom hook for textarea auto-resizing with faster response
  const { textareaRef, resetHeight, adjustHeight } = useAutoResizeTextarea({
    minHeight: 44, // Set to 44px to match the natural height
    maxHeight: 200,
    debounceMs: 10 // Fast response time
  });
  
  // Track window resize for dropdown positioning
  useEffect(() => {
    const handleResize = () => {
      setWindowPosition({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  // Adjusts horizontal position of emoji picker on window resize
  useEffect(() => {
    const handleResize = () => {
      if (showEmojiPicker && textareaRef.current && emojiPickerRef.current) {
        const textareaRect = textareaRef.current.getBoundingClientRect();
        const pickerElement = emojiPickerRef.current;
        
        // Update position based on current textarea position
        pickerElement.style.bottom = `${window.innerHeight - textareaRect.top + 10}px`;
        pickerElement.style.left = `${textareaRect.left}px`;
        
        // Ensure the picker doesn't go off-screen
        const rightEdge = parseFloat(pickerElement.style.left) + 352;
        if (rightEdge > window.innerWidth) {
          pickerElement.style.left = `${window.innerWidth - 352 - 10}px`;
        }
      }
    };
    
    // Add event listener when picker is showing
    if (showEmojiPicker) {
      window.addEventListener('resize', handleResize);
    }
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [showEmojiPicker, textareaRef, emojiPickerRef]);
  
  // Function to check for partial shortcodes in text as the user types
  const checkForShortcodes = useCallback((text: string, cursorPosition: number) => {
    // If there's no text, clear suggestions
    if (!text) {
      setShortcodeSuggestions([]);
      setCurrentShortcode('');
      return;
    }
    
    // Get the text up to the cursor
    const textToCursor = text.substring(0, cursorPosition);
    
    // Use a regex that ensures the colon is either at the start of the text
    // or has a space before it (Discord-like behavior)
    const match = textToCursor.match(/(^|[\s]):([a-zA-Z0-9_+-]*)$/);
    
    if (match) {
      // Get the partial shortcode (including the starting colon)
      const partial = ':' + match[2].toLowerCase();
      setCurrentShortcode(partial);
      
      // Get start and end positions for replacement later
      // start should include the colon
      const start = cursorPosition - match[2].length - 1;
      const end = cursorPosition;
      setShortcodePosition({ start, end });
      
      // Only search if we have at least 2 characters after the colon
      if (partial.length > 2) {
        // Find shortcodes that match the partial
        const allShortcodes = Object.keys(emojiShortcodes);
        const partialWithoutColon = partial.substring(1);
        
        // Find shortcodes containing the search term anywhere in the string
        const matches = allShortcodes.filter(code => 
          code.toLowerCase().includes(partialWithoutColon)
        );
        
        // Sort matches: first those that start with the search term, then others
        const sortedMatches = matches.sort((a, b) => {
          const aStarts = a.toLowerCase().startsWith(':' + partialWithoutColon);
          const bStarts = b.toLowerCase().startsWith(':' + partialWithoutColon);
          
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return 0;
        });
        
        // Cap the number of suggestions at 50
        const cappedMatches = sortedMatches.slice(0, 50);
        
        // Show matching emojis, but limit max height with CSS
        setShortcodeSuggestions(cappedMatches);
        setSelectedSuggestionIndex(0); // Reset the selection index
      } else {
        // Not enough characters, clear suggestions
        setShortcodeSuggestions([]);
      }
    } else {
      // No partial shortcode found
      setShortcodeSuggestions([]);
      setCurrentShortcode('');
    }
  }, []);
  
  // Function to apply the selected shortcode suggestion
  const selectShortcodeSuggestion = useCallback((shortcode: string) => {
    if (textareaRef.current) {
      const text = textareaRef.current.value;
      const newText = 
        text.substring(0, shortcodePosition.start) + 
        shortcode + " " + // Add a space after for convenience
        text.substring(shortcodePosition.end);
      
      textareaRef.current.value = newText;
      messageContentRef.current = newText;
      
      // Update isEmpty state
      setIsEmpty(newText.trim().length === 0);
      
      // Set cursor position after the inserted shortcode + space
      const newCursorPos = shortcodePosition.start + shortcode.length + 1;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
      
      // Clear suggestions
      setShortcodeSuggestions([]);
      setCurrentShortcode('');
      
      // Adjust height if needed
      adjustHeight();
    }
  }, [adjustHeight, shortcodePosition, textareaRef]);
  
  // Click away listener for emoji picker and suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle emoji picker click-away
      if (showEmojiPicker && 
          emojiPickerRef.current && 
          emojiButtonRef.current && 
          !emojiPickerRef.current.contains(event.target as Node) &&
          !emojiButtonRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      
      // Handle suggestions click-away
      if (shortcodeSuggestions.length > 0 &&
          suggestionRef.current &&
          textareaRef.current &&
          !suggestionRef.current.contains(event.target as Node) &&
          !textareaRef.current.contains(event.target as Node)) {
        setShortcodeSuggestions([]);
        setCurrentShortcode('');
      }
    };

    // Add event listener when needed
    if (showEmojiPicker || shortcodeSuggestions.length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, shortcodeSuggestions.length]);
  
  // Handle input change without causing re-renders
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    messageContentRef.current = value;
    setIsEmpty(value.trim().length === 0);
    
    // Check for shortcodes at current cursor position
    checkForShortcodes(value, cursorPos);
  }, [checkForShortcodes]);

  // Handle when the text area gets focus
  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Get the current cursor position
    const cursorPos = e.target.selectionStart || 0;
    
    // Check for any potential shortcodes at the current cursor position
    checkForShortcodes(e.target.value, cursorPos);
  }, [checkForShortcodes]);

  // Handle clicks inside the textarea (this catches repositioning of cursor)
  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    // Get the current cursor position after the click
    const cursorPos = textarea.selectionStart || 0;
    
    // Check for any potential shortcodes at the new cursor position
    checkForShortcodes(textarea.value, cursorPos);
  }, [checkForShortcodes]);

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
      
      // Clear any suggestions
      setShortcodeSuggestions([]);
      setCurrentShortcode('');
    }
  }, [onSendMessage, resetHeight, textareaRef]);

  // Scroll to selected suggestion when using arrow keys
  useEffect(() => {
    if (suggestionListRef.current && shortcodeSuggestions.length > 0) {
      const listElement = suggestionListRef.current;
      const selectedElement = listElement.children[selectedSuggestionIndex] as HTMLElement;
      
      if (selectedElement) {
        // Calculate if the element is out of view
        const listRect = listElement.getBoundingClientRect();
        const selectedRect = selectedElement.getBoundingClientRect();
        
        if (selectedRect.bottom > listRect.bottom) {
          // Element is below the visible area
          selectedElement.scrollIntoView({ block: 'end', behavior: 'smooth' });
        } else if (selectedRect.top < listRect.top) {
          // Element is above the visible area
          selectedElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }
    }
  }, [selectedSuggestionIndex, shortcodeSuggestions.length]);

  // Handle key presses with Shift+Enter support and shortcode navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // If we have shortcode suggestions and user presses arrow keys/tab/enter
    if (shortcodeSuggestions.length > 0) {
      // Handle up/down arrows to navigate suggestions
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          (prev + 1) % shortcodeSuggestions.length
        );
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          (prev - 1 + shortcodeSuggestions.length) % shortcodeSuggestions.length
        );
        return;
      }
      
      // Handle Tab or Enter to select suggestion
      if ((e.key === 'Tab' || e.key === 'Enter') && shortcodeSuggestions.length > 0) {
        e.preventDefault();
        selectShortcodeSuggestion(shortcodeSuggestions[selectedSuggestionIndex]);
        return;
      }
      
      // Escape closes the suggestions
      if (e.key === 'Escape') {
        e.preventDefault();
        setShortcodeSuggestions([]);
        setCurrentShortcode('');
        return;
      }
    }
    
    // Regular keyboard shortcuts 
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
  }, [handleSend, adjustHeight, showEmojiPicker, shortcodeSuggestions, selectedSuggestionIndex, selectShortcodeSuggestion]);
  
  const toggleEmojiPicker = useCallback(() => {
    // Force re-render of the picker when showing
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
      // Wait a tick before hiding to ensure clean transition
      setTimeout(() => {
        if (emojiPickerRef.current) {
          emojiPickerRef.current.classList.remove('positioned');
        }
      }, 0);
    } else {
      setShowEmojiPicker(true);
      
      // Position immediately 
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        const emojiPickerContainer = emojiPickerRef.current;
        
        if (textarea && emojiPickerContainer) {
          const textareaRect = textarea.getBoundingClientRect();
          
          // Position picker
          emojiPickerContainer.style.bottom = `${window.innerHeight - textareaRect.top + 10}px`;
          emojiPickerContainer.style.left = `${textareaRect.left}px`;
          
          // Adjust for screen edges
          const rightEdge = parseFloat(emojiPickerContainer.style.left) + 352;
          if (rightEdge > window.innerWidth) {
            emojiPickerContainer.style.left = `${window.innerWidth - 352 - 10}px`;
          }
          
          // Make visible immediately
          emojiPickerContainer.classList.add('positioned');
          
          // Force refresh of emoji picker in Firefox
          if (navigator.userAgent.indexOf('Firefox') !== -1) {
            const pickerElement = emojiPickerContainer.querySelector('emoji-picker');
            if (pickerElement) {
              pickerElement.innerHTML = pickerElement.innerHTML;
            }
          }
        }
      });
    }
  }, [showEmojiPicker, textareaRef]);

  return (
    <div className="px-4 pb-4">
      {/* Emoji picker */}
      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="emoji-picker-container"
          style={{ 
            position: 'fixed',
            zIndex: 1000,
            width: '352px'
          }}
        >
          {React.createElement('emoji-picker', {
            ref: pickerRef,
            class: 'dark-theme',
          })}
        </div>
      )}
      
      <div className="flex items-start bg-[#383a40] dark:bg-[#40444b] rounded-lg overflow-hidden relative">
        {/* Message textarea with auto-resize */}
        <textarea
          ref={textareaRef}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onClick={handleClick}
          className="flex-1 px-3 py-2.5 bg-transparent text-foreground border-none focus:outline-none placeholder:text-muted-foreground resize-none overflow-y-auto"
          style={{ 
            height: '44px',
          }}
          placeholder={`Message ${roomName?.length > 15 ? roomName.substring(0, 15) + '...' : roomName}`}
          rows={1}
        />
        
        {/* Shortcode suggestions dropdown - Discord style */}
        {shortcodeSuggestions.length > 0 && (
          <div 
            ref={suggestionRef}
            className="emoji-suggestion-dropdown fixed z-50 shadow-xl" // Use fixed positioning and high z-index
            style={{ 
              bottom: textareaRef.current ? 
                windowPosition.height - textareaRef.current.getBoundingClientRect().top + 10 : '100px',
              left: textareaRef.current ? 
                textareaRef.current.getBoundingClientRect().left : '10px',
              width: '352px', // Static width as requested
              backgroundColor: '#232428', // Slightly lighter dark background
              border: '1px solid #4f545c',
              borderRadius: '4px',
              overflow: 'hidden',
              maxWidth: 'calc(100vw - 40px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Header showing what we're matching - with uppercase formatting */}
            <div className="sticky top-0 px-2 py-1.5 border-b border-[#2c2e33] bg-[#1e2024] text-[#9a9c9e] text-xs uppercase tracking-wider font-medium">
              EMOJI MATCHING {currentShortcode && currentShortcode.substring(0, 1) + currentShortcode.substring(1).toUpperCase()}
            </div>
            
            {/* Suggestion list - Discord style */}
            <ul 
              ref={suggestionListRef}
              className="max-h-72 overflow-y-auto emoji-suggestion-list hide-scrollbar-buttons"
              style={{ scrollbarWidth: 'thin' }}
            >
              {shortcodeSuggestions.map((code, index) => (
                <li 
                  key={code} 
                  className={`emoji-suggestion-item px-2 py-1 cursor-pointer flex items-center text-sm ${
                    index === selectedSuggestionIndex ? 'selected' : ''
                  }`}
                  onClick={() => selectShortcodeSuggestion(code)}
                >
                  {/* Emoji and shortcode text only */}
                  <span className="mr-2 text-base">{emojiShortcodes[code]}</span>
                  <span className="text-gray-200 flex-1 truncate">{code}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
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
      
      {/* Shortcut hint */}
      <div className="mt-1 text-xs text-muted-foreground opacity-70">
        <span>
          Type ":" followed by two or more letters to use emoji shortcodes
        </span>
      </div>
    </div>
  );
}

export default memo(MessageInput);