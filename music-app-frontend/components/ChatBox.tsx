'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
}

export default function ChatBox({ messages, onSendMessage, username }: ChatBoxProps) {
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
    // Only auto-scroll if messages were added (not on username changes)
    if (autoScroll && messagesEndRef.current && messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    
    // Update length ref
    prevMessagesLengthRef.current = messages.length;
  }, [messages, autoScroll]);
  
  // Detect when user manually scrolls up to disable auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // If we're more than 100px from the bottom, disable auto-scroll
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (autoScroll !== isNearBottom) {
        setAutoScroll(isNearBottom);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [autoScroll]);

  return (
    <div className="flex flex-col h-[400px] bg-card rounded-lg shadow-md overflow-hidden border border-border">
      <div className="bg-muted py-3 px-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Chat</h2>
      </div>
      
      <div 
        ref={messagesContainerRef}
        className="overflow-y-auto flex-1 p-4"
        style={{ overflowAnchor: 'auto' }}
      >
        {messages.map((msg, index) => (
          <div
            key={`${msg.userId}-${index}-${msg.timestamp}`}
            className={`mb-2 ${msg.userId === username ? 'text-right' : ''}`}
          >
            <div
              className={`inline-block px-3 py-2 rounded-lg max-w-[80%] ${
                msg.userId === username
                  ? 'bg-message-own text-message-own-text'
                  : 'bg-message-other text-message-other-text'
              }`}
            >
              <div className="font-semibold text-xs mb-1">
                {msg.userId === username ? 'You' : msg.userId}
              </div>
              <div>{msg.content}</div>
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