// components/ChatBox.tsx
import { useEffect, useRef, useCallback, useState } from 'react';
import { memo } from 'react';
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
}

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
  // Add a ref to track if a message was just sent by this user
  const userJustSentMessageRef = useRef(false);
  
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
    if (!messages || messages.length === 0) {
      return [];
    }
    
    return messages.reduce((groups: any[], msg) => {
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
      }
      
      return groups;
    }, []);
  })();

  // Handle scroll position changes
  const handleScrollChange = useCallback((isNearBottom: boolean) => {
    // Could be used in the future if needed
  }, []);

  return (
    <div className="flex flex-col bg-card overflow-hidden h-full">
      <VirtualizedMessageList
        messages={groupedMessages}
        formatMessageDate={formatMessageDate}
        formatTimeOnly={formatTimeOnly}
        onScrollChange={() => {}} // We don't need this for now
        activeTab={activeTab}    // Make sure to pass this prop
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