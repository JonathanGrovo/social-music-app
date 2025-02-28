'use client';

import { useState, useRef, useEffect } from 'react';
import UsernameEditor from './UsernameEditor';
import { generateUsername } from '../utils/username';

interface RoomInfoProps {
  roomId: string;
  users: string[];
  currentUser: string;
  onUsernameChange: (newUsername: string) => void;
}

export default function RoomInfo({ roomId, users, currentUser, onUsernameChange }: RoomInfoProps) {
  const [copied, setCopied] = useState(false);
  const userListRef = useRef<HTMLUListElement>(null);
  const prevUsersRef = useRef<string[]>([]);
  
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

  // Handle random username button click
  const handleRandomUsername = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Generate a new random username that's different from the current one
    let newUsername = generateUsername();
    while (newUsername === currentUser) {
      newUsername = generateUsername();
    }
    
    onUsernameChange(newUsername);
    return false;
  };
  
  // Setup a hook to store the previous list of users
  useEffect(() => {
    prevUsersRef.current = users;
  }, [users]);

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
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Your name:</p>
          <button 
            onClick={handleRandomUsername}
            className="text-xs bg-muted hover:bg-accent text-foreground px-2 py-1 rounded"
            type="button"
          >
            Random
          </button>
        </div>
        <div className="mt-1 font-medium">
          <UsernameEditor 
            currentUsername={currentUser} 
            onUsernameChange={onUsernameChange} 
          />
        </div>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">Users in Room ({users.length}):</p>
        <ul ref={userListRef} className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
          {users.map((user, index) => (
            <li key={user} className="flex items-center text-foreground py-1">
              <span className="h-2 w-2 rounded-full bg-secondary mr-2 flex-shrink-0"></span>
              <span className="truncate">{user === currentUser ? `${user} (You)` : user}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}