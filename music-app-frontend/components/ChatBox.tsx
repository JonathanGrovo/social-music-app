// components/ChatBox.tsx
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { memo } from 'react';
import { ChatMessage } from '../types';
import { formatMessageTime } from '../utils/formatMessageTime';
import debounce from 'lodash/debounce';
import MessageInput from './MessageInput'; // Separate component for input
import MessageGroup from './MessageGroup'; // Component for message groups
import VirtualizedMessageList from './VirtualizedMessageList'; // For efficient message rendering
import useMessageRecovery from '../hooks/useMessageRecovery'; // Message recovery hook

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
  clientId: string;
  avatarId: string;
  roomName?: string;
  roomId: string; // Added roomId for message recovery
}

// Time threshold for grouping messages (in milliseconds)
const MESSAGE_GROUPING_THRESHOLD = 5 * 60 * 1000; // 5 minutes

// The main ChatBox component with optimizations
function ChatBox({ 
  messages, 
  onSendMessage, 
  username, 
  clientId, 
  avatarId,
  roomName = "the room", // Default room name if not provided
  roomId
}: ChatBoxProps) {
  // References for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);
  // Store message history to prevent disappearing messages
  const messageHistoryRef = useRef<ChatMessage[]>(messages);
  
  // Use our message recovery hook
  const { getMessages } = useMessageRecovery(messages, roomId);

  // Update message history when messages prop changes
  useEffect(() => {
    if (messages && messages.length > 0) {
      messageHistoryRef.current = messages;
    }
  }, [messages]);

  // Triple-layer protection:
  // 1. Use incoming messages if they exist
  // 2. Fall back to messageHistoryRef if incoming messages are empty
  // 3. Fall back to localStorage backup (via getMessages) as last resort
  const displayMessages = messages.length > 0 
    ? messages 
    : (messageHistoryRef.current.length > 0 
       ? messageHistoryRef.current 
       : getMessages());
  
  // Debug logging
  useEffect(() => {
    const recoveredCount = getMessages().length;
    console.log(`ChatBox rendering, messages: ${messages.length}, displayMessages: ${displayMessages.length}, recoveredMessages: ${recoveredCount}`);
    
    // Log a warning if this might be a case of disappearing messages
    if (messages.length === 0 && (messageHistoryRef.current.length > 0 || recoveredCount > 0)) {
      console.warn("Messages array is empty but history exists - using preserved messages");
    }
  }, [messages.length, displayMessages.length, getMessages]);

  // Scroll to bottom helper function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);
  
  // OPTIMIZATION 1: Memoize the message grouping logic
  // This prevents recalculating groups on every render
  const groupedMessages = useMemo(() => {
    // Return early if there are no messages to avoid errors
    if (!displayMessages || displayMessages.length === 0) {
      return [];
    }
    
    // Use displayMessages (which includes our safety backup) instead of messages
    return displayMessages.reduce((groups: any[], msg) => {
      // Skip invalid message objects
      if (!msg || !msg.clientId || !msg.timestamp) {
        console.warn('Skipping invalid message object', msg);
        return groups;
      }
      
      const isCurrentUser = msg.clientId === clientId;
      const msgId = `${msg.clientId}-${msg.timestamp}`;
      
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
        // Continue with other messages
      }
      
      return groups;
    }, []);
  }, [displayMessages, clientId]); // Changed dependency to displayMessages

  // Handle message send
  const handleSend = useCallback((content: string) => {
    if (content.trim()) {
      onSendMessage(content);
      
      // Scroll to bottom after sending
      setTimeout(scrollToBottom, 0);
    }
  }, [onSendMessage, scrollToBottom]);

  // Auto-scroll is now handled by VirtualizedMessageList
  // We just need to update our state when the list tells us to
  useEffect(() => {
    prevMessagesLengthRef.current = displayMessages.length; // Use displayMessages instead of messages
  }, [displayMessages.length]); // Changed dependency

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

  return (
    <div className="flex flex-col bg-card overflow-hidden">
      {/* Virtualized message list for better performance */}
      <VirtualizedMessageList
        messages={groupedMessages}
        formatMessageDate={formatMessageDate}
        formatTimeOnly={formatTimeOnly}
        onScrollChange={setAutoScroll}
      />
      
      {/* Use the optimized input component */}
      <MessageInput 
        onSendMessage={handleSend} 
        roomName={roomName}
      />
    </div>
  );
}

// Export with memo for additional optimization
export default memo(ChatBox);