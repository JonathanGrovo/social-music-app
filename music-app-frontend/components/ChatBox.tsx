// components/ChatBox.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { formatMessageTime } from '../utils/formatMessageTime';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
  clientId: string;
  avatarId: string;
}

// Time threshold for grouping messages (in milliseconds)
const MESSAGE_GROUPING_THRESHOLD = 5 * 60 * 1000; // 5 minutes

// Interface for grouped messages
interface MessageGroup {
  authorClientId: string;
  authorUsername: string;
  authorAvatarId: string;
  isCurrentUser: boolean;
  timestamp: number; // timestamp of first message in group
  messages: {
    content: string;
    timestamp: number;
    id: string; // Using clientId-timestamp as unique ID
  }[];
}

export default function ChatBox({ messages, onSendMessage, username, clientId, avatarId }: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);
  
  // Group messages by author and time
  const groupedMessages = messages.reduce((groups: MessageGroup[], msg) => {
    const isCurrentUser = msg.clientId === clientId;
    const msgId = `${msg.clientId}-${msg.timestamp}`;
    
    // Try to add to the last group if from same author and within time threshold
    const lastGroup = groups.length > 0 ? groups[groups.length - 1] : null;
    
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
    
    return groups;
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current && messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages, autoScroll]);
  
  // Detect when user manually scrolls up to disable auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (autoScroll !== isNearBottom) {
        setAutoScroll(isNearBottom);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [autoScroll]);

  // Format time only (HH:MM AM/PM)
  const formatTimeOnly = (timestamp: number): string => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  // Format date for message groups
  const formatMessageDate = (timestamp: number): string => {
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
  };

  return (
    <div className="flex flex-col h-[400px] bg-card rounded-lg shadow-md overflow-hidden border border-border">
      <div className="bg-muted py-3 px-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Chat</h2>
      </div>
      
      <div 
        ref={messagesContainerRef}
        className="overflow-y-auto flex-1 p-4 space-y-6"
        style={{ overflowAnchor: 'auto' }}
      >
        {groupedMessages.map((group) => (
          <div
            key={`group-${group.authorClientId}-${group.timestamp}`}
            className="flex flex-col space-y-0.5"
          >
            {/* First message with author info */}
            <div className="flex items-start relative group">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 mt-0.5 relative z-10">
                <img 
                  src={`/avatars/${group.authorAvatarId}.png`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* The full-width background that appears on hover - extends behind avatar to edges of chatbox */}
              <div 
                className="absolute left-0 right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 bg-black bg-opacity-5 dark:bg-opacity-7 z-0" 
                style={{ 
                  transition: 'opacity 0s',
                  marginLeft: '-16px', /* Negative margin to extend to left edge (matches p-4 of container) */
                  marginRight: '-16px', /* Negative margin to extend to right edge */
                  marginTop: '-8px', /* Negative margin to extend higher */
                  width: 'calc(100% + 32px)', /* Full width plus padding on both sides */
                  height: 'calc(100% + 8px)' /* Add extra height to match negative top margin */
                }}
              ></div>

              {/* Message content container */}
              <div className="flex-1 min-w-0 relative z-10">
                {/* Author name and timestamp */}
                <div className="flex items-baseline mb-1">
                  <span className="font-semibold text-foreground mr-2">
                    {group.authorUsername}
                    {group.isCurrentUser && <span className="ml-1 text-xs opacity-50">(You)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageDate(group.timestamp)}
                  </span>
                </div>
                
                {/* First message content */}
                <div className="break-words w-full mb-1">
                  {group.messages[0].content}
                </div>
              </div>
            </div>
            
            {/* Subsequent messages in the group */}
            {group.messages.slice(1).map((msg, idx) => (
              <div 
                key={msg.id} 
                className="relative group/msg mx-[-16px] px-[16px] hover:bg-black hover:bg-opacity-5 dark:hover:bg-opacity-7"
                style={{ transition: 'background-color 0s' }}
              >
                {/* Timestamp that appears on hover */}
                <div 
                  className="opacity-0 group-hover/msg:opacity-100 text-xs text-muted-foreground absolute left-[7px] top-1/2 -translate-y-1/2 w-[54px] text-center"
                  style={{ transition: 'opacity 0s' }}
                >
                  {formatTimeOnly(msg.timestamp)}
                </div>
                
                {/* Message content */}
                <div className="break-words w-full min-h-[20px] py-1 pl-[52px] pr-4">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t border-border p-2 bg-muted">
        <div className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border rounded-l px-3 py-2 bg-input text-foreground border-border focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Type a message..."
          />
          <button
            type="button" 
            onClick={handleSend}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-r"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}