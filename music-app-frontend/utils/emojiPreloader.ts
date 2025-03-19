// utils/emojiPreloader.ts
import twemoji from 'twemoji';

// Updated list of emojis to preload based on your preferences
const TOP_EMOJIS = [
  '😂', '❤️', '🤣', '👍', '😭', '🙏', '😘', '🥰', '😍', '😊', 
  '🎉', '😁', '💕', '🥺', '😅', '🔥', '☺️', '🤦', '♥️', '🤷',
  '🙄', '😆', '🤗', '😉', '🎂', '🤔', '👏', '🙂', '😳', '🥳', 
  '😎', '👌', '💜', '😔', '💪', '✨', '💖', '👀', '😋', '😏'
];

// Secondary tier of emojis (still important but loaded with slight delay)
const SECONDARY_EMOJIS = [
  '😢', '👉', '💗', '😩', '💯', '🌹', '💞', '🎈', '💙', '😃',
  '😡', '💐', '😜', '🙈', '🤞', '😄', '🤤', '🙌', '🤪', '❣️',
  '😀', '💋', '💀', '👇', '💔', '😌', '💓', '🤩', '🙃', '😬'
];

// Emoji categories for background loading - focused on music-related categories
const EMOJI_CATEGORIES = {
  music: ['🎵', '🎶', '🎸', '🎹', '🎺', '🎷', '🥁', '🎤', '🎧', '🎼', '🎙️', '🎚️', '🎛️', '📻', '🔈', '🔉'],
  expressions: ['😱', '😴', '🤭', '😐', '🌞', '😒', '😇', '🌸', '😈', '✌️', '🎊', '🥵', '😞', '💚', '☀️', '🖤'],
  popular: ['💰', '😚', '👑', '🎁', '💥', '🙋', '☹️', '😑', '🥴', '👈', '💩', '✅', '👋', '🤮', '😤', '🤢'],
  extras: ['🌟', '❗', '😥', '🌈', '💛', '😝', '😫', '😲', '🖕', '‼️', '🔴', '🌻', '🤯', '💃', '👊', '🤬']
};

// Keep track of preloaded emoji URLs
const PRELOADED_EMOJIS = new Set<string>();
// Keep track of currently loading emojis to prevent duplicates
const LOADING_EMOJIS = new Set<string>();

// Fix: Use a consistent Twemoji base URL with specific version
const TWEMOJI_BASE_URL = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/';

/**
 * Preload a single emoji image
 */
async function preloadEmoji(emoji: string): Promise<void> {
  if (LOADING_EMOJIS.has(emoji)) return;
  LOADING_EMOJIS.add(emoji);
  
  try {
    // Parse with Twemoji to get the URL
    let url: string | null = null;
    
    // Use the parse method with a type-safe callback
    twemoji.parse(emoji, {
      callback: function(icon, options) {
        // Cast options to any to avoid TypeScript errors with the library's types
        const opts = options as any;
        // Fix: Ensure correct URL structure (no double "svg/svg/")
        url = `${TWEMOJI_BASE_URL}svg/${icon}.svg`;
        return false;
      },
      folder: 'svg',
      ext: '.svg',
      base: TWEMOJI_BASE_URL
    });
    
    if (!url) return;
    
    // Create an image element to preload
    const img = new Image();
    img.src = url;
    
    // Wait for it to load
    await new Promise<void>((resolve) => {
      img.onload = () => {
        PRELOADED_EMOJIS.add(url!);
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load emoji: ${emoji} (${url})`);
        resolve(); // Still resolve on error
      };
    });
    
    console.log(`Preloaded emoji: ${emoji}`);
  } catch (error) {
    console.warn(`Error preloading emoji ${emoji}:`, error);
  } finally {
    LOADING_EMOJIS.delete(emoji);
  }
}

/**
 * Preload top emojis immediately
 */
function preloadTopEmojis(): void {
  console.log('Starting top emoji preloading...');
  
  // Load top emojis with minimal delay
  TOP_EMOJIS.forEach((emoji, index) => {
    setTimeout(() => {
      preloadEmoji(emoji);
    }, index * 20); // Just 20ms between each to quickly load all
  });
  
  // Load secondary emojis with a slight delay after the top ones
  setTimeout(() => {
    SECONDARY_EMOJIS.forEach((emoji, index) => {
      setTimeout(() => {
        preloadEmoji(emoji);
      }, index * 30); // 30ms between each secondary emoji
    });
  }, TOP_EMOJIS.length * 20 + 100); // Wait until top emojis are loaded
}

/**
 * Preload emoji categories in the background
 */
function preloadEmojiCategories(): void {
  console.log('Starting background category emoji preloading...');
  
  // Load categories with sufficient delays to not impact performance
  Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis], categoryIndex) => {
    setTimeout(() => {
      console.log(`Loading ${category} emoji category...`);
      emojis.forEach((emoji, emojiIndex) => {
        setTimeout(() => {
          // Skip if already loaded from top or secondary emojis
          if (!PRELOADED_EMOJIS.has(emoji) && !LOADING_EMOJIS.has(emoji)) {
            preloadEmoji(emoji);
          }
        }, emojiIndex * 50); // 50ms between emojis in a category
      });
    }, categoryIndex * 3000); // 3 seconds between categories
  });
}

/**
 * Check if an emoji URL has been preloaded
 */
export function isEmojiPreloaded(emoji: string): boolean {
  let url: string | null = null;
  
  twemoji.parse(emoji, {
    callback: function(icon, options) {
      const opts = options as any;
      url = `${opts.base}${opts.size}/svg/${icon}${opts.ext}`;
      return false;
    },
    folder: 'svg',
    ext: '.svg',
    base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/'
  });
  
  return url ? PRELOADED_EMOJIS.has(url) : false;
}

/**
 * Main function to initialize the emoji system
 */
export function preloadCommonEmojis(): void {
  // Only run in the browser
  if (typeof window === 'undefined') return;
  
  // Immediate load of top emojis
  preloadTopEmojis();
  
  // Delayed background loading of categories
  setTimeout(() => {
    preloadEmojiCategories();
  }, 5000); // Wait 5 seconds after page load to start background loading
}

// Export the preloaded emojis set
export const preloadedEmojis = PRELOADED_EMOJIS;