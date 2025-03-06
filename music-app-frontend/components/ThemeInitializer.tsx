'use client';

import { useEffect } from 'react';

export default function ThemeInitializer() {
  // Initialize theme on component mount - always use dark mode
  useEffect(() => {
    // Always add dark class to the document
    document.documentElement.classList.add('dark');
    
    // For consistency, still store the theme preference in localStorage
    localStorage.setItem('theme', 'dark');
  }, []);

  // This component doesn't render anything visible
  return null;
}