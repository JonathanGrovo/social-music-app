'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChatMessage } from '../types';
import { formatMessageTime } from '../utils/formatMessageTime';
import { getAvatarPath } from '../utils/avatar';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
  clientId: string;
  users: Array<{ userId: string; clientId: string; avatarId: string }>;
}

export default function ChatBox({ 
  messages, 
  onSendMessage, 
  username, 
  clientId, 
  users 
}: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);

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

  // Helper to get avatar for a message
  const getMessageAvatar = (message: ChatMessage) => {
    // Find the user that sent this message
    const user = users.find(u => u.clientId === message.clientId);
    
    // Return the user's avatar if found, or use message avatar, or fallback to first avatar
    return user?.avatarId || message.avatarId || 'avatar1';
  };

  return (
    <div className="flex flex-col h-[400px] bg-card rounded-lg shadow-md overflow-hidden border border-border">
      <div className="bg-muted py-3 px-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Chat</h2>
      </div>
      
      <div 
        ref={messagesContainerRef}
        className="overflow-y-auto flex-1 p-4 space-y-4"
        style={{ overflowAnchor: 'auto' }}
      >
        {messages.map((msg) => (
          <div
            key={`${msg.clientId}-${msg.timestamp}`}
            className="flex items-start"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
              <Image 
                src={getAvatarPath(getMessageAvatar(msg))}
                alt={`${msg.userId}'s avatar`}
                width={32}
                height={32}
                className="object-cover w-full h-full"
              />
            </div>
            
            {/* Message content */}
            <div className="flex-1 min-w-0">
              <div 
                className={`
                  px-3 py-2 rounded-lg 
                  ${msg.clientId === clientId 
                    ? 'bg-message-own text-message-own-text' 
                    : 'bg-message-other text-message-other-text'}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-xs">
                    {msg.userId}                    
                    {msg.clientId === clientId && <span className="ml-1 text-xs opacity-50">(You)</span>}
                  </div>
                  <div className="text-xs opacity-60 ml-2">
                    {formatMessageTime(msg.timestamp)}
                  </div>
                </div>
                <div className="break-words">{msg.content}</div>
              </div>
            </div>
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