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
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const isUserScrollingRef = useRef(false);
  
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
    
    // Determine if we're at the bottom
    const atBottom = isAtBottom();
    onScrollChange(atBottom);
    setShouldScrollToBottom(atBottom);
  }, [isAtBottom, onScrollChange]);
  
  // Scroll to bottom when new messages arrive if we were at the bottom
  useEffect(() => {
    if (shouldScrollToBottom && messages.length > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages.length, shouldScrollToBottom, scrollToBottom]);
  
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
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground py-4">
            No messages yet. Start the conversation!
          </div>
        </div>
      ) : (
        // Render all messages 
        messages.map((group) => (
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