// utils/emojiShortcodes.ts
import emojiDataByGroup from 'unicode-emoji-json/data-by-group.json';

export type EmojiMapping = {
  [key: string]: string;
};

// Create a type-safe function to build the shortcode mapping
function buildEmojiShortcodes(): EmojiMapping {
  const mapping: EmojiMapping = {};
  
  // Track which emojis we've already added to prevent duplicates
  const addedEmojis = new Set<string>();
  
  // Helper function to deeply traverse the emoji data structure
  function processEmojiObject(obj: any) {
    // Check if this is an emoji object with the required properties
    if (obj && typeof obj === 'object' && obj.emoji && typeof obj.emoji === 'string') {
      const emoji = obj.emoji;
      
      // Add by slug if available (prioritize the version WITH underscores)
      if (obj.slug && typeof obj.slug === 'string') {
        const shortcode = `:${obj.slug}:`;
        mapping[shortcode] = emoji;
        addedEmojis.add(emoji);
        
        // We're removing the no-underscore version to prevent duplicates
        // as requested in the improvements
      }
      
      // Add by name if available and different from slug
      // But only if we haven't already added this emoji
      if (obj.name && typeof obj.name === 'string' && (!obj.slug || obj.name !== obj.slug)) {
        const nameShortcode = `:${obj.name.toLowerCase().replace(/\s+/g, '_')}:`;
        
        // Only add if we haven't added this emoji yet
        if (!addedEmojis.has(emoji)) {
          mapping[nameShortcode] = emoji;
          addedEmojis.add(emoji);
        }
      }
      
      return; // Found an emoji, don't process further
    }
    
    // If it's an object but not an emoji, process its properties recursively
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      Object.values(obj).forEach(value => processEmojiObject(value));
    }
    
    // If it's an array, process each item
    if (Array.isArray(obj)) {
      obj.forEach(item => processEmojiObject(item));
    }
  }
  
  // Start processing the data
  processEmojiObject(emojiDataByGroup);
  
  // Add some common aliases and variations that people often use
  // But only if they don't already exist or produce the same emoji
  const commonAliases: {[key: string]: string} = {
    ":thumbsup:": "👍",
    ":+1:": "👍",
    ":thumbsdown:": "👎",
    ":-1:": "👎",
    ":smile:": "😄",
    ":smiley:": "😃",
    ":laughing:": "😆",
    ":grinning:": "😀",
    ":blush:": "😊",
    ":wink:": "😉",
    ":heart_eyes:": "😍",
    ":kissing_heart:": "😘",
    ":kissing:": "😗",
    ":kissing_smiling_eyes:": "😙",
    ":kissing_closed_eyes:": "😚",
    ":sob:": "😭",
    ":joy:": "😂",
    ":rofl:": "🤣",
    ":relaxed:": "☺️",
    ":stuck_out_tongue:": "😛",
    ":stuck_out_tongue_winking_eye:": "😜",
    ":stuck_out_tongue_closed_eyes:": "😝",
    ":relieved:": "😌",
    ":unamused:": "😒",
    ":disappointed:": "😞",
    ":frowning:": "😦",
    ":cold_sweat:": "😰",
    ":thinking:": "🤔",
    ":face_with_raised_eyebrow:": "🤨",
    ":slight_smile:": "🙂",
    ":slight_frown:": "🙁",
    ":upside_down:": "🙃",
    ":rolling_eyes:": "🙄",
    ":zipper_mouth:": "🤐",
    ":money_mouth:": "🤑",
    ":heart:": "❤️",
    ":rocket:": "🚀",
    ":fire:": "🔥",
    ":tada:": "🎉",
    ":eyes:": "👀",
    ":100:": "💯",
    ":ok:": "👌",
    ":ok_hand:": "👌",
    ":clap:": "👏",
    ":pray:": "🙏",
    ":poop:": "💩",
    ":sweat_smile:": "😅",
    ":sweat:": "😓",
    ":thinking_face:": "🤔",
    ":pleading_face:": "🥺",
    ":face_holding_back_tears:": "🥹",
    ":woozy_face:": "🥴",
    ":flushed:": "😳",
    ":angry:": "😠",
    ":rage:": "😡",
    ":exploding_head:": "🤯",
    ":partying_face:": "🥳",
    ":sunglasses:": "😎",
    ":face_with_monocle:": "🧐",
    ":nerd:": "🤓",
    ":smiling_face:": "😊",
    ":neutral_face:": "😐",
    ":expressionless:": "😑",
    ":no_mouth:": "😶",
    ":face_with_rolling_eyes:": "🙄",
    ":smirk:": "😏",
    ":persevere:": "😣",
    ":disappointed_relieved:": "😥",
    ":open_mouth:": "😮",
    ":hushed:": "😯",
    ":sleepy:": "😪",
    ":tired_face:": "😫",
    ":sleeping:": "😴",
    ":face_with_tongue:": "😛",
    ":winking_face_with_tongue:": "😜",
  };
  
  // Add common aliases, but only if they don't produce duplicates
  Object.entries(commonAliases).forEach(([shortcode, emoji]) => {
    // If this emoji hasn't been added yet, or if this particular shortcode doesn't exist
    // (some emojis might have multiple shortcodes, which is fine)
    if (!addedEmojis.has(emoji) || !mapping[shortcode]) {
      mapping[shortcode] = emoji;
      addedEmojis.add(emoji);
    }
  });
  
  console.log(`Total shortcodes loaded: ${Object.keys(mapping).length}`);
  
  return mapping;
}

// Export the emoji shortcodes mapping
export const emojiShortcodes = buildEmojiShortcodes();

/**
 * Convert emoji shortcodes in text to actual emoji characters
 */
export function convertEmojiShortcodes(text: string): string {
  let result = text;
  
  // Create regex to match all shortcodes
  const shortcodeRegex = /:([\w+-]+):/g;
  
  // Replace all matches
  result = result.replace(shortcodeRegex, (match) => {
    // If the match is in our mapping, replace it
    if (emojiShortcodes[match]) {
      return emojiShortcodes[match];
    }
    // Otherwise, leave it as is
    return match;
  });
  
  return result;
}

/**
 * Get a list of shortcodes that match a partial input
 * @param partial The partial shortcode to match against
 * @returns Array of matching shortcodes
 */
export function getMatchingShortcodes(partial: string): string[] {
  const partialLower = partial.toLowerCase();
  return Object.keys(emojiShortcodes).filter(shortcode => 
    shortcode.toLowerCase().includes(partialLower)
  );
}

// Export the emoji data for reference if needed
export default emojiShortcodes;