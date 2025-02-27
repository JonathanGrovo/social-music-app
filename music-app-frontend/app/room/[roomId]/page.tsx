'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import ChatBox from '../../../components/ChatBox';
import PlayerControls from '../../../components/PlayerControls';
import Queue from '../../../components/Queue';
import RoomInfo from '../../../components/RoomInfo';
import ThemeToggle from '../../../components/ThemeToggle';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const roomId = params.roomId as string;
  const [debug, setDebug] = useState<string[]>([]);
  
  // Debug logging
  const logDebug = (message: string) => {
    console.log(`[Room] ${message}`);
    setDebug(prev => [message, ...prev].slice(0, 20));
  };
  
  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      logDebug('No userId found, redirecting to home');
      router.push('/');
    } else {
      logDebug(`User ID loaded: ${storedUserId}`);
      setUserId(storedUserId);
    }
  }, [router]);

  // Socket connection
  const { connected, roomState, sendChatMessage, updatePlayback, updateQueue } = useSocket(roomId, userId);
  
  // Log room state changes
  useEffect(() => {
    if (userId) {
      logDebug(`Room state updated: ${connected ? 'connected' : 'disconnected'}`);
      logDebug(`Users in room: ${roomState.users.length}`);
      logDebug(`Queue items: ${roomState.queue.length}`);
      logDebug(`Current track: ${roomState.currentTrack ? roomState.currentTrack.id : 'none'}`);
    }
  }, [roomState, connected, userId]);
  
  // Enhanced updateQueue with logging
  const handleUpdateQueue = (newQueue: any[]) => {
    logDebug(`Updating queue: ${newQueue.length} items`);
    updateQueue(newQueue);
  };
  
  // Enhanced updatePlayback with logging
  const handlePlaybackUpdate = (currentTime: number, isPlaying: boolean, trackId: string, source: 'youtube' | 'soundcloud') => {
    logDebug(`Playback update: ${trackId} (${source}) at ${currentTime}s, playing: ${isPlaying}`);
    updatePlayback(currentTime, isPlaying, trackId, source);
  };

  if (!userId) {
    return <div className="p-8 text-center text-foreground bg-background">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-header-bg text-header-text p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Social Music Room</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className={`h-3 w-3 rounded-full ${connected ? 'bg-secondary' : 'bg-red-500'} mr-2`}></span>
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column: Room info and queue */}
          <div className="space-y-4">
            <RoomInfo 
              roomId={roomId} 
              users={roomState.users} 
              currentUser={userId}
            />
            <Queue 
              queue={roomState.queue}
              onUpdateQueue={handleUpdateQueue}
            />
          </div>
          
          {/* Middle column: Player */}
          <div className="lg:col-span-1">
            <PlayerControls
              currentTrack={roomState.currentTrack}
              queue={roomState.queue}
              onPlaybackUpdate={handlePlaybackUpdate}
              onUpdateQueue={handleUpdateQueue}
            />
          </div>
          
          {/* Right column: Chat */}
          <div className="h-[70vh]">
            <ChatBox
              messages={roomState.chatHistory}
              onSendMessage={sendChatMessage}
              username={userId}
            />
          </div>
        </div>
        
        {/* Debug panel */}
        <div className="mt-4 p-2 bg-muted text-foreground rounded text-xs font-mono max-h-32 overflow-y-auto">
          <p className="font-bold mb-1">Room Debug Log:</p>
          {debug.map((msg, i) => (
            <div key={i} className="mb-1">{msg}</div>
          ))}
        </div>
      </main>
    </div>
  );
}