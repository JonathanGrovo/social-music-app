// In app/ClientLayout.tsx
'use client';

import { useEffect } from 'react';
import { preloadCommonEmojis } from '../utils/emojiPreloader';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Preload common emojis in the background
    preloadCommonEmojis();
  }, []);

  return <>{children}</>;
}