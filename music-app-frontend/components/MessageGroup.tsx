// In components/MessageGroup.tsx

import { memo, createElement } from 'react';
import { convertEmojiShortcodes } from '../utils/emojiShortcodes';
import twemoji from 'twemoji';
import { TWEMOJI_BASE_URL } from '../utils/emojiConstants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Define a common interface for markdown component props to avoid repetition
interface MarkdownComponentProps {
  node?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

// Enhanced emoji detection - using a more advanced approach
const emojiPattern = /\p{Emoji}/u;

/**
 * Check if text contains only emojis (plus optional whitespace)
 */
const isEmojiOnly = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Replace any variation selectors and ZWJ sequences to simplify the check
  const simplified = trimmed
    .replace(/\uFE0F/g, '') // Variation selector
    .replace(/\u200D/g, ''); // Zero Width Joiner
  
  // Now check if there's anything other than emoji and whitespace
  const nonEmojiMatch = simplified.match(/[^\p{Emoji}\s]/gu);
  
  // If we found non-emoji characters, it's not emoji-only
  if (nonEmojiMatch) {
    return false;
  }
  
  // Get emoji count to make sure we have at least one
  const emojiCount = countEmojis(simplified);
  
  // It's emoji-only if we have at least one emoji and nothing else
  return emojiCount > 0;
};

/**
 * Count distinct emojis in a string
 */
const countEmojis = (text: string): number => {
  if (!text) return 0;
  
  // Handle variation selectors and ZWJ sequences
  const simplified = text
    .replace(/\uFE0F/g, '') // Variation selector
    .replace(/\u200D/g, ''); // Zero Width Joiner
  
  // Simply count all emoji characters
  const matches = simplified.match(/\p{Emoji}/gu);
  return matches ? matches.length : 0;
};

// URL auto-detection function
const autoLinkUrls = (text: string): string => {
  // If the text already contains markdown links, don't process it further
  if (text.match(/\[.+?\]\(.+?\)/)) {
    return text;
  }
  
  // Only convert plain URLs that aren't already part of a markdown link
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `[${url}](${url})`;
  });
};

// Custom component to render text with Twemoji
const TwemojiText = ({ children }: { children: React.ReactNode }) => {
  if (typeof children !== 'string') {
    return <>{children}</>;
  }

  return (
    <span 
      dangerouslySetInnerHTML={{
        __html: twemoji.parse(children, {
          folder: 'svg',
          ext: '.svg',
          base: TWEMOJI_BASE_URL,
        }),
      }}
    />
  );
};

// Helper function to create a component that renders its children with Twemoji
const createTwemojiComponent = (Component: React.ElementType) => {
  return ({ children, ...props }: MarkdownComponentProps) => (
    <Component {...props}>
      <TwemojiText>{children}</TwemojiText>
    </Component>
  );
};

interface MessageContentProps {
  content: string;
}

// Enhanced MessageContent component with markdown and emoji support
const MessageContent = memo(({ content }: MessageContentProps) => {
  // First convert any emoji shortcodes to actual emojis
  const contentWithEmojis = convertEmojiShortcodes(content);
  
  // Check if this is an emoji-only message
  const isOnlyEmojis = isEmojiOnly(contentWithEmojis);
  const emojiCount = isOnlyEmojis ? countEmojis(contentWithEmojis) : 0;
  
  // For emoji-only messages, use different size classes and just Twemoji (no markdown)
  if (isOnlyEmojis) {
    if (emojiCount <= 3) {
      return (
        <div className="markdown-content">
          <div className="large-emoji" 
               dangerouslySetInnerHTML={{ __html: twemoji.parse(contentWithEmojis, {
                 folder: 'svg',
                 ext: '.svg',
                 base: TWEMOJI_BASE_URL
               }) }} />
        </div>
      );
    } else if (emojiCount <= 7) {
      return (
        <div className="markdown-content">
          <div className="medium-emoji" 
               dangerouslySetInnerHTML={{ __html: twemoji.parse(contentWithEmojis, {
                 folder: 'svg',
                 ext: '.svg',
                 base: TWEMOJI_BASE_URL
               }) }} />
        </div>
      );
    }
  }
  
  // For regular messages, convert URLs to markdown links if they're not already
  const contentWithLinks = autoLinkUrls(contentWithEmojis);
  
  // Then use ReactMarkdown for rendering
  return (
    <div className="markdown-content">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom link rendering with proper types
          a: ({ node, href, children, ...props }: MarkdownComponentProps & { href?: string }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:underline"
              {...props}
            >
              <TwemojiText>{children}</TwemojiText>
            </a>
          ),
          
          // Custom paragraph rendering with Twemoji support
          p: createTwemojiComponent('p'),
          
          // Custom code rendering with proper TypeScript types
          code: ({ node, inline, className, children, ...props }: MarkdownComponentProps & { 
            inline?: boolean;
            className?: string;
          }) => {
            // For inline code, explicitly return just the code element
            if (inline === true) {
              return (
                <code className="bg-[#2f3136] px-1 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            
            // For code blocks (not inline), return the pre+code structure
            return (
              <pre className="bg-[#2f3136] p-2 rounded my-2 overflow-x-auto">
                <code className="font-mono text-sm" {...props}>{children}</code>
              </pre>
            );
          },
          
          // Custom blockquote rendering
          blockquote: ({ node, children, ...props }: MarkdownComponentProps) => (
            <blockquote 
              className="border-l-4 border-[#4f545c] pl-2 py-0.5 my-1 text-muted-foreground italic"
              {...props}
            >
              <TwemojiText>{children}</TwemojiText>
            </blockquote>
          ),
          
          // List rendering
          ul: ({ node, children, ...props }: MarkdownComponentProps) => (
            <ul className="list-disc pl-6 my-2" {...props}>
              {children}
            </ul>
          ),
          
          ol: ({ node, children, ...props }: MarkdownComponentProps) => (
            <ol className="list-decimal pl-6 my-2" {...props}>
              {children}
            </ol>
          ),
          
          // Heading rendering
          h1: createTwemojiComponent((props) => <h1 className="text-xl font-bold my-2" {...props} />),
          h2: createTwemojiComponent((props) => <h2 className="text-lg font-bold my-2" {...props} />),
          h3: createTwemojiComponent((props) => <h3 className="text-md font-bold my-2" {...props} />),
          h4: createTwemojiComponent((props) => <h4 className="text-base font-bold my-1" {...props} />),
          h5: createTwemojiComponent((props) => <h5 className="text-base font-bold my-1" {...props} />),
          h6: createTwemojiComponent((props) => <h6 className="text-base font-bold my-1" {...props} />),
          
          // Formatting elements
          strong: createTwemojiComponent('strong'),
          em: createTwemojiComponent('em'),
          del: createTwemojiComponent('del'),
        }}
      >
        {contentWithLinks}
      </ReactMarkdown>
    </div>
  );
});

// Add display name for debugging
MessageContent.displayName = 'MessageContent';

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
// Export MessageContent for use elsewhere
export { MessageContent };