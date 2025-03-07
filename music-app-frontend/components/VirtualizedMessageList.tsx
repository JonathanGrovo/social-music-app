// components/VirtualizedMessageList.tsx
import { useRef, useEffect, useState, memo, useCallback } from 'react';
import MessageGroup from './MessageGroup';

// Simple debug logger function that can be enabled/disabled
const DEBUG_ENABLED = true; // Set to false to disable logs
function debug(message: string, data?: any) {
  if (!DEBUG_ENABLED) return;
  if (data) {
    console.log(`[MessageList] ${message}`, data);
  } else {
    console.log(`[MessageList] ${message}`);
  }
}

interface VirtualizedMessageListProps {
  messages: any[];
  formatMessageDate: (timestamp: number) => string;
  formatTimeOnly: (timestamp: number) => string;
  onScrollChange: (isNearBottom: boolean) => void;
  activeTab?: string;
}

function VirtualizedMessageList({
  messages,
  formatMessageDate,
  formatTimeOnly,
  onScrollChange,
  activeTab
}: VirtualizedMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  
  // Simplified state tracking since we're not unmounting
  const lastMsgCountRef = useRef<number>(0);
  const lastTotalMessagesRef = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);
  const didInitialLoadRef = useRef<boolean>(false);
  const totalMessagesCountRef = useRef<number>(0);
  
  // Calculate total messages across all groups
  const calculateTotalMessages = useCallback(() => {
    return messages.reduce((total, group) => total + (group.messages?.length || 0), 0);
  }, [messages]);
  
  // Extract current user client ID
  const getCurrentUserClientId = useCallback(() => {
    for (const msg of messages) {
      if (msg.isCurrentUser) {
        return msg.authorClientId;
      }
    }
    return null;
  }, [messages]);
  
  // Get current user client ID
  const currentUserClientId = getCurrentUserClientId();
  
  // Function to check if we're near the bottom
  const isNearBottom = useCallback(() => {
    if (!containerRef.current) return true;
    
    const container = containerRef.current;
    const scrollPosition = container.scrollHeight - container.scrollTop - container.clientHeight;
    return scrollPosition < 100; // Within 100px of bottom
  }, []);
  
  // Function to scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      debug(`Scrolled to bottom: ${containerRef.current.scrollTop}`);
    }
  }, []);
  
  // Handle user scrolling - update button visibility
  const handleScroll = useCallback(() => {
    if (!containerRef.current || activeTab !== 'chat') return;
    
    // Check if near bottom
    const nearBottom = isNearBottom();
    isNearBottomRef.current = nearBottom;
    
    // Update button visibility
    setShowScrollToBottomButton(!nearBottom);
    
    // Add debug log
    debug(`Scrolled: position=${containerRef.current.scrollTop}, nearBottom=${nearBottom}`);
  }, [isNearBottom, activeTab]);
  
  // Function to check if new message is from current user
  const isMessageFromCurrentUser = useCallback(() => {
    if (messages.length === 0) return false;
    
    // Check if the last group is from current user
    const lastGroup = messages[messages.length - 1];
    return lastGroup.authorClientId === currentUserClientId;
  }, [messages, currentUserClientId]);
  
  // Initial load effect - runs only once
  useEffect(() => {
    if (!didInitialLoadRef.current && messages.length > 0) {
      debug('Initial load - scrolling to bottom');
      scrollToBottom();
      didInitialLoadRef.current = true;
    }
  }, [messages.length, scrollToBottom]);
  
  // Handle new messages
  useEffect(() => {
    // Skip processing if not in chat tab
    if (activeTab !== 'chat') return;
    
    // Calculate total messages to catch group updates
    const totalMessages = calculateTotalMessages();
    const totalMessagesChanged = totalMessages !== totalMessagesCountRef.current;
    
    // Skip if no change or not loaded yet
    if (!totalMessagesChanged || !didInitialLoadRef.current) {
      // Just update the counter and return
      totalMessagesCountRef.current = totalMessages;
      return;
    }
    
    debug(`Message update: total=${totalMessages}, previous=${totalMessagesCountRef.current}`);
    
    // Check if message is from current user
    const isCurrentUserMessage = isMessageFromCurrentUser();
    
    debug(`Message details: fromCurrentUser=${isCurrentUserMessage}, userNearBottom=${isNearBottomRef.current}`);
    
    // Auto-scroll if:
    // 1. Message is from current user OR
    // 2. User was already near bottom
    if (isCurrentUserMessage || isNearBottomRef.current) {
      debug('Auto-scrolling to bottom');
      setTimeout(scrollToBottom, 10);
    } else {
      // Show the scroll to bottom button
      debug('User scrolled up - showing button');
      setShowScrollToBottomButton(true);
    }
    
    // Update counter
    totalMessagesCountRef.current = totalMessages;
  }, [messages, calculateTotalMessages, scrollToBottom, isMessageFromCurrentUser, activeTab]);
  
  // Set up the scroll listener once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    debug('Setting up scroll listener');
    
    // Add scroll listener
    container.addEventListener('scroll', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      debug('Removed scroll listener');
    };
  }, [handleScroll]);
  
  // Handle scroll to bottom button click
  const handleScrollToBottomClick = () => {
    debug('Scroll to bottom button clicked');
    scrollToBottom();
    setShowScrollToBottomButton(false);
  };

  return (
    <>
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
      
      {/* Scroll to bottom button */}
      {showScrollToBottomButton && activeTab === 'chat' && (
        <button
          onClick={handleScrollToBottomClick}
          className="fixed bottom-24 right-12 bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-full shadow-lg flex items-center space-x-1 z-10"
          style={{ opacity: 0.9 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span className="text-sm">Recent messages</span>
        </button>
      )}
    </>
  );
}

export default memo(VirtualizedMessageList);