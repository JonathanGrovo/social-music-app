'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '../../../hooks/useSocket';
import ChatBox from '../../../components/ChatBox';
import PlayerControls from '../../../components/PlayerControls';
import Queue from '../../../components/Queue';
import RoomInfo from '../../../components/RoomInfo';
import UsernameEditor from '../../../components/UsernameEditor';
import { Tooltip } from 'react-tooltip';
import useTooltipFix from '../../../hooks/useTooltipFix';

export default function RoomContentPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  
  // Get stored user info
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
  // Add initialization effect back while still including scrollbar styling
  useEffect(() => {
    // Get username and clientId from localStorage
    const storedUsername = localStorage.getItem('username') || localStorage.getItem('userId');
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
    
    // Add custom scrollbar styling to the document
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Customize scrollbars for a more subtle appearance */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: #4a4d53;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #5d6067;
      }
      
      /* Firefox scrollbar styling */
      * {
        scrollbar-width: thin;
        scrollbar-color: #4a4d53 transparent;
      }
    `;
    document.head.appendChild(styleElement);
    
    // Cleanup function to remove style when component unmounts
    return () => {
      if (styleElement.parentNode) {
        document.head.removeChild(styleElement);
      }
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
      console.log(`Updating room name from socket: ${roomState.roomName}`);
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
  
  // Use tooltip fix hook
  useTooltipFix();
  
  // State for showing "Copied" text
  const [copied, setCopied] = useState(false);
  // State for editing avatar
  const [editingAvatar, setEditingAvatar] = useState(false);
  
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
  
  const roomUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/room/${roomId}` 
    : '';
    
  const copyRoomLink = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar - Room Info */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold truncate text-foreground">
            {roomName ? roomName : 'Social Music Room'}
          </h1>
          <div className="text-sm mt-1">
            {connected ? (
              <span className="inline-flex items-center text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-secondary mr-2"></span>
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center text-red-500">
                <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                Disconnected
              </span>
            )}
          </div>
        </div>
        
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              <p className="text-sm text-muted-foreground">Share this link:</p>
            </div>
          </div>
          <div className="flex items-center">
            <p className="font-mono text-xs bg-muted p-2 rounded-l text-foreground truncate flex-1">
              {roomUrl}
            </p>
            <button 
              onClick={copyRoomLink}
              className="flex items-center bg-muted hover:bg-accent text-foreground px-2 py-2 rounded-r border-l border-border"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
        
        {/* Profile Section */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold mb-2 text-foreground">Your Profile</h3>
          <div className="flex items-center">
            <div className="relative mr-3 flex-shrink-0">
              <div 
                className="w-12 h-12 rounded-full overflow-hidden cursor-pointer border-2 border-primary"
                onClick={() => setEditingAvatar(true)}
              >
                <img 
                  src={`/avatars/${avatarId}.png`} 
                  alt="Your Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button 
                className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                onClick={() => setEditingAvatar(true)}
              >
                ✎
              </button>
            </div>
            
            <div className="min-w-0 flex-1">
              <UsernameEditor 
                currentUsername={username} 
                onUsernameChange={handleUsernameChange}
                showYouIndicator={false}
              />
            </div>
          </div>
          
          {/* Avatar selector dialog */}
          {editingAvatar && (
            <div className="mt-3">
              <div className="bg-accent rounded-lg p-3">
                <h4 className="text-sm font-semibold mb-2 text-foreground">Select Avatar</h4>
                
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {['avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 
                    'avatar6', 'avatar7', 'avatar8', 'avatar9', 'avatar10'].map((avId) => (
                    <div 
                      key={avId}
                      className={`
                        w-10 h-10 rounded-full overflow-hidden cursor-pointer
                        ${avId === avatarId ? 'ring-2 ring-primary' : 'ring-1 ring-muted hover:ring-secondary'}
                        transition-all
                      `}
                      onClick={() => {
                        setAvatarId(avId);
                        if (handleAvatarChange) handleAvatarChange(avId);
                      }}
                    >
                      <img 
                        src={`/avatars/${avId}.png`} 
                        alt={`Avatar ${avId}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setEditingAvatar(false)}
                    className="px-3 py-1 text-sm bg-muted hover:bg-accent-foreground/10 text-foreground rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setEditingAvatar(false)}
                    className="px-3 py-1 text-sm bg-primary hover:bg-primary-hover text-white rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Users List */}
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-sm text-muted-foreground mb-2">Users in Room ({roomState.users.length}):</p>
          <ul className="space-y-1">
            {Array.isArray(roomState.users) && roomState.users.map((user, index) => (
              <li 
                key={`user-${user.clientId}`} 
                className="flex items-center text-foreground py-1"
              >
                <div className="relative mr-3 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img 
                      src={`/avatars/${user.avatarId || 'avatar1'}.png`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span 
                    className="h-3 w-3 rounded-full bg-green-500 absolute bottom-0 right-0 border border-card status-tooltip-trigger outline-none" 
                    data-tooltip-id={`status-tooltip-${index}`}
                    data-tooltip-place="top"
                    tabIndex={-1}
                  ></span>
                  <Tooltip 
                    id={`status-tooltip-${index}`} 
                    content="Active" 
                    place="top" 
                    positionStrategy="fixed"
                    offset={5}
                    className="status-tooltip"
                  />
                </div>
                
                <div className="truncate min-w-0 flex-1 flex items-center py-0.5">
                  <div className="flex flex-grow truncate min-w-0 items-center">
                    <span className="truncate max-w-[120px] inline-block leading-none text-foreground" title={user.username}>
                      {user.username}
                    </span>
                    
                    {user.isRoomOwner && (
                      <span 
                        className="text-yellow-500 ml-1 flex-shrink-0 inline-flex items-center status-tooltip-trigger" 
                        style={{ position: 'relative', top: '1px' }}
                        data-tooltip-id="room-owner-tooltip"
                      >
                        👑
                      </span>
                    )}
                    
                    {user.clientId === clientId && 
                      <span className="ml-1 text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">(You)</span>
                    }
                  </div>
                </div>
              </li>
            ))}
          </ul>
          
          <Tooltip 
            id="room-owner-tooltip" 
            content="Room Owner" 
            place="top" 
            positionStrategy="fixed"
            offset={5}
            className="status-tooltip"
          />
        </div>
        
        {/* Audio Controls Placeholder for future implementation */}
        <div className="p-4 border-t border-border">
          <h3 className="text-sm font-semibold mb-2 text-foreground">Audio Controls</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Volume</span>
            <input type="range" className="w-32" />
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Player Controls taking most space */}
        <div className="flex-grow" style={{ minHeight: "60vh" }}>
          <PlayerControls
            currentTrack={roomState.currentTrack}
            queue={roomState.queue}
            onPlaybackUpdate={updatePlayback}
            onUpdateQueue={updateQueue}
          />
        </div>
        
        {/* Queue at bottom */}
        <div className="flex-none">
          <Queue
            queue={roomState.queue}
            onUpdateQueue={updateQueue}
          />
        </div>
      </div>
      
      {/* Right Sidebar - Chat */}
      <div className="w-80 bg-card border-l border-border h-screen flex flex-col overflow-hidden">
        {/* Style the container to take full height, no padding to avoid gaps */}
        <div className="h-full flex flex-col"> 
          {/* Apply styles to container instead of directly to ChatBox */}
          <div className="flex-1 flex flex-col h-full">
            <ChatBox
              messages={roomState.chatHistory}
              onSendMessage={sendChatMessage}
              username={username}
              clientId={clientId}
              avatarId={avatarId}
              roomName={roomName || 'the room'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}