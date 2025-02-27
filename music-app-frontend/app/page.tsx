'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Social Music Listening</h1>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Your Name</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="Enter your name"
          />
        </div>
        
        <div className="border-t border-gray-200 my-6 pt-6">
          <h2 className="text-xl font-semibold mb-4">Create a Room</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Room Name</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter room name"
            />
          </div>
          <button
            onClick={createRoom}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Create Room
          </button>
        </div>
        
        <div className="border-t border-gray-200 my-6 pt-6">
          <h2 className="text-xl font-semibold mb-4">Join a Room</h2>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Room ID</label>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter room ID"
            />
          </div>
          <button
            onClick={joinRoom}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Join Room
          </button>
        </div>
      </div>
    </main>
  );
}