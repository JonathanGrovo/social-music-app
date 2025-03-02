'use client';

import { useState, useRef, useEffect } from 'react';
import UsernameEditor from './UsernameEditor';
import AvatarSelector from './AvatarSelector';
import { UserInfo } from '../types';

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
  
  // For debugging
  useEffect(() => {
    console.log('RoomInfo Props:', {
      roomId, 
      users, 
      currentUsername, 
      currentClientId, 
      currentAvatarId
    });
    
    // Check data types
    console.log('Props types:', {
      roomId: typeof roomId,
      users: Array.isArray(users) ? 'array' : typeof users,
      currentUsername: typeof currentUsername,
      currentClientId: typeof currentClientId,
      currentAvatarId: typeof currentAvatarId
    });
    
    // Log each user's structure
    if (Array.isArray(users)) {
      users.forEach((user, index) => {
        console.log(`User ${index}:`, user, typeof user);
      });
    }
    
    console.log('RoomInfo rendering with users:', users);
    console.log('Current user info:', {
      currentUsername, 
      currentClientId, 
      currentAvatarId
    });
  }, [users, currentUsername, currentClientId, currentAvatarId, roomId]);
  
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
          {/* Avatar with edit button */}
          <div className="relative mr-3">
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
          
          {/* Username editor */}
          <div>
            <UsernameEditor 
              currentUsername={currentUsername} 
              onUsernameChange={onUsernameChange}
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
              {/* Room owner crown if applicable */}
              {user.isRoomOwner && (
                <span className="text-yellow-500 mr-1" title="Room Owner">👑</span>
              )}
              
              {/* Status indicator dot */}
              <span className={`h-2 w-2 rounded-full ${user.isRoomOwner ? 'bg-primary' : 'bg-secondary'} mr-2 flex-shrink-0`}></span>
              
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full overflow-hidden mr-2 flex-shrink-0">
                <img 
                  src={`/avatars/${user.avatarId || 'avatar1'}.png`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Username - show editor for current user */}
              {user.clientId === currentClientId ? (
                <div className="truncate flex items-center">
                  <UsernameEditor 
                    currentUsername={currentUsername} 
                    onUsernameChange={onUsernameChange}
                  />
                </div>
              ) : (
                <span className="truncate">{user.username}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}