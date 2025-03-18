// components/Emoji.tsx
import { useState, useEffect, useRef } from 'react';
import { getEmojiSvg } from '../utils/emojiManager';

interface EmojiProps {
  emoji: string;
  size?: 'normal' | 'medium' | 'large';
}

export default function Emoji({ emoji, size = 'normal' }: EmojiProps) {
  // States to track component status
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // For tracking component lifecycle
  const mountedRef = useRef(true);
  
  useEffect(() => {
    // Track component mount state
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (!emoji) {
      setIsLoading(false);
      setHasError(true);
      setDebugInfo('No emoji provided');
      return;
    }
    
    // Update debug info
    setDebugInfo(`Loading emoji: ${emoji}`);
    
    const loadEmoji = async () => {
      setIsLoading(true);
      setHasError(false);
      
      try {
        console.log(`Emoji component loading: ${emoji}`);
        const svg = await getEmojiSvg(emoji);
        
        if (!mountedRef.current) return; // Prevent state updates if unmounted
        
        if (svg) {
          console.log(`Successfully loaded emoji SVG for: ${emoji}`);
          setSvgContent(svg);
          setIsLoading(false);
          setHasError(false);
          setDebugInfo(`SVG loaded: ${emoji}`);
        } else {
          console.warn(`Failed to load emoji SVG for: ${emoji}, falling back to native`);
          setHasError(true);
          setIsLoading(false);
          setDebugInfo(`SVG failed: ${emoji}`);
        }
      } catch (error) {
        console.error(`Error loading emoji ${emoji}:`, error);
        if (mountedRef.current) {
          setHasError(true);
          setIsLoading(false);
          setDebugInfo(`Error: ${error}`);
        }
      }
    };
    
    loadEmoji();
  }, [emoji]);
  
  const sizeClass = size === 'large' ? 'emoji-large' : 
                   size === 'medium' ? 'emoji-medium' : 
                   'emoji-normal';
  
  // Show native emoji during loading or if there was an error
  if (isLoading || hasError || !svgContent) {
    return (
      <span 
        className={`emoji-fallback ${sizeClass}`}
        style={{
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
          // Add a border to make it more visible for debugging
          border: process.env.NODE_ENV === 'development' ? '1px dashed #666' : 'none'
        }}
        title={debugInfo} // Add a tooltip with debug info
      >
        {emoji}
      </span>
    );
  }
  
  // Render the SVG
  return (
    <span 
      className={`emoji-wrapper ${sizeClass}`}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      title="SVG emoji"
    />
  );
}