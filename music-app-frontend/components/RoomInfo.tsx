'use client';

import { useState, useRef, useEffect } from 'react';
import UsernameEditor from './UsernameEditor';
import AvatarSelector from './AvatarSelector';
import { UserInfo } from '../types';

// Simple crown SVG component with slimmer bottom half
function SimpleCrown({ className = "" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      width="18" 
      height="18" 
      fill="currentColor" 
      className={className}
    >
      {/* Modified path to make the bottom half slimmer */}
      <path d="M12 1L8 5L4 3L6 9L6 12H18L18 9L20 3L16 5L12 1Z" />
    </svg>
  );
}

interface RoomInfoProps {
  roomId: string;
  users: UserInfo[];
  currentUsername: string;
  currentClientId: string;
  currentAvatarId: string;
  onUsernameChange: (newUsername: string) => void;
  onAvatarChange?: (newAvatarId: string) => void;
}

export default function RoomInfo({ 
  roomId, 
  users, 
  currentUsername,
  currentClientId,
  currentAvatarId,
  onUsernameChange,
  onAvatarChange
}: RoomInfoProps) {
  const [copied, setCopied] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const userListRef = useRef<HTMLUListElement>(null);
  
  // Generate room URL
  const roomUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/room/${roomId}` 
    : '';
  
  const copyRoomLink = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleAvatarChange = (newAvatarId: string) => {
    setEditingAvatar(false);
    if (onAvatarChange) {
      onAvatarChange(newAvatarId);
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 shadow-md border border-border">
      <h2 className="text-lg font-semibold mb-2 text-foreground">Room Information</h2>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <p className="text-sm text-muted-foreground">Share this link:</p>
          <button 
            onClick={copyRoomLink}
            className="text-xs bg-muted hover:bg-accent text-foreground px-2 py-1 rounded"
            type="button"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="font-mono text-xs bg-muted p-2 rounded text-foreground truncate">
          {roomUrl}
        </p>
      </div>
      
      {/* Your profile section */}
      <div className="border-b border-border pb-4 mb-4">
        <h3 className="text-sm font-semibold mb-2 text-foreground">Your Profile</h3>
        <div className="flex items-center">
          {/* Avatar with edit button - no status indicator */}
          <div className="relative mr-3 flex-shrink-0">
            <div 
              className="w-12 h-12 rounded-full overflow-hidden cursor-pointer border-2 border-primary"
              onClick={() => setEditingAvatar(true)}
            >
              <img 
                src={`/avatars/${currentAvatarId}.png`} 
                alt="Your Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <button 
              className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              onClick={() => setEditingAvatar(true)}
              title="Change avatar"
            >
              ✎
            </button>
          </div>
          
          {/* Username editor - without (You) in profile section */}
          <div className="min-w-0 flex-1">
            <UsernameEditor 
              currentUsername={currentUsername} 
              onUsernameChange={onUsernameChange}
              showYouIndicator={false}
            />
          </div>
        </div>
        
        {/* Avatar selector dialog */}
        {editingAvatar && onAvatarChange && (
          <div className="mt-3">
            <AvatarSelector 
              currentAvatarId={currentAvatarId}
              onSelect={handleAvatarChange}
              onCancel={() => setEditingAvatar(false)}
            />
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">Users in Room ({users.length}):</p>
        <ul ref={userListRef} className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
          {Array.isArray(users) && users.map((user) => (
            <li 
              key={`user-${user.clientId}`} 
              className="flex items-center text-foreground py-1"
            >
              {/* Avatar with status indicator at bottom right */}
              <div className="relative mr-3 flex-shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img 
                    src={`/avatars/${user.avatarId || 'avatar1'}.png`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Status indicator dot at bottom right */}
                <span className="h-3 w-3 rounded-full bg-secondary absolute bottom-0 right-0 border border-card"></span>
              </div>
              
              {/* Username - show just the username with (You) indicator for current user */}
              <div className="truncate min-w-0 flex-1 flex items-center py-0.5">
                <div className="flex flex-grow truncate min-w-0 items-center">
                  <span className="truncate max-w-[230px] inline-block leading-none" title={user.username}>
                    {user.username}
                  </span>
                  
                  {/* Room owner crown if applicable - right after username */}
                  {user.isRoomOwner && (
                    <span className="text-yellow-500 ml-1 flex-shrink-0 inline-flex items-center" style={{ position: 'relative', top: '3px' }} title="Room Owner">
                      <SimpleCrown className="inline-block" />
                    </span>
                  )}
                  
                  {user.clientId === currentClientId && 
                    <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">(You)</span>
                  }
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}