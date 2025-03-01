'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import UsernameEditor from './UsernameEditor';
import AvatarSelector from './AvatarSelector';
import { getAvatarPath } from '../utils/avatar';
import { UserInfo } from '../types';

interface RoomInfoProps {
  roomId: string;
  users: UserInfo[];
  currentUser: string;
  currentClientId: string;
  currentAvatarId: string;
  onUsernameChange: (newUsername: string) => void;
  onAvatarChange: (newAvatarId: string) => void;
}

export default function RoomInfo({ 
  roomId, 
  users, 
  currentUser, 
  currentClientId,
  currentAvatarId,
  onUsernameChange,
  onAvatarChange
}: RoomInfoProps) {
  const [copied, setCopied] = useState(false);
  const userListRef = useRef<HTMLUListElement>(null);
  
  // At the top of your RoomInfo component, add this:
  useEffect(() => {
    console.log('RoomInfo Props:', {
      roomId,
      users,
      currentUser,
      currentClientId,
      currentAvatarId
    });
    
    // Log the type of each prop
    console.log('Props types:', {
      roomId: typeof roomId,
      users: Array.isArray(users) ? 'array' : typeof users,
      currentUser: typeof currentUser,
      currentClientId: typeof currentClientId,
      currentAvatarId: typeof currentAvatarId
    });
    
    // If users is an array, check each user
    if (Array.isArray(users)) {
      users.forEach((user, index) => {
        console.log(`User ${index}:`, user, typeof user);
      });
    }
  }, [roomId, users, currentUser, currentClientId, currentAvatarId]);


  // For debugging
  useEffect(() => {
    console.log('RoomInfo rendering with users:', users);
    console.log('Current user info:', { currentUser, currentClientId, currentAvatarId });
  }, [users, currentUser, currentClientId, currentAvatarId]);

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
      
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">Your Profile:</p>
        <div className="flex items-center space-x-3 p-2 bg-muted rounded-lg">
          <AvatarSelector 
            currentAvatarId={currentAvatarId}
            onAvatarChange={onAvatarChange}
          />
          <div className="flex-1">
            <UsernameEditor 
              currentUsername={currentUser} 
              onUsernameChange={onUsernameChange}
            />
          </div>
        </div>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">Users in Room ({users.length}):</p>
        <ul ref={userListRef} className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
          {[...users]
            .sort((a, b) => {
              // Current user goes to the top
              if (a.clientId === currentClientId) return -1;
              if (b.clientId === currentClientId) return 1;
              // Otherwise maintain the existing order
              return 0;
            })
            .map((user) => (
              <li 
                key={`user-${user.clientId}`} 
                className="flex items-center text-foreground p-2 rounded-md hover:bg-muted"
              >
                <div className="h-8 w-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                  <Image 
                    src={getAvatarPath(user.avatarId)}
                    alt={`${user.userId}'s avatar`}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-1 truncate">
                  <span className="truncate">
                    {user.userId}
                    {user.clientId === currentClientId && 
                      <span className="ml-1 text-xs opacity-60">(You)</span>
                    }
                  </span>
                </div>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}