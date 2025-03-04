'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import ChatBox from '../../../components/ChatBox';
import PlayerControls from '../../../components/PlayerControls';
import Queue from '../../../components/Queue';
import RoomInfo from '../../../components/RoomInfo';

export default function RoomContentPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  
  // Get stored user info - renamed userId to username
  const [username, setUsername] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('avatar1');
  const [roomName, setRoomName] = useState<string>('');
  
  // Connection states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Playback state references to preserve across username changes
  const playbackStateRef = useRef<{
    currentTrack?: any;
    queue: any[];
  }>({
    currentTrack: undefined,
    queue: []
  });
  
  // Initialize on mount
  useEffect(() => {
    // Get username and clientId from localStorage
    const storedUsername = localStorage.getItem('username') || localStorage.getItem('userId'); // Support both new and old keys
    const storedClientId = localStorage.getItem('clientId');
    const storedAvatarId = localStorage.getItem('avatarId') || 'avatar1';
    
    if (!storedUsername || !storedClientId) {
      console.error('Missing user info');
      setError('Missing user information. Please return to the home page.');
      return;
    }
    
    setUsername(storedUsername);
    setClientId(storedClientId);
    setAvatarId(storedAvatarId);

    // Try to get the room name from localStorage if it was just created
    const lastRoomName = localStorage.getItem('lastRoomName');
    if (lastRoomName) {
      console.log(`Found last room name in localStorage: ${lastRoomName}`);
      setRoomName(lastRoomName);
    }
    
    console.log(`Room content initialized: User ${storedUsername}, Client ${storedClientId}, Avatar ${storedAvatarId}`);
    
    // Fetch room details to get the room name
    const fetchRoomDetails = async () => {
      try {
        console.log(`Fetching room details for ${roomId}`);
        const response = await fetch(`http://localhost:3000/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Room details:', data);
          // Try multiple possible paths for room name
          let foundName = '';
          if (data.room && data.room.name) {
            foundName = data.room.name;
          } else if (data.name) {
            foundName = data.name;
          }

          if (foundName) {
            console.log(`Setting room name to: ${foundName}`);
            setRoomName(foundName);
          } else {
            console.warn('Could not find room name in response:', data);
          }
        }
      } catch (error) {
        console.error('Error fetching room details:', error);
      } finally {
        // Always mark loading as complete after room fetch attempt
        setIsLoading(false);
      }
    };
    
    fetchRoomDetails();
  }, [roomId]);
  
  // Initialize socket with roomId, username, and clientId
  const {
    socket,
    connected,
    roomState,
    sendChatMessage,
    updatePlayback,
    updateQueue,
    changeUsername,
    changeAvatar,
    disconnect,
    reconnect
  } = useSocket(roomId, username, clientId, avatarId);
  
  // Update the playback state reference whenever roomState changes
  useEffect(() => {
    if (roomState.currentTrack) {
      playbackStateRef.current.currentTrack = roomState.currentTrack;
    }
    if (roomState.queue.length > 0) {
      playbackStateRef.current.queue = [...roomState.queue];
    }
  }, [roomState]);
  
  // Handle username change
  const handleUsernameChange = (newUsername: string) => {
    if (newUsername === username) {
      console.log("Username unchanged, ignoring");
      return;
    }
    
    console.log(`Changing username from ${username} to ${newUsername}`);
    
    // Store the new username in localStorage - update both keys for compatibility
    localStorage.setItem('username', newUsername);
    localStorage.setItem('userId', newUsername); // For backward compatibility
    
    // Update local state immediately
    setUsername(newUsername);
    
    // Use the improved changeUsername method
    if (changeUsername) {
      changeUsername(newUsername);
    }
  };
  
  // Handle avatar change
  const handleAvatarChange = (newAvatarId: string) => {
    if (newAvatarId === avatarId) {
      console.log("Avatar unchanged, ignoring");
      return;
    }
    
    console.log(`Changing avatar from ${avatarId} to ${newAvatarId}`);
    
    // Store the new avatar in localStorage
    localStorage.setItem('avatarId', newAvatarId);
    
    // Update local state immediately
    setAvatarId(newAvatarId);
    
    // Use the changeAvatar method if available
    if (changeAvatar) {
      changeAvatar(newAvatarId);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-foreground mb-4">Loading Room...</h1>
          <div className="animate-pulse h-2 bg-primary rounded w-full max-w-xs mx-auto"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-xl font-semibold text-foreground mb-4">Error</h1>
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
    <div className="min-h-screen bg-background p-4 md:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <header className="bg-headerBackground text-headerText p-4 rounded-lg mb-6 flex justify-between items-center">
          <h1 className="text-xl font-bold">
            {roomName ? roomName : 'Social Music Room'}
          </h1>
          <div className="text-sm">
            {connected ? (
              <span className="inline-flex items-center">
                <span className="h-2 w-2 rounded-full bg-secondary mr-2"></span>
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center">
                <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                Disconnected
              </span>
            )}
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PlayerControls
              currentTrack={roomState.currentTrack}
              queue={roomState.queue}
              onPlaybackUpdate={updatePlayback}
              onUpdateQueue={updateQueue}
            />
            <Queue
              queue={roomState.queue}
              onUpdateQueue={updateQueue}
            />
          </div>
          
          <div className="space-y-6">
            <RoomInfo
              roomId={roomId}
              users={roomState.users}
              currentUsername={username}
              currentClientId={clientId}
              currentAvatarId={avatarId}
              onUsernameChange={handleUsernameChange}
              onAvatarChange={handleAvatarChange}
            />
            <ChatBox
              messages={roomState.chatHistory}
              onSendMessage={sendChatMessage}
              username={username}
              clientId={clientId}
              avatarId={avatarId}
              roomName={roomName || 'the room'} // Pass room name to ChatBox
            />
          </div>
        </div>
      </div>
    </div>
  );
}