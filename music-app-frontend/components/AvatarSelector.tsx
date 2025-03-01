'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { avatarOptions } from '../utils/avatar';

interface AvatarSelectorProps {
  currentAvatarId: string;
  onAvatarChange: (newAvatarId: string) => void;
}

export default function AvatarSelector({ 
  currentAvatarId, 
  onAvatarChange 
}: AvatarSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get current avatar path
  const currentAvatar = avatarOptions.find(option => option.id === currentAvatarId) || avatarOptions[0];
  
  // Handle selecting a new avatar
  const handleSelectAvatar = (avatarId: string) => {
    onAvatarChange(avatarId);
    setIsOpen(false);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current avatar (clickable) */}
      <div 
        className="cursor-pointer relative group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-colors">
          <Image 
            src={currentAvatar.path}
            alt="Your avatar" 
            width={40} 
            height={40}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-white"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </div>
      </div>
      
      {/* Avatar selection dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-card border border-border rounded-md shadow-lg z-10 w-48">
          <h3 className="text-xs font-medium text-foreground mb-2 px-2">Select Avatar</h3>
          <div className="grid grid-cols-4 gap-2">
            {avatarOptions.map((avatar) => (
              <div 
                key={avatar.id}
                className={`
                  cursor-pointer p-1 rounded-md hover:bg-accent transition-colors
                  ${currentAvatarId === avatar.id ? 'bg-accent ring-2 ring-primary' : ''}
                `}
                onClick={() => handleSelectAvatar(avatar.id)}
              >
                <div className="h-8 w-8 rounded-full overflow-hidden">
                  <Image 
                    src={avatar.path}
                    alt={`Avatar option ${avatar.id}`} 
                    width={32} 
                    height={32}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}