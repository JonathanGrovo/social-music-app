'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateUsername } from '../../../utils/username';

export default function JoinRoomPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function joinRoom() {
      try {
        const roomId = params.roomId as string;
        
        // Check if room exists - optional but recommended
        try {
          const response = await fetch(`http://localhost:3000/api/rooms/${roomId}`);
          
          if (!response.ok) {
            setError('Room not found or no longer available');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error checking room:', err);
          // Don't fail here, we'll try to join anyway
        }
        
        // Get username from localStorage or generate a new one
        let username = localStorage.getItem('userId');
        if (!username) {
          username = generateUsername();
          localStorage.setItem('userId', username);
        }
        
        // Create a unique client ID if it doesn't exist
        let clientId = localStorage.getItem('clientId');
        if (!clientId) {
          clientId = `${username}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem('clientId', clientId);
        }
        
        console.log(`Joining room ${roomId} as ${username} (${clientId})`);
        
        // Navigate to the room - we'll use a different page/component for actual room content
        window.location.href = `/room-content/${roomId}`;
      } catch (err) {
        console.error('Error joining room:', err);
        setError('Error joining room. Please try again.');
        setLoading(false);
      }
    }
    
    joinRoom();
  }, [params.roomId, router]);
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-xl font-semibold text-foreground mb-4">Unable to Join Room</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-primary text-white py-2 rounded hover:bg-primary-hover"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-xl font-semibold text-foreground mb-4">Joining Room...</h1>
        <div className="animate-pulse h-2 bg-primary rounded w-full max-w-xs mx-auto"></div>
        <p className="text-muted-foreground mt-4">Setting up your randomly generated username...</p>
      </div>
    </div>
  );
}