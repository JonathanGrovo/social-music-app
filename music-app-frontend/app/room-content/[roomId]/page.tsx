// Updated room-content/[roomId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import ChatBox from '../../../components/ChatBox';
import PlayerControls from '../../../components/PlayerControls';
import Queue from '../../../components/Queue';
import Sidebar from '../../../components/Sidebar';
import { QueueItem } from '../../../types';

export default function RoomContentPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  
  // Get stored user info
  const [username, setUsername] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('avatar1');
  const [roomName, setRoomName] = useState<string>('');
  
  // Add state for video URL input
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  
  // Add state for tab navigation
  const [activeTab, setActiveTab] = useState('chat'); // Options: 'chat', 'queue', 'history'
  
  // Connection states
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Responsive layout state
  const [windowWidth, setWindowWidth] = useState(0); 
  const [windowHeight, setWindowHeight] = useState(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

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
    // Update window dimensions 
    const updateWindowDimensions = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };

    // Call once and add listener
    updateWindowDimensions();
    window.addEventListener('resize', updateWindowDimensions);
    
    // Get username and clientId from localStorage
    const storedUsername = localStorage.getItem('username') || localStorage.getItem('userId');
    const storedClientId = localStorage.getItem('clientId');
    const storedAvatarId = localStorage.getItem('avatarId') || 'avatar1';
    
    if (!storedUsername || !storedClientId) {
      console.error('Missing user info');
      setConnectionError('Missing user information. Please return to the home page.');
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
    
    // Fetch room details to get the room name
    const fetchRoomDetails = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          let foundName = '';
          if (data.room && data.room.name) {
            foundName = data.room.name;
          } else if (data.name) {
            foundName = data.name;
          }

          if (foundName) {
            setRoomName(foundName);
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
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', updateWindowDimensions);
    };
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

  // Update room name from socket roomState if available
  useEffect(() => {
    if (roomState && roomState.roomName && roomState.roomName !== roomName) {
      setRoomName(roomState.roomName);
    }
  }, [roomState, roomName]);
  
  // Update the playback state reference whenever roomState changes
  useEffect(() => {
    if (roomState.currentTrack) {
      playbackStateRef.current.currentTrack = roomState.currentTrack;
    }
    if (roomState.queue.length > 0) {
      playbackStateRef.current.queue = [...roomState.queue];
    }
  }, [roomState]);

  // Also add a useEffect to handle tab switching and update scroll button visibility
  useEffect(() => {
    // When active tab changes to chat, make sure scroll position is checked
    if (activeTab === 'chat') {
      // Short delay to ensure DOM is updated
      setTimeout(() => {
        // Dispatch a scroll event to force recalculation of button visibility
        const chatContainer = document.querySelector('.chat-messages-container');
        if (chatContainer) {
          chatContainer.dispatchEvent(new Event('scroll'));
        }
      }, 100);
    }
  }, [activeTab]);
  
  // Determine layout mode based on window dimensions
  const isCompactMode = windowWidth < 768; // Below tablet breakpoint
  const isWideMode = windowWidth >= 1200;
  
  // Queue management functions
  const addToQueue = () => {
    if (!videoUrl.trim()) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    try {
      // Extract YouTube video ID
      let videoId = '';
      
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // YouTube
        if (videoUrl.includes('youtube.com/watch')) {
          const url = new URL(videoUrl);
          videoId = url.searchParams.get('v') || '';
        } else if (videoUrl.includes('youtu.be/')) {
          videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        } else if (videoUrl.includes('youtube.com/embed/')) {
          videoId = videoUrl.split('youtube.com/embed/')[1].split('?')[0];
        } else if (videoUrl.includes('youtube.com/shorts/')) {
          videoId = videoUrl.split('youtube.com/shorts/')[1].split('?')[0];
        }
      } else {
        // Try to treat input as a direct YouTube ID if it's 11 characters long
        const directId = videoUrl.trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(directId)) {
          videoId = directId;
        } else {
          setError('Unsupported URL format. Please use a YouTube URL or video ID.');
          return;
        }
      }

      if (!videoId) {
        setError('Could not extract YouTube video ID from URL');
        return;
      }

      // Create new queue item
      const newItem: QueueItem = {
        id: videoId,
        source: 'youtube',
        title: `YouTube Video (${videoId})` // This will be updated with actual title when played
      };

      // Add to queue
      const newQueue = [...roomState.queue, newItem];
      updateQueue(newQueue);
      
      // If there is no current track playing, start playing the added video
      if (!roomState.currentTrack && newQueue.length === 1) {
        console.log('Starting playback of newly added video');
        updatePlayback(0, true, videoId, 'youtube');
      }
      
      setVideoUrl('');
      setError('');
    } catch (err) {
      setError('Invalid URL format');
    }
  };

  const removeFromQueue = (index: number) => {
    const newQueue = [...roomState.queue];
    newQueue.splice(index, 1);
    updateQueue(newQueue);
  };
  
  // Handle username change
  const handleUsernameChange = (newUsername: string) => {
    if (newUsername === username) {
      return;
    }
    
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
      return;
    }
    
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
  
  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-xl font-semibold text-foreground mb-4">Error</h1>
          <p className="text-muted-foreground mb-6">{connectionError}</p>
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar - Room Info */}
      {!isCompactMode && (
        <Sidebar
          roomId={roomId}
          roomName={roomName}
          connected={connected}
          users={roomState.users}
          currentUsername={username}
          currentClientId={clientId}
          currentAvatarId={avatarId}
          onUsernameChange={handleUsernameChange}
          onAvatarChange={handleAvatarChange}
        />
      )}
      
      {/* Main Content Area - with fixed height video player and always visible controls */}
      <div className="flex-1 flex flex-col overflow-hidden main-content-column" ref={mainContentRef}>
        {/* Queue entry above player */}
        <div className="bg-card p-2 m-2 mb-0 rounded-lg">
          <div className="flex mb-2 items-center text-xs">
            {connected ? (
              <span className="text-green-500">• Player connected and ready</span>
            ) : (
              <span className="text-yellow-500">• Connecting to server...</span>
            )}
          </div>
          
          {/* Queue entry form */}
          <div className="flex">
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1 border rounded-l px-3 py-2 bg-input text-foreground border-border focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="YouTube URL or video ID"
            />
            <button
              onClick={addToQueue}
              className="bg-secondary hover:bg-secondary-hover text-white px-4 py-2 rounded-r"
            >
              Add
            </button>
          </div>
          
          {error && (
            <div className="mt-2 p-2 bg-red-100 text-red-700 text-sm rounded">
              {error}
            </div>
          )}
          
          <div className="mt-2 text-xs text-muted-foreground">
            <span>Example: </span>
            <span className="font-mono">https://www.youtube.com/watch?v=dQw4w9WgXcQ</span>
            <span> or </span>
            <span className="font-mono">dQw4w9WgXcQ</span>
          </div>
        </div>
        
        {/* Player Container - Always visible with responsive behavior */}
        <div className={`video-container ${isCompactMode ? 'player-mode-fixed' : ''} `}>
          <PlayerControls
            currentTrack={roomState.currentTrack}
            queue={roomState.queue}
            onPlaybackUpdate={updatePlayback}
            onUpdateQueue={updateQueue}
          />
        </div>
      </div>
      
      {/* Right Sidebar - Tabbed Interface (Chat/Queue/History) */}
      <div className={`${isCompactMode ? 'w-full' : 'w-96'} bg-card h-screen flex flex-col overflow-hidden`}>
        {/* Tab navigation */}
        <div className="flex">
          <button 
            className={`py-2 px-4 flex-1 ${activeTab === 'chat' ? 'bg-accent text-foreground' : 'bg-transparent text-muted-foreground'}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
          <button 
            className={`py-2 px-4 flex-1 ${activeTab === 'queue' ? 'bg-accent text-foreground' : 'bg-transparent text-muted-foreground'}`}
            onClick={() => setActiveTab('queue')}
          >
            Queue
          </button>
          <button 
            className={`py-2 px-4 flex-1 ${activeTab === 'history' ? 'bg-accent text-foreground' : 'bg-transparent text-muted-foreground'}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>
        
        {/* Tab content */}
<div className="flex-1 flex flex-col h-full overflow-hidden">
  {activeTab === 'chat' && (
    <ChatBox
      messages={roomState.chatHistory}
      onSendMessage={sendChatMessage}
      username={username}
      clientId={clientId}
      avatarId={avatarId}
      roomName={roomName || 'the room'}
      roomId={roomId}
    />
  )}
  
  {activeTab === 'queue' && (
    <div className="flex-1 overflow-y-auto p-4">
      <h3 className="font-medium text-foreground mb-2">Queue ({roomState.queue.length})</h3>
      <ul className="divide-y divide-border">
        {roomState.queue.map((item, index) => (
          <li key={`queue-${index}`} className="py-2">
            <div className="flex justify-between items-center">
              <div className="truncate flex-1 pr-2">
                <p className="font-medium truncate text-foreground">{item.title || `Video: ${item.id}`}</p>
                <p className="text-sm text-muted-foreground">{item.source}</p>
              </div>
              <button
                onClick={() => removeFromQueue(index)}
                className="text-red-500 hover:text-red-700 flex-shrink-0"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        
        {roomState.queue.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="py-6 text-center text-muted-foreground">
            Queue is empty. Add videos using the form above the player.
          </div>
        </div>
        )}
      </ul>
    </div>
  )}
  
  {activeTab === 'history' && (
  <div className="flex-1 overflow-y-auto p-4">
    <h3 className="font-medium text-foreground mb-2">Play History</h3>
    <div className="flex items-center justify-center h-[calc(100%-2rem)]">
      <p className="text-center text-muted-foreground py-6">
        Play history will be available soon.
      </p>
    </div>
  </div>
  )}
</div>
      </div>
      
      {/* Mobile Navigation Menu (only visible in compact mode) */}
      {isCompactMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
          <div className="flex justify-around">
            <button 
              className={`p-3 flex flex-col items-center ${activeTab === 'chat' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('chat')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="text-xs mt-1">Chat</span>
            </button>
            <button 
              className={`p-3 flex flex-col items-center ${activeTab === 'queue' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('queue')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span className="text-xs mt-1">Queue</span>
            </button>
            <button 
              className={`p-3 flex flex-col items-center ${activeTab === 'users' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('users')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span className="text-xs mt-1">Users</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}