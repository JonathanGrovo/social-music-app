// components/ChatBox.tsx
import { useEffect, useRef, useCallback, useState, memo } from 'react';
import { ChatMessage } from '../types';
import MessageInput from './MessageInput';
import VirtualizedMessageList from './VirtualizedMessageList';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
  clientId: string;
  avatarId: string;
  roomName?: string;
  roomId: string;
  activeTab?: string; // Optional active tab prop
  hasMoreMessages?: boolean;
  loadMoreMessages?: (page: number) => Promise<ChatMessage[]>;
}

function ChatBox({ 
  messages, 
  onSendMessage, 
  username, 
  clientId, 
  avatarId,
  roomName = "the room",
  roomId,
  activeTab,
  hasMoreMessages = false, // Default to false if not provided
  loadMoreMessages = async () => [] // Default empty implementation
}: ChatBoxProps) {
  const userJustSentMessageRef = useRef(false);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [localHasMoreMessages, setLocalHasMoreMessages] = useState(hasMoreMessages);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);

  // Update local state when props change
  useEffect(() => {
    // If we have fewer than 10 messages and the server says there are no more,
    // we still want to check again (default to true) since the server might be wrong
    const shouldCheckForMore = messages.length < 10 ? true : hasMoreMessages;
    setLocalHasMoreMessages(shouldCheckForMore);
  }, [hasMoreMessages, messages.length]);

  // Update local messages when props change
  useEffect(() => {
    setLocalMessages(messages);
    
    // If we have no messages but we know the room exists, assume there might be more
    if (messages.length === 0 && roomId) {
      setLocalHasMoreMessages(true);
    }
  }, [messages, roomId]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const olderMessages = await loadMoreMessages(page + 1);
      console.log("Received older messages:", olderMessages);
      
      if (olderMessages && olderMessages.length > 0) {
        // Update local messages
        setLocalMessages(prevMessages => [...olderMessages, ...prevMessages]);
        setPage(prev => prev + 1);
      } else {
        setLocalHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, isLoadingMore, loadMoreMessages]);
  
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
  
  // Handle when user sends a message - we'll wrap the passed handler
  const handleSendMessage = useCallback((content: string) => {
    userJustSentMessageRef.current = true;
    onSendMessage(content);
  }, [onSendMessage]);

  // Grouping messages for display
  const MESSAGE_GROUPING_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  // Calculate message groups
  const groupedMessages = (() => {
    if (!localMessages || localMessages.length === 0) {
      return [];
    }
    
    return localMessages.reduce((groups: any[], msg) => {
      // Skip invalid message objects
      if (!msg || !msg.clientId || !msg.timestamp) {
        console.warn('Skipping invalid message object', msg);
        return groups;
      }
      
      const isCurrentUser = msg.clientId === clientId;
      // Create a truly unique ID for each message by including both timestamp and random component
      const randomPart = Math.random().toString(36).substring(2, 9);
      const msgId = `msg-${msg.clientId}-${msg.timestamp}-${randomPart}`;
      
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
  })();

  return (
    <div className="flex flex-col bg-card overflow-hidden h-full">
      <VirtualizedMessageList
        messages={groupedMessages}
        formatMessageDate={formatMessageDate}
        formatTimeOnly={formatTimeOnly}
        onScrollChange={() => {}}
        activeTab={activeTab}
        hasMoreMessages={localHasMoreMessages}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
      />
      
      {/* Use the optimized input component */}
      <MessageInput 
        onSendMessage={handleSendMessage} 
        roomName={roomName}
      />
    </div>
  );
}

export default memo(ChatBox);