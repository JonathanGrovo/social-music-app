'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
  clientId: string;
  avatarId: string;
}

export default function ChatBox({ messages, onSendMessage, username, clientId, avatarId }: ChatBoxProps) {
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

  // Log messages for debugging
  useEffect(() => {
    console.log('ChatBox messages:', messages);
  }, [messages]);

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

  // Format timestamp to more readable form
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
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
            className="flex flex-col items-start"
          >
            <div className="flex items-start max-w-full">
              {/* Avatar image */}
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                <img 
                  src={`/avatars/${msg.avatarId || 'avatar1'}.png`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              
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
                    <div className="font-semibold text-xs truncate mr-2">
                      {msg.username}
                      {msg.clientId === clientId && <span className="ml-1 text-xs opacity-50">(You)</span>}
                    </div>
                    <span className="text-xs opacity-70">{formatTimestamp(msg.timestamp)}</span>
                  </div>
                  <div className="break-words">{msg.content}</div>
                </div>
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