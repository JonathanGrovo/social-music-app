'use client';

import { useState, useRef } from 'react';
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
          <div className="flex items-center">
            {/* User-plus share icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            <p className="text-sm text-muted-foreground">Share this link:</p>
          </div>
        </div>
        <div className="flex items-center">
          <p className="font-mono text-xs bg-muted p-2 rounded-l text-foreground truncate flex-1">
            {roomUrl}
          </p>
          <button 
            onClick={copyRoomLink}
            className="flex items-center bg-muted hover:bg-accent text-foreground px-2 py-2 rounded-r border-l border-border"
            title="Copy to clipboard"
          >
            {/* Clipboard icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
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
                <span className="h-3 w-3 rounded-full bg-green-500 absolute bottom-0 right-0 border border-card status-tooltip" title="Active"></span>
              </div>
              
              {/* Username - show just the username with (You) indicator for current user */}
              <div className="truncate min-w-0 flex-1 flex items-center py-0.5">
                <div className="flex flex-grow truncate min-w-0 items-center">
                  <span className="truncate max-w-[230px] inline-block leading-none" title={user.username}>
                    {user.username}
                  </span>
                  
                  {/* Room owner crown if applicable - right after username */}
                  {user.isRoomOwner && (
                    <span 
                      className="text-yellow-500 ml-1 flex-shrink-0 inline-flex items-center crown-tooltip" 
                      style={{ position: 'relative', top: '3px' }} 
                      title="Room Owner"
                    >
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