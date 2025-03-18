// utils/twemojiParser.ts
import twemoji from 'twemoji';

// Parse text to replace emojis with Twemoji HTML
export function parseTwemoji(text: string): string {
  return twemoji.parse(text, {
    folder: 'svg',
    ext: '.svg',
    base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/'
  });
}

// For React components that need to set innerHTML safely
export function renderTwemoji(text: string): { __html: string } {
  return { __html: parseTwemoji(text) };
}