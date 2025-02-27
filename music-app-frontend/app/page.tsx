'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '../components/ThemeToggle';

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const router = useRouter();

  const createRoom = async () => {
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }
    
    if (!userName.trim()) {
      setError('Your name is required');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('userId', userName);
        router.push(`/room/${data.room.id}`);
      } else {
        setError(data.error?.message || 'Failed to create room');
      }
    } catch (err) {
      setError('Network error, please try again');
    }
  };

  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      setError('Room ID is required');
      return;
    }
    
    if (!userName.trim()) {
      setError('Your name is required');
      return;
    }

    localStorage.setItem('userId', userName);
    router.push(`/room/${joinRoomId}`);
  };

  // Add theme initialization
  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="relative bg-card p-8 rounded-lg shadow-md w-full max-w-md border border-border">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
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
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
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