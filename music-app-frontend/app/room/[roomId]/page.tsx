'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import ChatBox from '../../../components/ChatBox';
import PlayerControls from '../../../components/PlayerControls';
import Queue from '../../../components/Queue';
import RoomInfo from '../../../components/RoomInfo';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const [userId, setUserId] = useState<string>('');
  const roomId = params.roomId as string;
  
  // Get user ID from localStorage
  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/');
    } else {
      setUserId(storedUserId);
    }
  }, [router]);

  // Socket connection
  const { connected, roomState, sendChatMessage, updatePlayback, updateQueue } = useSocket(roomId, userId);

  if (!userId) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Social Music Room</h1>
          <div className="flex items-center">
            <span className={`h-3 w-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'} mr-2`}></span>
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
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
              onUpdateQueue={updateQueue}
            />
          </div>
          
          {/* Middle column: Player */}
          <div className="lg:col-span-1">
            <PlayerControls
              currentTrack={roomState.currentTrack}
              onPlaybackUpdate={updatePlayback}
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
      </main>
    </div>
  );
}