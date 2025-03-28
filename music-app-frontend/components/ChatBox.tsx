// components/ChatBox.tsx
import { useEffect, useRef, useCallback, useState, memo } from 'react';
import { ChatMessage } from '../types';
import MessageInput from './MessageInput';
import MessageGroup from './MessageGroup';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
  clientId: string;
  avatarId: string;
  roomName?: string;
  roomId: string;
  activeTab?: string;
}

// Message grouping threshold (5 minutes)
const MESSAGE_GROUPING_THRESHOLD = 5 * 60 * 1000;

function ChatBox({ 
  messages, 
  onSendMessage, 
  username, 
  clientId, 
  avatarId,
  roomName = "the room",
  roomId,
  activeTab
}: ChatBoxProps) {
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
  const userJustSentMessageRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Format time only (HH:MM AM/PM)
  const formatTimeOnly = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }, []);
  
  // Format date for message groups
  const formatMessageDate = useCallback((timestamp: number): string => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // Check if the message is from today
    if (messageDate.toDateString() === now.toDateString()) {
      return 'Today at ' + formatTimeOnly(timestamp);
    }
    
    // Check if the message is from yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday at ' + formatTimeOnly(timestamp);
    }
    
    // For older messages, include the date
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + formatTimeOnly(timestamp);
  }, [formatTimeOnly]);
  
  // Grouping messages for display
  const groupedMessages = messages.reduce((groups: any[], msg) => {
    // Skip invalid message objects
    if (!msg || !msg.clientId || !msg.timestamp) {
      console.warn('Skipping invalid message object', msg);
      return groups;
    }
    
    const isCurrentUser = msg.clientId === clientId;
    
    // Create a unique ID for each message
    const msgId = `msg-${msg.clientId}-${msg.timestamp}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Try to add to the last group if from same author and within time threshold
    const lastGroup = groups.length > 0 ? groups[groups.length - 1] : null;
    
    try {
      if (
        lastGroup && 
        lastGroup.authorClientId === msg.clientId &&
        msg.timestamp - lastGroup.messages[lastGroup.messages.length - 1].timestamp < MESSAGE_GROUPING_THRESHOLD
      ) {
        // Add to existing group
        lastGroup.messages.push({
          content: msg.content,
          timestamp: msg.timestamp,
          id: msgId
        });
      } else {
        // Create new group
        groups.push({
          authorClientId: msg.clientId,
          authorUsername: msg.username,
          authorAvatarId: msg.avatarId || 'avatar1',
          isCurrentUser,
          timestamp: msg.timestamp,
          messages: [{
            content: msg.content,
            timestamp: msg.timestamp,
            id: msgId
          }]
        });
      }
    } catch (error) {
      console.error('Error processing message for grouping', error, msg);
    }
    
    return groups;
  }, []);

  // Check if we're near the bottom of the container
  const isNearBottom = useCallback(() => {
    if (!containerRef.current) return true;
    
    const container = containerRef.current;
    const scrollPosition = container.scrollHeight - container.scrollTop - container.clientHeight;
    return scrollPosition < 100;
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setShowScrollToBottomButton(false);
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current || activeTab !== 'chat') return;
    
    // Update scroll to bottom button visibility
    const nearBottom = isNearBottom();
    setShowScrollToBottomButton(!nearBottom);
  }, [isNearBottom, activeTab]);
  
  // Track when the user sends a message
  const handleSendMessage = useCallback((content: string) => {
    userJustSentMessageRef.current = true;
    onSendMessage(content);
  }, [onSendMessage]);

  // Scroll to bottom when new messages arrive or when user sends a message
  useEffect(() => {
    // If user just sent a message, always scroll to bottom
    if (userJustSentMessageRef.current) {
      setTimeout(() => {
        scrollToBottom();
        userJustSentMessageRef.current = false;
      }, 50);
    } else if (isNearBottom()) {
      // Auto-scroll only if we were already at the bottom
      setTimeout(scrollToBottom, 50);
    }
  }, [messages.length, scrollToBottom]);
  
  // Set up scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Initial scroll to bottom when component mounts
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // Use a short delay to ensure DOM has rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
  }, []);

  return (
    <div className="flex flex-col bg-card overflow-hidden h-full">
      {/* Message container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 pb-0 space-y-3"
      >
        {/* Messages */}
        {groupedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground py-4">
              No messages yet. Start the conversation!
            </div>
          </div>
        ) : (
          // Render message groups
          groupedMessages.map((group, index) => (
            <MessageGroup
              key={`group-${group.authorClientId}-${group.timestamp}-${index}`}
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
        
        {/* Invisible element at the end for scrolling */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <MessageInput 
        onSendMessage={handleSendMessage} 
        roomName={roomName}
      />
      
      {/* Scroll to bottom button */}
      {showScrollToBottomButton && activeTab === 'chat' && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-12 bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-full shadow-lg flex items-center space-x-1 z-10"
          style={{ opacity: 0.9 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span className="text-sm">New messages</span>
        </button>
      )}
    </div>
  );
}

export default memo(ChatBox);