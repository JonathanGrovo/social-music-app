// components/ChatBox.tsx
import { useEffect, useRef, useCallback, useState, memo, useMemo } from 'react';
import { ChatMessage, MessageGroupData, GroupedMessage } from '../types'; // Import the new types
import MessageInput from './MessageInput';
import MessageGroup from './MessageGroup';
import { debounce } from 'lodash';

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
  
  // Pre-format timestamps for common use cases
  const formattedTimestamps = useMemo(() => {
    const cache = new Map<number, { time: string, date: string }>();
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    messages.forEach(msg => {
      if (!cache.has(msg.timestamp)) {
        const date = new Date(msg.timestamp);
        const dateString = date.toDateString();
        
        let formattedDate;
        if (dateString === today) {
          formattedDate = 'Today';
        } else if (dateString === yesterday) {
          formattedDate = 'Yesterday';
        } else {
          formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
        }
        
        const formattedTime = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        cache.set(msg.timestamp, {
          time: formattedTime,
          date: `${formattedDate} at ${formattedTime}`
        });
      }
    });
    
    return cache;
  }, [messages]);

  // Format time only (HH:MM AM/PM)
  const formatTimeOnly = useCallback((timestamp: number): string => {
    if (formattedTimestamps.has(timestamp)) {
      return formattedTimestamps.get(timestamp)!.time;
    }
    
    // Fallback for any timestamps not in the cache
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }, [formattedTimestamps]);
  
  // Format date for message groups
  const formatMessageDate = useCallback((timestamp: number): string => {
    if (formattedTimestamps.has(timestamp)) {
      return formattedTimestamps.get(timestamp)!.date;
    }
    
    // Fallback for any timestamps not in the cache
    return formatTimeOnly(timestamp);
  }, [formattedTimestamps, formatTimeOnly]);
  
  // Grouping messages for display
  const groupedMessages = useMemo(() => {
    const groups: MessageGroupData[] = [];
    
    // Sort messages by timestamp just to be safe
    const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    
    // Process each message in chronological order
    sortedMessages.forEach(msg => {
      // Skip invalid message objects
      if (!msg || !msg.clientId || !msg.timestamp) {
        console.warn('Skipping invalid message object', msg);
        return;
      }
      
      const isCurrentUser = msg.clientId === clientId;
      
      // Create a unique ID for each message
      const msgId = `msg-${msg.clientId}-${msg.timestamp}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Get the last group
      const lastGroup = groups.length > 0 ? groups[groups.length - 1] : null;
      
      // Check if we can add to the last group
      if (
        lastGroup && 
        lastGroup.authorClientId === msg.clientId &&
        msg.timestamp - lastGroup.timestamp < MESSAGE_GROUPING_THRESHOLD
      ) {
        // Add to existing group
        lastGroup.messages.push({
          content: msg.content,
          timestamp: msg.timestamp,
          id: msgId
        });
        
        // Update the group's timestamp to the latest message
        lastGroup.timestamp = msg.timestamp;
      } else {
        // Create new group
        const newGroup: MessageGroupData = {
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
        };
        
        groups.push(newGroup);
      }
    });
    
    return groups;
  }, [messages, clientId, MESSAGE_GROUPING_THRESHOLD]);

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
  const handleScroll = useCallback(
    debounce(() => {
      if (!containerRef.current || activeTab !== 'chat') return;
      
      // Update scroll to bottom button visibility
      const nearBottom = isNearBottom();
      setShowScrollToBottomButton(!nearBottom);
    }, 50), // 50ms debounce
    [isNearBottom, activeTab]
  );
  
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
      handleScroll.cancel(); // Cancel any pending debounced calls
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
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 pb-2"
      >
        {/* Remove the wrapper div key that might be causing spacing issues */}
        {groupedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground py-4">
              No messages yet. Start the conversation!
            </div>
          </div>
        ) : (
          <div className="space-y-6"> {/* Restore space-y-6 for proper group spacing */}
            {groupedMessages.map((group: MessageGroupData) => (
              <MessageGroup
                key={`group-${group.authorClientId}-${group.timestamp}-${group.messages[0].id}`}
                authorClientId={group.authorClientId}
                authorUsername={group.authorUsername}
                authorAvatarId={group.authorAvatarId}
                isCurrentUser={group.isCurrentUser}
                timestamp={group.timestamp}
                messages={group.messages}
                formatMessageDate={formatMessageDate}
                formatTimeOnly={formatTimeOnly}
              />
            ))}
          </div>
        )}
        
        {/* Invisible element at the end for scrolling */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input with minimal margin */}
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