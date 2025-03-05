// components/ChatBox.tsx with performance optimizations

'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'; // Add useMemo and useCallback
import { ChatMessage } from '../types';
import { formatMessageTime } from '../utils/formatMessageTime';
import ReactMarkdown from 'react-markdown';
import debounce from 'lodash/debounce'; // Add lodash debounce (install if needed)

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  username: string;
  clientId: string;
  avatarId: string;
  roomName?: string;
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

export default function ChatBox({ 
  messages, 
  onSendMessage, 
  username, 
  clientId, 
  avatarId,
  roomName = "the room" // Default room name if not provided
}: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevMessagesLengthRef = useRef(messages.length);
  
  // OPTIMIZATION 1: Memoize the message grouping logic
  // This prevents recalculating groups on every render
  const groupedMessages = useMemo(() => {
    console.log("Recalculating message groups");
    return messages.reduce((groups: MessageGroup[], msg) => {
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
  }, [messages, clientId]); // Only recalculate when messages or clientId changes

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, onSendMessage]);

  // Handle key presses with Shift+Enter support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: add a new line
        return; // Let the default behavior happen
      } else {
        // Just Enter: send the message
        e.preventDefault();
        handleSend();
      }
    }
  }, [handleSend]);

  // OPTIMIZATION 2: Debounce the textarea height adjustment
  // Create a debounced function that will adjust height less frequently
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedAdjustHeight = useCallback(
    debounce(() => {
      if (textareaRef.current) {
        // Reset height temporarily to get the correct scrollHeight
        textareaRef.current.style.height = 'auto';
        
        // Set to scrollHeight to match content
        const scrollHeight = textareaRef.current.scrollHeight;
        
        // Apply max height if needed
        if (scrollHeight <= 200) { // Max height before scrolling
          textareaRef.current.style.height = scrollHeight + 'px';
        } else {
          textareaRef.current.style.height = '200px';
        }
      }
    }, 10), // 10ms delay is barely noticeable but reduces calculations
    []
  );

  // Update textarea height when input changes
  useEffect(() => {
    debouncedAdjustHeight();
    // Clean up the debounced function when component unmounts
    return () => {
      debouncedAdjustHeight.cancel();
    };
  }, [message, debouncedAdjustHeight]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current && messages.length > prevMessagesLengthRef.current) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages, autoScroll]);
  
  // Detect when user manually scrolls up to disable auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Debounce scroll handler to improve performance
    const handleScroll = debounce(() => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (autoScroll !== isNearBottom) {
        setAutoScroll(isNearBottom);
      }
    }, 100);
    
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      handleScroll.cancel();
    };
  }, [autoScroll]);

  // Add custom scrollbar styling
  useEffect(() => {
    // Add custom scrollbar styling specifically for this component
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Target scrollbar in ChatBox messages container */
      .chat-messages-container::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      .chat-messages-container::-webkit-scrollbar-track {
        background: transparent;
      }
      .chat-messages-container::-webkit-scrollbar-thumb {
        background: #4a4d53;
        border-radius: 4px;
      }
      .chat-messages-container::-webkit-scrollbar-thumb:hover {
        background: #5d6067;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Cleanup function
    return () => {
      if (styleElement.parentNode) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

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
  
  // OPTIMIZATION 3: Memoize markdown rendering
  const renderWithMarkdown = useCallback((content: string) => {
    return (
      <div className="markdown-content">
        <ReactMarkdown>
          {content}
        </ReactMarkdown>
      </div>
    );
  }, []);

  return (
    <div className="flex flex-col bg-card rounded-lg shadow-md overflow-hidden border border-border">
      <div className="bg-muted py-3 px-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Chat</h2>
      </div>
      
      <div 
        ref={messagesContainerRef}
        className="chat-messages-container overflow-y-auto flex-1 p-4 space-y-6"
        style={{ 
          overflowAnchor: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#4a4d53 transparent'
        }}
      >
        {groupedMessages.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            No messages yet. Start the conversation!
          </div>
        )}
        
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

              {/* Message content container - reduced max width for earlier wrapping */}
              <div className="flex-1 min-w-0 relative z-10 max-w-[calc(100%-40px)]">
                {/* Author name and timestamp */}
                <div className="flex items-baseline mb-1 flex-wrap">
                  <span className="font-semibold text-foreground mr-2 break-words max-w-[85%] overflow-wrap-anywhere">
                    {group.authorUsername}
                    {group.isCurrentUser && <span className="ml-1 text-xs opacity-50">(You)</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageDate(group.timestamp)}
                  </span>
                </div>
                
                {/* First message content with markdown */}
                <div className="break-words w-full mb-1 pr-8">
                  {renderWithMarkdown(group.messages[0].content)}
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
                
                {/* Message content with markdown */}
                <div className="break-words w-full min-h-[20px] py-1 pl-[52px] pr-8">
                  {renderWithMarkdown(msg.content)}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Discord-style chat input with textarea for multiline support */}
      <div className="px-4 pb-4">
        <div className="flex items-start bg-[#383a40] dark:bg-[#40444b] rounded-lg overflow-hidden">
          {/* Message textarea with auto-resize */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3 py-2.5 bg-transparent text-foreground border-none focus:outline-none placeholder:text-muted-foreground resize-none min-h-[40px] max-h-[200px] overflow-y-auto"
            placeholder={`Message ${roomName?.length > 15 ? roomName.substring(0, 15) + '...' : roomName}`}
            rows={1}
            style={{ height: 'auto' }}
          />
          
          {/* Send button - updated to match Save button purple */}
          <button
            type="button" 
            onClick={handleSend}
            disabled={!message.trim()}
            className={`p-2 mx-2 rounded flex-shrink-0 mt-1 ${
              message.trim() 
                ? 'text-[#5865f2] hover:text-[#4752c4] transition-colors duration-200' 
                : 'text-[#4f5660] cursor-not-allowed'
            }`}
            style={{
              cursor: message.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}