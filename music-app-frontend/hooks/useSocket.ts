// hooks/useSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { EventType, RoomState, ChatMessage, UserInfo, QueueItem } from '../types';
import { userInfo } from 'os';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper function to log debug info
function log(message: string, data?: any) {
  console.log(`[Socket] ${message}`, data || '');
}

export function useSocket(roomId: string, userId: string, clientId: string, avatarId: string) {
  // Basic input validation - return dummy implementation if missing input
  const hasRequiredValues = Boolean(roomId && userId && clientId && avatarId);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>({
    queue: [],
    chatHistory: [],
    users: []
  });
  
  // Use refs to keep track of current values in callbacks
  const userIdRef = useRef(userId);
  const clientIdRef = useRef(clientId);
  const roomIdRef = useRef(roomId);
  const socketRef = useRef<Socket | null>(null);
  const avatarIdRef = useRef(avatarId);
  
  // Track initialization to prevent duplicate connections
  const isInitializedRef = useRef(false);
  const isUnmountingRef = useRef(false);

  // Update refs when props change
  useEffect(() => {
    if (!hasRequiredValues) return;
    
    const userIdChanged = userIdRef.current !== userId;
    const clientIdChanged = clientIdRef.current !== clientId;
    const roomIdChanged = roomIdRef.current !== roomId;
    const avatarIdChanged = avatarIdRef.current !== avatarId;
    
    // Update refs
    if (userIdChanged) {
      log(`Updating userIdRef from ${userIdRef.current} to ${userId}`);
      userIdRef.current = userId;
    }
    
    if (clientIdChanged) {
      log(`Updating clientIdRef from ${clientIdRef.current} to ${clientId}`);
      clientIdRef.current = clientId;
    }
    
    if (roomIdChanged) {
      log(`Updating roomIdRef from ${roomIdRef.current} to ${roomId}`);
      roomIdRef.current = roomId;
    }

    if (avatarIdChanged) {
      log(`Updating avatarIdRef from ${avatarIdRef.current} to ${avatarId}`);
      avatarIdRef.current = avatarId;
    }
    
    // If we already have a socket connection and the room has changed,
    // or important user info has changed, we need to reinitialize
    if (isInitializedRef.current && (roomIdChanged || (userIdChanged && clientIdChanged))) {
      log('Critical parameters changed, need to reinitialize connection');
      isInitializedRef.current = false;
      
      // Clean up existing socket
      if (socketRef.current) {
        log('Disconnecting existing socket due to parameter changes');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    }
  }, [userId, clientId, roomId, hasRequiredValues]);
  
  // Track unmounting to prevent unnecessary disconnections
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  // Helper function to update the room state
  const updateRoomState = useCallback((updates: Partial<RoomState>) => {
    setRoomState(prevState => {
      // Create a new state object with existing values
      const newState = { ...prevState };
      
      // Only update fields that were explicitly provided
      if (updates.queue !== undefined) newState.queue = updates.queue;
      if (updates.users !== undefined) newState.users = updates.users;
      if (updates.currentTrack !== undefined) newState.currentTrack = updates.currentTrack;
      
      // Special handling for chat history to ensure we don't lose messages
      if (updates.chatHistory !== undefined) {
        // If we're getting a new chat history, make sure it's not empty before replacing
        if (updates.chatHistory.length > 0 || prevState.chatHistory.length === 0) {
          newState.chatHistory = updates.chatHistory;
        } else {
          // Log a warning if we're about to replace chat with empty array
          console.warn('Prevented replacing chat history with empty array', {
            current: prevState.chatHistory.length,
            new: updates.chatHistory.length
          });
        }
      }
      
      return newState;
    });
  }, []);

  // Function to request a full sync from the server
  const requestFullSync = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      log('Requesting full room sync');
      socketRef.current.emit(EventType.SYNC_REQUEST, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        timestamp: Date.now(),
        payload: {}
      });
    }
  }, []);

  // Set up periodic sync
  useEffect(() => {
    const syncInterval = setInterval(requestFullSync, 30000); // Sync every 30 seconds
    return () => clearInterval(syncInterval);
  }, [requestFullSync]);

  // Function to send join room event
  const sendJoinRoom = useCallback((socket: Socket) => {
    if (!socket.connected) {
      log('Cannot join room: socket not connected');
      return false;
    }
    
    log(`Joining room ${roomIdRef.current} as ${userIdRef.current} (${clientIdRef.current})`);
    
    // Join room with both userId and clientId
    socket.emit(EventType.USER_JOIN, { 
      roomId: roomIdRef.current, 
      userId: userIdRef.current, 
      clientId: clientIdRef.current 
    });
    
    // Request initial sync
    log('Requesting initial sync');
    socket.emit(EventType.SYNC_REQUEST, { 
      roomId: roomIdRef.current,
      userId: userIdRef.current,
      clientId: clientIdRef.current,
      timestamp: Date.now(),
      payload: {}
    });
    
    return true;
  }, []);

  // Setup socket handlers
  const setupSocketHandlers = useCallback((socketIo: Socket) => {
    log('Setting up socket handlers');
    
    socketIo.on('connect', () => {
      log(`Connected to WebSocket server (${socketIo.id})`);
      setConnected(true);
      
      // Join room with both userId and clientId
      sendJoinRoom(socketIo);
    });

    socketIo.on('disconnect', (reason) => {
      log(`Disconnected from WebSocket server. Reason: ${reason}`);
      setConnected(false);
    });

    socketIo.on('reconnect', (attemptNumber) => {
      log(`Reconnected to server after ${attemptNumber} attempts`);
      setConnected(true);
      
      // Re-join room after reconnection
      if (roomIdRef.current && userIdRef.current) {
        sendJoinRoom(socketIo);
      }
    });

    socketIo.on('reconnect_attempt', (attemptNumber) => {
      log(`Attempting to reconnect: attempt #${attemptNumber}`);
    });

    socketIo.on('reconnect_error', (error) => {
      log(`Reconnection error: ${error}`);
    });

    socketIo.on('connect_error', (error) => {
      log(`Connection error: ${error.message}`);
      setConnected(false);
    });

    // Handle room sync
    socketIo.on(EventType.SYNC_RESPONSE, (data) => {
      console.log('Raw SYNC_RESPONSE data:', data);
      console.log('User data in SYNC_RESPONSE:', data.payload.users);
      log(`Received sync response with ${data.payload.queue?.length || 0} queue items and ${data.payload.users?.length || 0} users`);
      
      // Process user list from server (already in UserInfo format)
      const userList = data.payload.users || [];
      
      // Log user list for debugging
      log(`Sync received users: ${JSON.stringify(userList)}`);
      
      // Process chat history to ensure usernames are up to date
      const processedChatHistory = (data.payload.chatHistory || []).map((msg: ChatMessage) => {
        // Find the current username for this clientId from the user list
        const userInfo = userList.find((user: UserInfo) => user.clientId === msg.clientId);
        if (userInfo && userInfo.userId !== msg.userId) {
          log(`Updating message username from ${msg.userId} to ${userInfo.userId} based on current user list`);
          return {
            ...msg,
            userId: userInfo.userId
          };
        }
        return msg;
      });
      
      // Apply all updates in one state change to minimize re-renders
      setRoomState(prevState => {
        // Log current state for debugging
        log(`Current state before sync update - users: ${JSON.stringify(prevState.users)}`);
        
        // Make sure our own username is correct in the user list
        const updatedUserList = userList.map((user: UserInfo) => {
          if (user.clientId === clientIdRef.current && user.userId !== userIdRef.current) {
            log(`Correcting our own username in sync response: ${user.userId} -> ${userIdRef.current}`);
            return {
              ...user,
              userId: userIdRef.current
            };
          }
          return user;
        });
        
        // Log updated user list for debugging
        log(`Updated user list after sync: ${JSON.stringify(updatedUserList)}`);
        
        return {
          ...prevState,
          currentTrack: data.payload.currentTrack,
          queue: data.payload.queue || [],
          chatHistory: processedChatHistory.length > 0 ? processedChatHistory : prevState.chatHistory,
          users: updatedUserList
        };
      });
    });

    // Handle chat messages
    socketIo.on(EventType.CHAT_MESSAGE, (data) => {
      log(`Received chat message from ${data.userId} (${data.clientId})`);
      
      const userId = typeof data.userId === 'object' && data.userId !== null && 'userId' in data.userId 
      ? data.userId.userId 
      : typeof data.userId === 'string' 
        ? data.userId 
        : 'Unknown';

      // Add to chat history without losing existing messages
      setRoomState(prevState => ({
        ...prevState,
        chatHistory: [
          ...prevState.chatHistory,
          {
            userId,
            content: data.payload.content,
            timestamp: data.timestamp,
            clientId: data.clientId
          }
        ]
      }));
    });

    // Handle queue updates
    socketIo.on(EventType.QUEUE_UPDATE, (data) => {
      log(`Received queue update with ${data.payload.queue?.length || 0} items`);
      
      // Update queue without affecting other state
      updateRoomState({
        queue: data.payload.queue || []
      });
    });

    // Handle playback updates
    socketIo.on(EventType.PLAYBACK_UPDATE, (data) => {
      log(`Received playback update for track ${data.payload.trackId}`);
      
      if (data.payload.trackId) {
        // Update current track without affecting other state
        updateRoomState({
          currentTrack: {
            id: data.payload.trackId,
            source: data.payload.source || 'youtube',
            startTime: data.payload.currentTime || 0,
            isPlaying: data.payload.isPlaying
          }
        });
      }
    });

    // Handle user join
    socketIo.on(EventType.USER_JOIN, (data) => {
      
      console.log('Raw USER_JOIN data:', data);
      
      // Add new user to the users array if not already present
      setRoomState(prevState => {
        // Check if this user's clientId is already in the list
        const existingUserIndex = prevState.users.findIndex(user => 
          user.clientId === data.clientId
        );
        
        // Get the avatar ID from the event payload or use a default
        const userAvatarId = data.avatarId || 'avatar1'; // Default if not provided
        
        if (existingUserIndex >= 0) {
          // User already exists, update their info
          const updatedUsers = [...prevState.users];
          updatedUsers[existingUserIndex] = {
            userId: data.userId,
            clientId: data.clientId,
            avatarId: userAvatarId // Include the avatar ID
          };
          return {
            ...prevState,
            users: updatedUsers
          };
        } else {
          // Add new user
          return {
            ...prevState,
            users: [
              ...prevState.users,
              {
                userId: data.userId,
                clientId: data.clientId,
                avatarId: userAvatarId // Include the avatar ID
              }
            ]
          };
        }
      });
    });

    // Handle user leave
    socketIo.on(EventType.USER_LEAVE, (data) => {
      log(`User left: ${data.userId} (${data.clientId})`);
      
      // Remove the user from our state
      setRoomState(prevState => ({
        ...prevState,
        users: prevState.users.filter(user => user.clientId !== data.clientId)
      }));
    });
    
    // Handle username changes
    socketIo.on(EventType.USERNAME_CHANGE, (data) => {
      log(`Username change event received: ${data.payload.oldUsername} -> ${data.payload.newUsername} (${data.payload.clientId})`);
      
      // Check if this is our own username change to avoid duplicate updates
      const isOwnUsernameChange = data.payload.clientId === clientIdRef.current;
      if (isOwnUsernameChange) {
        log(`This is our own username change, already updated locally`);
      } else {
        // This is another user's username change
        log(`Updating state for another user's username change`);
        
        setRoomState(prevState => {
          // Log current users for debugging
          log(`Current users before update: ${JSON.stringify(prevState.users)}`);
          
          // 1. Update the user entry in the users array
          const updatedUsers = prevState.users.map(user => {
            if (user.clientId === data.payload.clientId) {
              log(`Updating user in state: ${user.userId} -> ${data.payload.newUsername}`);
              return {
                ...user,
                userId: data.payload.newUsername
              };
            }
            return user;
          });
          
          // Log updated users for debugging
          log(`Updated users: ${JSON.stringify(updatedUsers)}`);
          
          // 2. Update all chat messages from this client to show the new username
          const updatedChatHistory = prevState.chatHistory.map(msg => {
            if (msg.clientId === data.payload.clientId) {
              log(`Updating message from ${msg.userId} to ${data.payload.newUsername}`);
              return {
                ...msg,
                userId: data.payload.newUsername
              };
            }
            return msg;
          });
          
          // 3. Return updated state
          return {
            ...prevState,
            users: updatedUsers,
            chatHistory: updatedChatHistory
          };
        });
      }
      
      // Request a sync to ensure we have the latest state
      setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          log('Requesting sync after username change event');
          socketRef.current.emit(EventType.SYNC_REQUEST, {
            roomId: roomIdRef.current,
            userId: userIdRef.current, 
            clientId: clientIdRef.current,
            timestamp: Date.now(),
            payload: {}
          });
        }
      }, 300);
    });

    // Avatar change event handler
    socketIo.on(EventType.AVATAR_CHANGE, (data) => {
      log(`Avatar change event received: ${data.payload.clientId} -> ${data.payload.newAvatarId}`);
      
      // Check if this is our own avatar change to avoid duplicate updates
      const isOwnAvatarChange = data.payload.clientId === clientIdRef.current;
      if (isOwnAvatarChange) {
        log(`This is our own avatar change, already updated locally`);
      } else {
        // This is another user's avatar change
        log(`Updating state for another user's avatar change`);
        
        setRoomState(prevState => {
          // Update the user entry in the users array
          const updatedUsers = prevState.users.map(user => {
            if (user.clientId === data.payload.clientId) {
              log(`Updating user avatar in state: ${user.avatarId} -> ${data.payload.newAvatarId}`);
              return {
                ...user,
                avatarId: data.payload.newAvatarId
              };
            }
            return user;
          });
          
          return {
            ...prevState,
            users: updatedUsers
          };
        });
      }
      
      // Request a sync to ensure we have the latest state
      setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          log('Requesting sync after avatar change event');
          socketRef.current.emit(EventType.SYNC_REQUEST, {
            roomId: roomIdRef.current,
            userId: userIdRef.current, 
            clientId: clientIdRef.current,
            timestamp: Date.now(),
            payload: {}
          });
        }
      }, 300);
    });
    
    return socketIo;
  }, [sendJoinRoom, updateRoomState]);

  // Initialize or reinitialize socket connection
  useEffect(() => {
    // Skip initialization if any required values are missing
    if (!hasRequiredValues) {
      return;
    }
    
    // Skip if already initialized
    if (isInitializedRef.current) {
      return;
    }
    
    log(`Initializing with valid data: roomId=${roomIdRef.current}, userId=${userIdRef.current}, clientId=${clientIdRef.current}`);
    
    // Create socket with explicit options
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket'], // Use websocket only for more stability
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      query: {
        clientId: clientIdRef.current
      }
    });
    
    // Set up event handlers before connecting to ensure we catch all events
    const configuredSocket = setupSocketHandlers(socketIo);
    
    // Store references
    socketRef.current = configuredSocket;
    setSocket(configuredSocket);
    isInitializedRef.current = true;
    
    // If already connected (rare but possible), send join immediately
    if (configuredSocket.connected) {
      sendJoinRoom(configuredSocket);
    }
    
    // Add a fallback for single user scenarios
    const fallbackTimer = setTimeout(() => {
      if (roomState.users.length <= 1 && socketRef.current && socketRef.current.connected) {
        log('Single user detected, ensuring proper sync state');
        sendJoinRoom(socketRef.current);
      }
    }, 2000);
    
    // Cleanup function
    return () => {
      log('Cleaning up socket connection');
      clearTimeout(fallbackTimer);
      
      // Only perform full disconnect if component is unmounting
      if (isUnmountingRef.current) {
        log('Component unmounting - disconnecting socket');
        if (socketRef.current) {
          // Remove all listeners first to prevent memory leaks
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        isInitializedRef.current = false;
      }
    };
  }, [hasRequiredValues, setupSocketHandlers, sendJoinRoom, roomState.users.length]);

  // Manual reconnect helper (exposed to parent component)
  const reconnect = useCallback((newUsername: string, newClientId: string) => {
    log(`Reconnecting with new username: ${newUsername} (client ${newClientId})`);
    
    // Update refs
    userIdRef.current = newUsername;
    clientIdRef.current = newClientId;
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Reset initialization flag to force reconnection
    isInitializedRef.current = false;
    
    // Force re-render to trigger the initialization effect
    setConnected(false);
  }, []);
  
  // Manual disconnect helper
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      log('Manually disconnecting socket');
      socketRef.current.disconnect();
      isInitializedRef.current = false;
    }
  }, []);
  
  // Helper for sending chat messages
  const sendChatMessage = useCallback((content: string) => {
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending chat message: ${content.substring(0, 20)}...`);
      socketRef.current.emit(EventType.CHAT_MESSAGE, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        payload: { content },
        timestamp: Date.now()
      });
    } else {
      log('Cannot send chat message: not connected');
    }
  }, []);

  // Helper for updating playback state
  const updatePlayback = useCallback((currentTime: number, isPlaying: boolean, trackId: string, source: 'youtube' | 'soundcloud' = 'youtube') => {
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending playback update: ${trackId} (${isPlaying ? 'playing' : 'paused'} at ${currentTime}s)`);
      socketRef.current.emit(EventType.PLAYBACK_UPDATE, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        payload: { currentTime, isPlaying, trackId, source },
        timestamp: Date.now()
      });
    } else {
      log('Cannot update playback: not connected');
    }
  }, []);

  // Helper for updating queue
  const updateQueue = useCallback((queue: QueueItem[]) => {
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending queue update with ${queue.length} items`);
      socketRef.current.emit(EventType.QUEUE_UPDATE, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        payload: { queue },
        timestamp: Date.now()
      });
    } else {
      log('Cannot update queue: not connected');
    }
  }, []);

  // Helper for changing username
  const changeUsername = useCallback((newUsername: string) => {
    if (newUsername === userIdRef.current) {
      log("Username unchanged, ignoring");
      return;
    }
    
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending username change: ${userIdRef.current} -> ${newUsername}`);
      
      // Store old username before updating
      const oldUsername = userIdRef.current;
      
      // Update our ref immediately
      userIdRef.current = newUsername;
      
      // Update local state immediately without waiting for server response
      setRoomState(prevState => {
        // Log current state for debugging
        log(`Current users before update: ${JSON.stringify(prevState.users)}`);
        
        // Update our entry in the users array
        const updatedUsers = prevState.users.map(user => {
          if (user.clientId === clientIdRef.current) {
            log(`Updating user in local state: ${user.userId} -> ${newUsername}`);
            return {
              ...user,
              userId: newUsername
            };
          }
          return user;
        });
        
        // Log updated users for debugging
        log(`Updated users: ${JSON.stringify(updatedUsers)}`);
        
        // Update chat messages from this client
        const updatedChatHistory = prevState.chatHistory.map(msg => {
          if (msg.clientId === clientIdRef.current) {
            log(`Updating message from ${msg.userId} to ${newUsername}`);
            return {
              ...msg,
              userId: newUsername
            };
          }
          return msg;
        });
        
        // Return updated state
        return {
          ...prevState,
          users: updatedUsers,
          chatHistory: updatedChatHistory
        };
      });
      
      // Send the username change event
      socketRef.current.emit(EventType.USERNAME_CHANGE, {
        roomId: roomIdRef.current,
        userId: oldUsername, // Use old username in message
        clientId: clientIdRef.current,
        payload: { 
          oldUsername, 
          newUsername,
          clientId: clientIdRef.current 
        },
        timestamp: Date.now()
      });
      
      // Request a sync after username change
      setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          log('Requesting sync after username change');
          socketRef.current.emit(EventType.SYNC_REQUEST, {
            roomId: roomIdRef.current,
            userId: newUsername, // Use new username here
            clientId: clientIdRef.current,
            timestamp: Date.now(),
            payload: {}
          });
        }
      }, 500); // Short delay to allow server to process username change
    } else {
      log('Cannot change username: not connected');
    }
  }, []);

  // Add this function after changeUsername:
  const changeAvatar = useCallback((newAvatarId: string) => {
    if (newAvatarId === avatarIdRef.current) {
      log("Avatar unchanged, ignoring");
      return;
    }
    
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending avatar change: ${avatarIdRef.current} -> ${newAvatarId}`);
      
      // Store old avatar ID before updating
      const oldAvatarId = avatarIdRef.current;
      
      // Update our ref immediately
      avatarIdRef.current = newAvatarId;
      
      // Update local state immediately without waiting for server response
      setRoomState(prevState => {
        // Update our entry in the users array
        const updatedUsers = prevState.users.map(user => {
          if (user.clientId === clientIdRef.current) {
            log(`Updating user avatar in local state: ${user.avatarId} -> ${newAvatarId}`);
            return {
              ...user,
              avatarId: newAvatarId
            };
          }
          return user;
        });
        
        return {
          ...prevState,
          users: updatedUsers
        };
      });
      
      // Send the avatar change event
      socketRef.current.emit(EventType.AVATAR_CHANGE, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        payload: { 
          oldAvatarId, 
          newAvatarId,
          clientId: clientIdRef.current 
        },
        timestamp: Date.now()
      });
      
      // Request a sync after avatar change
      setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          log('Requesting sync after avatar change');
          socketRef.current.emit(EventType.SYNC_REQUEST, {
            roomId: roomIdRef.current,
            userId: userIdRef.current,
            clientId: clientIdRef.current,
            timestamp: Date.now(),
            payload: {}
          });
        }
      }, 500);
    } else {
      log('Cannot change avatar: not connected');
    }
  }, []);

  return {
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
  };
}