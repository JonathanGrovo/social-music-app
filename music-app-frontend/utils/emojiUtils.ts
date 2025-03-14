// utils/emojiUtils.ts

import { emojiShortcodes } from './emojiShortcodes';

// Maximum number of recent emojis to track
const MAX_RECENT_EMOJIS = 16;

// Local storage key for recent emojis
const RECENT_EMOJIS_KEY = 'recentEmojis';

/**
 * Get recently used emoji shortcodes from localStorage
 */
export function getRecentEmojis(): string[] {
  if (typeof window === 'undefined') return []; // Server-side rendering check
  
  try {
    const storedRecents = localStorage.getItem(RECENT_EMOJIS_KEY);
    return storedRecents ? JSON.parse(storedRecents) : [];
  } catch (error) {
    console.error('Error getting recent emojis:', error);
    return [];
  }
}

/**
 * Add an emoji shortcode to the recently used list
 */
export function addRecentEmoji(shortcode: string): void {
  if (typeof window === 'undefined') return; // Server-side rendering check
  
  try {
    // Get current recent emojis
    const recent = getRecentEmojis();
    
    // Remove the shortcode if it already exists (to avoid duplicates)
    const filtered = recent.filter(code => code !== shortcode);
    
    // Add shortcode to the beginning of the array
    const updated = [shortcode, ...filtered].slice(0, MAX_RECENT_EMOJIS);
    
    // Save back to localStorage
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding recent emoji:', error);
  }
}

/**
 * Get emoji categories for grouping and filtering
 */
export const emojiCategories = [
  { key: 'recent', name: 'Recent', emoji: '🕒' },
  { key: 'face', name: 'Faces', emoji: '😊', filter: /^:(smile|grin|laugh|joy|wink|blush|heart_eyes|kissing|thinking|neutral|unamused|sweat|pensive|confused|cry|sob|joy|angry|rage)/ },
  { key: 'hand', name: 'Hands', emoji: '👋', filter: /^:(wave|raised|vulcan|ok_hand|thumbsup|thumbsdown|clap|pray|fist|metal|point)/ },
  { key: 'heart', name: 'Hearts', emoji: '❤️', filter: /^:(heart|broken_heart|two_hearts|heartbeat|heartpulse|sparkling_heart|cupid|gift_heart)/ },
  { key: 'animal', name: 'Animals', emoji: '🐱', filter: /^:(dog|cat|fox|panda|unicorn|tiger|lion|frog|monkey|bear|koala|penguin|bird)/ },
  { key: 'food', name: 'Food', emoji: '🍔', filter: /^:(pizza|hamburger|taco|cake|coffee|beer|wine)/ },
  { key: 'activity', name: 'Activities', emoji: '⚽', filter: /^:(soccer|basketball|football|tennis|bowling|ping_pong|video_game)/ },
  { key: 'travel', name: 'Travel', emoji: '🚗', filter: /^:(car|rocket|airplane|train|bike|ship|bus)/ },
  { key: 'object', name: 'Objects', emoji: '💡', filter: /^:(bulb|bomb|hammer|key|lock|computer|phone|book|money)/ },
  { key: 'symbol', name: 'Symbols', emoji: '✅', filter: /^:(warning|check|x|question|exclamation|arrow|heart|star|recycle)/ },
];

/**
 * Enhanced function to get emoji shortcode suggestions based on input
 * 
 * @param partialInput The partial input (e.g., ":smi")
 * @param categoryFilter Optional category filter
 * @param limit Maximum number of suggestions to return
 */
export function getEmojiSuggestions(
  partialInput: string, 
  categoryFilter: string | null = null,
  limit: number = 8
): string[] {
  // If it's just a colon, return popular emojis or recent ones
  if (partialInput === ':') {
    if (categoryFilter === 'recent') {
      return getRecentEmojis();
    }
    
    const popularEmojis = [
      ":smile:", ":heart:", ":thumbsup:", ":fire:", ":star:", 
      ":joy:", ":ok_hand:", ":clap:", ":sparkles:", ":100:",
      ":eyes:", ":thinking:", ":pleading_face:", ":tada:", ":rocket:"
    ];
    
    // Filter by category if specified
    if (categoryFilter) {
      const category = emojiCategories.find(cat => cat.key === categoryFilter);
      if (category && category.filter) {
        return popularEmojis.filter(code => category.filter.test(code));
      }
    }
    
    return popularEmojis.slice(0, limit);
  }
  
  // Convert to lowercase for case-insensitive matching
  const searchTerm = partialInput.toLowerCase();
  const allShortcodes = Object.keys(emojiShortcodes);
  
  // First, look for exact prefix matches
  let prefixMatches = allShortcodes.filter(code => 
    code.toLowerCase().startsWith(searchTerm)
  );
  
  // If we don't have enough prefix matches, add substring matches
  if (prefixMatches.length < limit && searchTerm.length > 2) {
    // Get the search term without the colon
    const termWithoutColon = searchTerm.substring(1);
    
    // Find shortcodes containing the search term (not already in prefix matches)
    const substringMatches = allShortcodes.filter(code => 
      !prefixMatches.includes(code) && 
      code.toLowerCase().includes(termWithoutColon)
    );
    
    // Combine matches, prioritizing prefix matches
    prefixMatches = [...prefixMatches, ...substringMatches];
  }
  
  // Apply category filter if specified
  if (categoryFilter && categoryFilter !== 'recent') {
    const category = emojiCategories.find(cat => cat.key === categoryFilter);
    if (category && category.filter) {
      prefixMatches = prefixMatches.filter(code => category.filter.test(code));
    }
  }
  
  return prefixMatches.slice(0, limit);
}

/**
 * Highlight matched parts of shortcodes in search results
 * 
 * @param shortcode The full emoji shortcode
 * @param searchTerm The search term
 */
export function highlightMatchedText(shortcode: string, searchTerm: string): string {
  if (!searchTerm || searchTerm === ':') return shortcode;
  
  const termWithoutColon = searchTerm.substring(1).toLowerCase();
  if (!termWithoutColon) return shortcode;
  
  // For prefix matches, highlight the exact matching start
  if (shortcode.toLowerCase().startsWith(searchTerm)) {
    return `<span class="emoji-search-highlight">${shortcode.substring(0, searchTerm.length)}</span>${shortcode.substring(searchTerm.length)}`;
  }
  
  // For substring matches, find and highlight all occurrences
  const lowerShortcode = shortcode.toLowerCase();
  const parts: string[] = [];
  let lastIndex = 0;
  
  let index = lowerShortcode.indexOf(termWithoutColon, 1); // Start after the colon
  while (index !== -1) {
    // Add the part before the match
    parts.push(shortcode.substring(lastIndex, index));
    
    // Add the highlighted match
    parts.push(`<span class="emoji-search-highlight">${shortcode.substring(index, index + termWithoutColon.length)}</span>`);
    
    // Move past this match
    lastIndex = index + termWithoutColon.length;
    index = lowerShortcode.indexOf(termWithoutColon, lastIndex);
  }
  
  // Add any remaining text
  if (lastIndex < shortcode.length) {
    parts.push(shortcode.substring(lastIndex));
  }
  
  return parts.join('');
}

/**
 * Create a matcher function for emoji shortcode search
 * Returns true if the shortcode matches the search term
 */
export function createEmojiMatcher(searchTerm: string): (shortcode: string) => boolean {
  if (!searchTerm || searchTerm === ':') {
    // Match everything for empty search
    return () => true;
  }
  
  const termLower = searchTerm.toLowerCase();
  return (shortcode: string) => {
    const codeLower = shortcode.toLowerCase();
    
    // Exact prefix match (highest priority)
    if (codeLower.startsWith(termLower)) {
      return true;
    }
    
    // For longer search terms, also consider substring matches
    if (termLower.length > 2) {
      const withoutColon = termLower.substring(1);
      return codeLower.includes(withoutColon);
    }
    
    return false;
  };
}

/**
 * Get a sorted list of suggested emoji shortcodes
 * 
 * @param searchTerm The search term
 * @param categoryFilter Optional category to filter by
 * @param prioritizeRecent Whether to prioritize recently used emojis
 */
export function getSortedEmojiSuggestions(
  searchTerm: string,
  categoryFilter: string | null = null,
  prioritizeRecent: boolean = true
): string[] {
  // Get matches based on the search term
  const matcher = createEmojiMatcher(searchTerm);
  
  // Get all shortcodes
  let shortcodes = Object.keys(emojiShortcodes);
  
  // Apply category filter if specified and not "recent"
  if (categoryFilter && categoryFilter !== 'recent') {
    const category = emojiCategories.find(cat => cat.key === categoryFilter);
    if (category && category.filter) {
      shortcodes = shortcodes.filter(code => category.filter.test(code));
    }
  }
  
  // Filter by search term
  const matches = shortcodes.filter(matcher);
  
  // Get recent emojis
  const recentEmojis = prioritizeRecent ? getRecentEmojis() : [];
  
  // Create sorting function that prioritizes:
  // 1. Exact prefix matches
  // 2. Recent emojis (if enabled)
  // 3. Substring matches
  const sortByRelevance = (a: string, b: string): number => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const termLower = searchTerm.toLowerCase();
    
    // First, check for exact prefix match
    const aExactMatch = aLower.startsWith(termLower);
    const bExactMatch = bLower.startsWith(termLower);
    
    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;
    
    // Then, consider recency
    if (prioritizeRecent) {
      const aRecentIndex = recentEmojis.indexOf(a);
      const bRecentIndex = recentEmojis.indexOf(b);
      
      // If both are recent, sort by recency
      if (aRecentIndex !== -1 && bRecentIndex !== -1) {
        return aRecentIndex - bRecentIndex;
      }
      
      // If one is recent, prioritize it
      if (aRecentIndex !== -1) return -1;
      if (bRecentIndex !== -1) return 1;
    }
    
    // Lastly, sort alphabetically
    return aLower.localeCompare(bLower);
  };
  
  // Sort and limit results
  return matches.sort(sortByRelevance).slice(0, 8);
}