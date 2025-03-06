'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateUsername } from '../utils/username';
import { generateRandomAvatarId } from '../utils/avatar';

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const [username, setUsername] = useState('');  // Renamed from userName
  const [avatarId, setAvatarId] = useState('avatar1');
  const [error, setError] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const router = useRouter();

  // Set initial username and avatar on component mount
  useEffect(() => {
    // Check if there's a stored username
    const storedUsername = localStorage.getItem('username') || localStorage.getItem('userId');
    const storedAvatarId = localStorage.getItem('avatarId');
    
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      // Generate and set a random username
      const newUsername = generateUsername();
      setUsername(newUsername);
    }
    
    if (storedAvatarId) {
      setAvatarId(storedAvatarId);
    } else {
      // Generate and set a random avatar
      const newAvatarId = generateRandomAvatarId();
      setAvatarId(newAvatarId);
    }
  }, []);

  const createRoom = async () => {
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }
    
    if (!username.trim()) {
      setError('Your name is required');
      return;
    }

    try {
      setIsCreatingRoom(true);
      
      // Store the username
      localStorage.setItem('username', username);
      localStorage.setItem('userId', username);  // For backward compatibility
      
      // Store the avatar
      localStorage.setItem('avatarId', avatarId);
      
      // Create a unique client ID
      const clientId = `${username}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('clientId', clientId);

      // Store the last room name
      localStorage.setItem('lastRoomName', roomName);
      
      // Create room on the server
      const response = await fetch('http://localhost:3000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`Room created: ${data.room.id} with name: ${roomName}`);
        // Redirect to the room-content page
        window.location.href = `/room-content/${data.room.id}`;
      } else {
        setError(data.error?.message || 'Failed to create room');
        setIsCreatingRoom(false);
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Network error, please try again');
      setIsCreatingRoom(false);
    }
  };

  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      setError('Room ID is required');
      return;
    }
    
    if (!username.trim()) {
      setError('Your name is required');
      return;
    }

    // Store the username
    localStorage.setItem('username', username);
    localStorage.setItem('userId', username);  // For backward compatibility
    
    // Store the avatar
    localStorage.setItem('avatarId', avatarId);
    
    // Create a unique client ID
    const clientId = `${username}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('clientId', clientId);
    
    // Redirect directly to the room-content page
    window.location.href = `/room-content/${joinRoomId}`;
  };

  // If creating a room, show loading screen
  if (isCreatingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-foreground mb-4">Creating Room...</h1>
          <div className="animate-pulse h-2 bg-primary rounded w-full max-w-xs mx-auto"></div>
          <p className="text-muted-foreground mt-4">This will just take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="relative bg-card p-8 rounded-lg shadow-md w-full max-w-md border border-border">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">Social Music Listening</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-6">
          <label className="block text-foreground mb-2">Your Name</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-input text-foreground border-border"
            placeholder="Enter your name"
          />
        </div>
        
        <div className="border-t border-border my-6 pt-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Create a Room</h2>
          <div className="mb-4">
            <label className="block text-foreground mb-2">Room Name</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border rounded bg-input text-foreground border-border"
              placeholder="Enter room name"
            />
          </div>
          <button
            onClick={createRoom}
            className="w-full bg-primary text-white py-2 rounded hover:bg-primary-hover"
          >
            Create Room
          </button>
        </div>
        
        <div className="border-t border-border my-6 pt-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Join a Room</h2>
          <div className="mb-4">
            <label className="block text-foreground mb-2">Room ID</label>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="w-full px-3 py-2 border rounded bg-input text-foreground border-border"
              placeholder="Enter room ID"
            />
          </div>
          <button
            onClick={joinRoom}
            className="w-full bg-secondary text-white py-2 rounded hover:bg-secondary-hover"
          >
            Join Room
          </button>
        </div>
      </div>
    </main>
  );
}