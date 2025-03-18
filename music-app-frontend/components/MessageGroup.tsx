// components/MessageContent.tsx
import { memo } from 'react';
import { convertEmojiShortcodes } from '../utils/emojiShortcodes';
import twemoji from 'twemoji';

// URL auto-detection function
const autoLinkUrls = (text: string): string => {
  // If the text already contains markdown links, don't process it further
  if (text.match(/\[.+?\]\(.+?\)/)) {
    return text;
  }
  
  // Only convert plain URLs that aren't already part of a markdown link
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    // Use a format that works with our dangerouslySetInnerHTML approach
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${url}</a>`;
  });
};

// Emoji detection helpers
const isEmoji = (str: string): boolean => {
  // This regex matches most emoji patterns, including ZWJ sequences, skin tones, etc.
  const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
  return emojiRegex.test(str.trim());
};

const isEmojiOnly = (text: string): boolean => {
  // First, trim whitespace and check if the string is empty
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Try to match the entire string against our emoji regex
  // This regex allows emojis and whitespace only
  const emojiRegex = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s)+$/u;
  return emojiRegex.test(trimmed);
};

const splitEmojis = (text: string): string[] => {
  // Split a string of emojis into an array of individual emoji characters
  // This uses Array.from() to properly handle emoji that use multiple code points
  return Array.from(text.trim());
};

const countEmojis = (text: string): number => {
  // Count how many emoji are in the text
  return splitEmojis(text).filter(char => isEmoji(char)).length;
};

interface MessageContentProps {
  content: string;
}

// Enhanced MessageContent component with optimized Twemoji rendering
const MessageContent = memo(({ content }: MessageContentProps) => {
  // First convert any emoji shortcodes to actual emojis
  const contentWithEmojis = convertEmojiShortcodes(content);
  
  // Then check if the result is emoji-only
  const isOnlyEmojis = isEmojiOnly(contentWithEmojis);
  const emojiCount = isOnlyEmojis ? countEmojis(contentWithEmojis) : 0;
  
  // Process content through auto-linking only if it's not emoji-only
  const processedContent = isOnlyEmojis 
    ? contentWithEmojis 
    : autoLinkUrls(contentWithEmojis);
  
  // For emoji-only messages, use Twemoji's parser but with different CSS classes for sizing
  if (isOnlyEmojis) {
    const htmlContent = twemoji.parse(processedContent, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/'
    });
    
    // Add the appropriate size class
    if (emojiCount <= 3) {
      return (
        <div className="markdown-content">
          <div className="large-emoji" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
      );
    } else if (emojiCount <= 7) {
      return (
        <div className="markdown-content">
          <div className="medium-emoji" dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
      );
    }
  }
  
  // For regular messages or many emojis, use the same Twemoji parsing
  const htmlContent = twemoji.parse(processedContent, {
    folder: 'svg',
    ext: '.svg',
    base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/'
  });
  
  return (
    <div className="markdown-content">
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
});

// Add display name for debugging
MessageContent.displayName = 'MessageContent';

// Export as named export to avoid "multiple default exports" error
export { MessageContent };

// Types to match those in ChatBox
interface Message {
  content: string;
  timestamp: number;
  id: string;
}

interface MessageGroupProps {
  authorClientId: string;
  authorUsername: string;
  authorAvatarId: string;
  isCurrentUser: boolean;
  timestamp: number;
  messages: Message[];
  formatMessageDate: (timestamp: number) => string;
  formatTimeOnly: (timestamp: number) => string;
}

// The main MessageGroup component
function MessageGroup({
  authorClientId,
  authorUsername,
  authorAvatarId,
  isCurrentUser,
  timestamp,
  messages,
  formatMessageDate,
  formatTimeOnly
}: MessageGroupProps) {
  
  return (
    <div className="flex flex-col space-y-0.5">
      {/* First message with author info */}
      <div className="flex items-start relative group">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0 mt-0.5 relative z-10">
          <img 
            src={`/avatars/${authorAvatarId}.png`} 
            alt="Avatar" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* The full-width background that appears on hover */}
        <div 
          className="absolute left-0 right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 bg-black bg-opacity-5 dark:bg-opacity-7 z-0" 
          style={{ 
            transition: 'opacity 0s',
            marginLeft: '-16px',
            marginRight: '-16px',
            marginTop: '-8px',
            width: 'calc(100% + 32px)',
            height: 'calc(100% + 8px)'
          }}
        ></div>

        {/* Message content container */}
        <div className="flex-1 min-w-0 relative z-10 max-w-[calc(100%-40px)]">
          {/* Author name and timestamp */}
          <div className="flex items-baseline mb-1 flex-wrap">
            <span className="font-semibold text-foreground mr-2 break-words max-w-[85%] overflow-wrap-anywhere">
              {authorUsername}
              {isCurrentUser && <span className="ml-1 text-xs opacity-50">(You)</span>}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatMessageDate(timestamp)}
            </span>
          </div>
          
          {/* First message content with markdown */}
          <div className="break-words w-full mb-1 pr-8">
            <MessageContent content={messages[0].content} />
          </div>
        </div>
      </div>
      
      {/* Subsequent messages in the group */}
      {messages.slice(1).map((msg) => (
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
            <MessageContent content={msg.content} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Export with memo for additional optimization
export default memo(MessageGroup);