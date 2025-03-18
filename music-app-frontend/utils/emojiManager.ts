// utils/emojiManager.ts
import twemoji from 'twemoji';

// List of common emojis to preload and prioritize
export const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', 
  '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', 
  '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', 
  '🤓', '😎', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', 
  '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', 
  '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', 
  '👍', '👎', '👌', '✌️', '🤞', '👋', '❤️', '🔥', '✨',
  '🎉', '👏', '🙏', '💯'
];

// Fix the emojiToCodePoint function in utils/emojiManager.ts
export function emojiToCodePoint(emoji: string): string {
    // Convert emoji to code point using twemoji's internal method
    // The toCodePoint function only accepts a string parameter
    const codePoint = twemoji.convert.toCodePoint(emoji);
    
    // Ensure the code point is in the format expected by the CDN
    return codePoint;
}

// Local storage cache helpers
const CACHE_PREFIX = 'twemoji_';
const MAX_CACHE_SIZE = 150; // Maximum number of emojis to cache
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Preload common emojis to cache for faster access
 */
export function preloadCommonEmojis() {
  // Only attempt preloading in client-side environment
  if (typeof window === 'undefined') return;
  
  // Preload in the background without awaiting
  COMMON_EMOJIS.forEach(emoji => {
    getEmojiSvg(emoji).catch(err => {
      console.warn(`Failed to preload emoji: ${emoji}`, err);
    });
  });
}

/**
 * Prune the emoji cache if it exceeds the maximum size
 * Removes older entries first
 */
function pruneCache(): void {
  try {
    // Get all keys from localStorage
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        allKeys.push(key);
      }
    }
    
    // If we're under the size limit, no need to prune
    if (allKeys.length <= MAX_CACHE_SIZE) return;
    
    console.log(`Pruning emoji cache: ${allKeys.length} items exceeds limit of ${MAX_CACHE_SIZE}`);
    
    // Get timestamps for all cached items
    const keyTimestamps: [string, number][] = allKeys.map(key => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return [key, 0];
        
        const parsed = JSON.parse(item);
        return [key, parsed.timestamp || 0];
      } catch (e) {
        // If we can't parse, assume it's old
        return [key, 0];
      }
    });
    
    // Sort by timestamp, oldest first
    keyTimestamps.sort((a, b) => a[1] - b[1]);
    
    // Remove oldest entries until we're under the limit
    const toRemove = keyTimestamps.slice(0, keyTimestamps.length - MAX_CACHE_SIZE + 10); // +10 for buffer
    
    // Remove from localStorage
    toRemove.forEach(([key]) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Error removing item from localStorage:', e);
      }
    });
    
    console.log(`Removed ${toRemove.length} items from emoji cache`);
  } catch (error) {
    console.error('Error pruning emoji cache:', error);
  }
}

// Completely revise getEmojiSvg to use official Twemoji URLs directly
export async function getEmojiSvg(emoji: string): Promise<string | null> {
    try {
      // Use twemoji directly to get the correct URL
      let svgUrl = '';
      
      // Parse the emoji and capture the URL from the generated HTML
      twemoji.parse(emoji, {
        folder: 'svg',
        ext: '.svg',
        callback: (icon, options) => {
          svgUrl = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${icon}.svg`;
          return svgUrl;
        }
      });
      
      if (!svgUrl) {
        console.error('Failed to generate URL for emoji:', emoji);
        return null;
      }
      
      // Extract the code point for caching
      const codePoint = svgUrl.split('/').pop()?.replace('.svg', '');
      if (!codePoint) {
        console.error('Failed to extract code point from URL:', svgUrl);
        return null;
      }
      
      const cacheKey = `${CACHE_PREFIX}${codePoint}`;
      
      // Try to get from localStorage first
      try {
        const cachedItem = localStorage.getItem(cacheKey);
        if (cachedItem) {
          const { svg, timestamp } = JSON.parse(cachedItem);
          
          // Check if cache is still valid
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            return svg;
          }
        }
      } catch (error) {
        console.error('Error accessing emoji cache:', error);
      }
      
      // Not in cache or expired, fetch from CDN
      console.log(`Fetching emoji from: ${svgUrl}`);
      const response = await fetch(svgUrl);
      
      if (!response.ok) {
        // Try an alternative CDN format for variant selectors
        // This handles cases like 2764-fe0f.svg (heart with variant)
        if (codePoint.includes('-fe0f')) {
          const baseCodePoint = codePoint.replace('-fe0f', '');
          const altUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${baseCodePoint}.svg`;
          console.log(`Retry with base code point: ${altUrl}`);
          
          const altResponse = await fetch(altUrl);
          if (altResponse.ok) {
            const svg = await altResponse.text();
            
            // Save to cache
            try {
              pruneCache();
              localStorage.setItem(cacheKey, JSON.stringify({ svg, timestamp: Date.now() }));
            } catch (error) {
              console.error('Error saving emoji to cache:', error);
            }
            
            return svg;
          }
        }
        
        // Try the Twitter CDN directly if other attempts fail
        const twitterUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${codePoint}.svg`;
        console.log(`Retrying with Twitter CDN: ${twitterUrl}`);
        
        const twitterResponse = await fetch(twitterUrl);
        if (!twitterResponse.ok) {
          // One final attempt - newer emoji might be missing the -fe0f variant suffix in the CDN
          if (codePoint.includes('-fe0f')) {
            const baseCodePoint = codePoint.replace('-fe0f', '');
            const twitterBaseUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${baseCodePoint}.svg`;
            console.log(`Final attempt with Twitter CDN base code: ${twitterBaseUrl}`);
            
            const finalResponse = await fetch(twitterBaseUrl);
            if (!finalResponse.ok) {
              console.error(`Failed to fetch emoji ${emoji} (${codePoint}): ${response.status}, ${twitterResponse.status}`);
              return null;
            }
            
            const svg = await finalResponse.text();
            
            // Save to cache
            try {
              pruneCache();
              localStorage.setItem(cacheKey, JSON.stringify({ svg, timestamp: Date.now() }));
            } catch (error) {
              console.error('Error saving emoji to cache:', error);
            }
            
            return svg;
          }
          
          console.error(`Failed to fetch emoji ${emoji} (${codePoint}): ${response.status}, ${twitterResponse.status}`);
          return null;
        }
        
        const svg = await twitterResponse.text();
        
        // Save to cache
        try {
          pruneCache();
          localStorage.setItem(cacheKey, JSON.stringify({ svg, timestamp: Date.now() }));
        } catch (error) {
          console.error('Error saving emoji to cache:', error);
        }
        
        return svg;
      }
      
      const svg = await response.text();
      
      // Save to cache
      try {
        pruneCache();
        localStorage.setItem(cacheKey, JSON.stringify({ svg, timestamp: Date.now() }));
      } catch (error) {
        console.error('Error saving emoji to cache:', error);
      }
      
      return svg;
    } catch (error) {
      console.error('Error processing emoji:', error, emoji);
      return null;
    }
}