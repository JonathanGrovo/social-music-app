'use client';

import { useState, useRef, useEffect } from 'react';
import UsernameEditor from './UsernameEditor';

import { UserInfo } from '../types';

interface RoomInfoProps {
  roomId: string;
  users: UserInfo[];
  currentUser: string;
  currentClientId: string;
  onUsernameChange: (newUsername: string) => void;
}

export default function RoomInfo({ 
  roomId, 
  users, 
  currentUser, 
  currentClientId,
  onUsernameChange 
}: RoomInfoProps) {
  const [copied, setCopied] = useState(false);
  const [editingUsernameInList, setEditingUsernameInList] = useState(false);
  const userListRef = useRef<HTMLUListElement>(null);
  
  // For debugging
  useEffect(() => {
    console.log('RoomInfo rendering with users:', users);
    console.log('Current user info:', { currentUser, currentClientId });
  }, [users, currentUser, currentClientId]);
  
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
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">Users in Room ({users.length}):</p>
          <ul ref={userListRef} className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
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
                  className="flex items-center text-foreground py-1"
                >
                  <span className="h-2 w-2 rounded-full bg-secondary mr-2 flex-shrink-0"></span>
                  
                  {/* Only show editor for current user */}
                  {user.clientId === currentClientId ? (
                    <div className="truncate flex items-center">
                      <UsernameEditor 
                        currentUsername={user.userId} 
                        onUsernameChange={onUsernameChange}
                      />
                    </div>
                  ) : (
                    <span className="truncate">{user.userId}</span>
                  )}
                </li>
              ))}
          </ul>
          

      </div>
    </div>
  );
}