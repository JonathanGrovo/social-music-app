// utils/emojiPreloader.ts
import twemoji from 'twemoji';

// Common emojis to preload
const COMMON_EMOJIS = [
  '😀', '😂', '😊', '😍', '🥰', '😎', 
  '👍', '❤️', '🔥', '✨', '🎉', '🙏',
  '😭', '🥺', '👏', '💯', '🚀', '💪'
];

// Keep track of preloaded emoji URLs
const PRELOADED_EMOJIS = new Set<string>();

/**
 * Preload a single emoji image
 */
async function preloadEmoji(emoji: string): Promise<void> {
  try {
    // Parse with Twemoji to get the URL
    let url: string | null = null;
    
    // Use the parse method with a type-safe callback
    twemoji.parse(emoji, {
      callback: function(icon, options) {
        // Cast options to any to avoid TypeScript errors with the library's types
        const opts = options as any;
        url = `${opts.base}${opts.size}/svg/${icon}${opts.ext}`;
        return false;
      },
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/'
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
      img.onerror = () => resolve(); // Still resolve on error
    });
    
    console.log(`Preloaded emoji: ${emoji}`);
  } catch (error) {
    // Silently ignore errors during preloading
  }
}

/**
 * Preload common emoji images in the background
 */
export function preloadCommonEmojis(): void {
  // Only run in the browser
  if (typeof window === 'undefined') return;
  
  // Delay preloading to prioritize page loading
  setTimeout(() => {
    console.log('Starting emoji preloading...');
    
    // Preload each emoji with a small delay between each
    COMMON_EMOJIS.forEach((emoji, index) => {
      setTimeout(() => {
        preloadEmoji(emoji);
      }, index * 100); // 100ms delay between each preload
    });
  }, 2000); // Wait 2 seconds after page load
}

/**
 * Check if an emoji URL has been preloaded
 */
export function isEmojiPreloaded(url: string): boolean {
  return PRELOADED_EMOJIS.has(url);
}

/**
 * Get a cached emoji URL (for backward compatibility)
 */
export function getCachedEmojiUrl(emoji: string): string | null {
  return null; // No longer used, but kept for compatibility
}