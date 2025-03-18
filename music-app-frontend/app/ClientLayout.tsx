// In app/ClientLayout.tsx
'use client';

import { useEffect, useRef } from 'react';
import { preloadCommonEmojis } from '../utils/emojiPreloader';
import twemoji from 'twemoji';
import { TWEMOJI_BASE_URL } from '../utils/emojiConstants';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const emojiPickerInitializedRef = useRef(false);
  
  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Preload common emojis in the background
    preloadCommonEmojis();
    
    // Function to apply Twemoji to the emoji picker when it's opened
    const applyTwemojiToEmojiPicker = () => {
      // Find any open emoji-picker elements
      const emojiPickers = document.querySelectorAll('emoji-picker');
      
      if (emojiPickers.length > 0 && !emojiPickerInitializedRef.current) {
        emojiPickerInitializedRef.current = true;
        
        // Handle the initial rendering
        setTimeout(() => {
          emojiPickers.forEach(picker => {
            // Find all emoji elements inside the picker
            const emojiElements = picker.querySelectorAll('.emoji');
            
            emojiElements.forEach(element => {
              if (element.textContent) {
                // Replace with Twemoji
                element.innerHTML = twemoji.parse(element.textContent, {
                  folder: 'svg',
                  ext: '.svg',
                  base: TWEMOJI_BASE_URL
                });
              }
            });
          });
        }, 500); // Short delay to ensure the picker is rendered
      }
    };
    
    // Set up a mutation observer to watch for emoji-picker being added to the DOM
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'EMOJI-PICKER') {
              applyTwemojiToEmojiPicker();
            }
          });
        }
      });
    });
    
    // Start observing the document body
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Clean up
    return () => {
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
}