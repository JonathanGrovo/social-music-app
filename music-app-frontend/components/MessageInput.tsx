// components/MessageInput.tsx
import { useRef, useCallback, useState, memo } from 'react';
import useAutoResizeTextarea from '../hooks/useAutoResizeTextarea';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  roomName?: string;
}

function MessageInput({ onSendMessage, roomName = "the room" }: MessageInputProps) {
  // Using useRef for the textarea content to avoid re-renders during typing
  const messageContentRef = useRef<string>('');
  
  // We still need a minimal state for controlled component
  const [isEmpty, setIsEmpty] = useState(true);

  // Use our custom hook for textarea auto-resizing with faster response
  const { textareaRef, resetHeight, adjustHeight } = useAutoResizeTextarea({
    minHeight: 40,
    maxHeight: 200,
    debounceMs: 10 // Fast response time
  });
  
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
      onSendMessage(content);
      // Clear the textarea
      if (textareaRef.current) {
        textareaRef.current.value = '';
        resetHeight();
      }
      messageContentRef.current = '';
      setIsEmpty(true);
    }
  }, [onSendMessage, resetHeight, textareaRef]);

  // Handle key presses with Shift+Enter support and immediate height adjustment
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: add a new line
        // Manually trigger height adjustment on next frame
        requestAnimationFrame(adjustHeight);
        return; // Let the default behavior happen
      } else {
        // Just Enter: send the message
        e.preventDefault();
        handleSend();
      }
    }
  }, [handleSend, adjustHeight]);

  return (
    <div className="px-4 pb-4">
      <div className="flex items-start bg-[#383a40] dark:bg-[#40444b] rounded-lg overflow-hidden">
        {/* Message textarea with auto-resize */}
        <textarea
          ref={textareaRef}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2.5 bg-transparent text-foreground border-none focus:outline-none placeholder:text-muted-foreground resize-none min-h-[40px] max-h-[200px] overflow-y-auto"
          placeholder={`Message ${roomName?.length > 15 ? roomName.substring(0, 15) + '...' : roomName}`}
          rows={1}
        />
        
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