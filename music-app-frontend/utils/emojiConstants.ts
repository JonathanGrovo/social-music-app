// utils/emojiConstants.ts

/**
 * Base URL for Twemoji assets - use a specific version for stability
 */
export const TWEMOJI_BASE_URL = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/';

/**
 * Standard options for Twemoji parsing
 */
export const TWEMOJI_OPTIONS = {
  folder: 'svg',
  ext: '.svg',
  base: TWEMOJI_BASE_URL
};

/**
 * Get the Twemoji URL for a given emoji
 * @param emoji The emoji character
 * @returns URL to the Twemoji SVG
 */
export function getTwemojiUrl(emoji: string): string | null {
  let url: string | null = null;
  
  try {
    const twemoji = require('twemoji');
    twemoji.parse(emoji, {
      callback: (icon: string) => {
        url = `${TWEMOJI_BASE_URL}svg/${icon}.svg`;
        return false;
      },
      ...TWEMOJI_OPTIONS
    });
    
    return url;
  } catch (error) {
    console.error(`Error getting Twemoji URL for ${emoji}:`, error);
    return null;
  }
}