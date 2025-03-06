// types/emoji-picker-react.d.ts
declare module 'emoji-picker-react' {
    import React from 'react';
  
    export interface EmojiClickData {
      emoji: string;
      names: string[];
      unified: string;
      activeSkinTone: string;
    }
  
    export interface EmojiPickerProps {
      onEmojiClick: (emojiData: EmojiClickData) => void;
      searchDisabled?: boolean;
      lazyLoadEmojis?: boolean;
      skinTonesDisabled?: boolean;
      width?: number | string;
      height?: number | string;
      theme?: 'light' | 'dark' | 'auto';
      previewConfig?: {
        defaultCaption: string;
        defaultEmoji: string;
      };
      categories?: string[];
      searchPlaceholder?: string;
      emojiStyle?: 'native' | 'apple' | 'facebook' | 'google' | 'twitter';
    }
  
    const EmojiPicker: React.FC<EmojiPickerProps>;
    
    export default EmojiPicker;
  }