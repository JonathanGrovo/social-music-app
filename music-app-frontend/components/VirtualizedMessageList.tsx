// components/VirtualizedMessageList.tsx
import { useRef, useEffect, useState, memo, useCallback } from 'react';
import MessageGroup from './MessageGroup';

interface VirtualizedMessageListProps {
  messages: any[];
  formatMessageDate: (timestamp: number) => string;
  formatTimeOnly: (timestamp: number) => string;
  onScrollChange: (isNearBottom: boolean) => void;
}

function VirtualizedMessageList({
  messages,
  formatMessageDate,
  formatTimeOnly,
  onScrollChange
}: VirtualizedMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Track if we should scroll to bottom on next render
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  // Track if user is manually scrolling
  const isUserScrollingRef = useRef(false);
  // Track previous messages length for auto-scrolling
  const prevMessagesLengthRef = useRef(messages.length);
  // Track last scroll position
  const lastScrollTopRef = useRef(0);
  // Track last scroll height
  const lastScrollHeightRef = useRef(0);
  // Preserve message history when the component rerenders
  const messagesHistoryRef = useRef(messages);
  
  // Update message history reference when props change
  useEffect(() => {
    // Only update if we have messages and they're different from current history
    if (messages && messages.length > 0 && 
        (messagesHistoryRef.current.length === 0 || 
         messages[messages.length - 1] !== messagesHistoryRef.current[messagesHistoryRef.current.length - 1])) {
      messagesHistoryRef.current = messages;
    }
  }, [messages]);
  
  // Safety check - if messages are empty but we have history, use history
  const displayMessages = messages.length > 0 ? messages : messagesHistoryRef.current;

  // Debug logging - temporary
  useEffect(() => {
    console.log(`Messages count: ${messages.length}, History count: ${messagesHistoryRef.current.length}`);
    if (messages.length === 0 && messagesHistoryRef.current.length > 0) {
      console.warn('Using preserved message history instead of empty messages array');
    }
  }, [messages.length]);
  
  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);
  
  // Check if we're at the bottom
  const isAtBottom = useCallback(() => {
    if (!containerRef.current) return false;
    
    const container = containerRef.current;
    const scrollPosition = container.scrollHeight - container.scrollTop - container.clientHeight;
    return scrollPosition < 100; // Within 100px of bottom
  }, []);
  
  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isUserScrollingRef.current) return;
    
    // Save current scroll position
    lastScrollTopRef.current = containerRef.current.scrollTop;
    lastScrollHeightRef.current = containerRef.current.scrollHeight;
    
    // Determine if we're at the bottom
    const atBottom = isAtBottom();
    onScrollChange(atBottom);
    setShouldScrollToBottom(atBottom);
  }, [isAtBottom, onScrollChange]);
  
  // Scroll to bottom when new messages arrive if we were at the bottom
  useEffect(() => {
    const currentMessagesLength = displayMessages.length;
    const didMessagesChange = prevMessagesLengthRef.current !== currentMessagesLength;
    prevMessagesLengthRef.current = currentMessagesLength;
    
    if (shouldScrollToBottom && didMessagesChange) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    } else if (didMessagesChange && containerRef.current) {
      // Maintain scroll position when new messages are added but we're not at bottom
      const container = containerRef.current;
      const newScrollHeight = container.scrollHeight;
      const heightDifference = newScrollHeight - lastScrollHeightRef.current;
      
      if (heightDifference > 0) {
        // Adjust scroll position to maintain view
        container.scrollTop = lastScrollTopRef.current + heightDifference;
        // Update references
        lastScrollTopRef.current = container.scrollTop;
        lastScrollHeightRef.current = newScrollHeight;
      }
    }
  }, [displayMessages.length, shouldScrollToBottom, scrollToBottom]);
  
  // Add scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Initial scroll to bottom
    scrollToBottom();
    
    // Add scroll listener
    container.addEventListener('scroll', handleScroll);
    
    // Add mouse event listeners to detect user scrolling
    const handleMouseDown = () => {
      isUserScrollingRef.current = true;
    };
    
    const handleMouseUp = () => {
      isUserScrollingRef.current = false;
      // Re-evaluate scroll position after user interaction
      handleScroll();
    };
    
    container.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Clean up
    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleScroll, scrollToBottom]);

  return (
    <div 
      ref={containerRef}
      className="chat-messages-container overflow-y-auto flex-1 p-4 space-y-6"
      style={{ 
        overflowAnchor: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#4a4d53 transparent'
      }}
    >
      {displayMessages.length === 0 ? (
        <div className="text-center text-muted-foreground py-4">
          No messages yet. Start the conversation!
        </div>
      ) : (
        // Render all messages for now to fix scrolling issues
        displayMessages.map((group) => (
          <MessageGroup
            key={`group-${group.authorClientId}-${group.timestamp}`}
            authorClientId={group.authorClientId}
            authorUsername={group.authorUsername}
            authorAvatarId={group.authorAvatarId}
            isCurrentUser={group.isCurrentUser}
            timestamp={group.timestamp}
            messages={group.messages}
            formatMessageDate={formatMessageDate}
            formatTimeOnly={formatTimeOnly}
          />
        ))
      )}
    </div>
  );
}

export default memo(VirtualizedMessageList);