// hooks/useSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { EventType, RoomState, ChatMessage, UserInfo, QueueItem } from '../types';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Map for tracking message requests
const pendingMessageRequests = new Map();

// Helper function to log debug info
function log(message: string, data?: any) {
  console.log(`[Socket] ${message}`, data || '');
}

// Helper function to normalize user objects during transition
const normalizeUserObject = (user: any): UserInfo | null => {
  if (!user) return null;
  
  // Handle all possible formats during the transition
  return {
    clientId: user.clientId,
    username: user.username || 'Unknown User',
    avatarId: user.avatarId || 'avatar1',
    isRoomOwner: !!user.isRoomOwner
  };
};

export function useSocket(roomId: string, username: string, clientId: string, avatarId: string = 'avatar1') {
  // Basic input validation - return dummy implementation if missing input
  const hasRequiredValues = Boolean(roomId && username && clientId);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>({
    queue: [],
    chatHistory: [],
    users: [],
    roomName: '',
    hasMoreMessages: false
  });
  
  // Use refs to keep track of current values in callbacks
  const usernameRef = useRef(username);
  const clientIdRef = useRef(clientId);
  const roomIdRef = useRef(roomId);
  const avatarIdRef = useRef(avatarId);
  const socketRef = useRef<Socket | null>(null);
  
  // Track initialization to prevent duplicate connections
  const isInitializedRef = useRef(false);
  const isUnmountingRef = useRef(false);

  // Update refs when props change
  useEffect(() => {
    if (!hasRequiredValues) return;
    
    const usernameChanged = usernameRef.current !== username;
    const clientIdChanged = clientIdRef.current !== clientId;
    const roomIdChanged = roomIdRef.current !== roomId;
    const avatarIdChanged = avatarIdRef.current !== avatarId;
    
    // Update refs
    if (usernameChanged) {
      log(`Updating usernameRef from ${usernameRef.current} to ${username}`);
      usernameRef.current = username;
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
    if (isInitializedRef.current && (roomIdChanged || (usernameChanged && clientIdChanged))) {
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
  }, [username, clientId, roomId, avatarId, hasRequiredValues]);
  
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
      if (updates.roomName !== undefined) newState.roomName = updates.roomName;

      // Special handling for chat history
      if (updates.chatHistory !== undefined) {
        // If we're getting a new chat history, trust the server data
        // The server should be retrieving the complete history from the database
        newState.chatHistory = updates.chatHistory;
        
        // Optional: Keep a minimal check to prevent empty arrays if you're concerned
        if (updates.chatHistory.length === 0 && prevState.chatHistory.length > 0) {
          console.warn('Server sent empty chat history. Keeping existing messages.');
          newState.chatHistory = prevState.chatHistory;
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
        username: usernameRef.current,
        clientId: clientIdRef.current,
        avatarId: avatarIdRef.current,
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
    
    log(`Joining room ${roomIdRef.current} as ${usernameRef.current} (${clientIdRef.current})`);
    
    // Join room with username, clientId, and avatarId
    socket.emit(EventType.USER_JOIN, { 
      roomId: roomIdRef.current, 
      username: usernameRef.current, 
      clientId: clientIdRef.current,
      avatarId: avatarIdRef.current
    });
    
    // Request initial sync
    log('Requesting initial sync');
    socket.emit(EventType.SYNC_REQUEST, { 
      roomId: roomIdRef.current,
      username: usernameRef.current,
      clientId: clientIdRef.current,
      avatarId: avatarIdRef.current,
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
      
      // Join room
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
      if (roomIdRef.current && usernameRef.current) {
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

    socketIo.on(EventType.SYNC_RESPONSE, (data) => {
      log(`Received sync response with ${data.payload.queue?.length || 0} queue items and ${data.payload.users?.length || 0} users`);
      
      // Process user list from server
      const userList = data.payload.users || [];
      const normalizedUserList = userList.map(normalizeUserObject).filter(Boolean) as UserInfo[];
      
      // Process chat history - accept it directly from the server
      const processedChatHistory = (data.payload.chatHistory || []).map((msg: any) => {
        // Find the current username for this clientId from the normalized user list
        const userInfo = normalizedUserList.find((user) => user.clientId === msg.clientId);
        
        // Normalize the message format
        return {
          clientId: msg.clientId,
          username: userInfo?.username || msg.username || 'Unknown User',
          content: msg.content,
          timestamp: msg.timestamp,
          avatarId: userInfo?.avatarId || msg.avatarId || 'avatar1',
        };
      });
      
      // Apply all updates directly
      setRoomState(prevState => ({
        ...prevState,
        chatHistory: processedChatHistory && processedChatHistory.length > 0
          ? processedChatHistory
          : prevState.chatHistory,
        currentTrack: data.payload.currentTrack,
        queue: data.payload.queue || [],
        users: normalizedUserList,
        roomName: data.payload.roomName || '',
        hasMoreMessages: !!data.payload.hasMoreMessages
      }));
    });

    // Handle chat messages
    socketIo.on(EventType.CHAT_MESSAGE, (data) => {
      log(`Received chat message from ${data.username} (${data.clientId})`);
      
      // Add to chat history
      setRoomState(prevState => ({
        ...prevState,
        chatHistory: [
          ...prevState.chatHistory,
          {
            username: data.username,
            content: data.payload.content,
            timestamp: data.timestamp,
            clientId: data.clientId,
            avatarId: data.avatarId || 'avatar1'
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
      log(`User joined: ${data.username} (${data.clientId})`);
      log(`Raw USER_JOIN data: ${JSON.stringify(data)}`);
      
      // Normalize the user data
      const normalizedUser = normalizeUserObject({
        username: data.username,
        clientId: data.clientId,
        avatarId: data.avatarId || data.payload?.avatarId || 'avatar1',
        isRoomOwner: data.isRoomOwner || data.payload?.isRoomOwner || false
      });
      
      if (!normalizedUser) return;
      
      // Add new user to the users array if not already present
      setRoomState(prevState => {
        // Check if this user's clientId is already in the list
        const existingUserIndex = prevState.users.findIndex(user => 
          user.clientId === normalizedUser.clientId
        );
        
        if (existingUserIndex >= 0) {
          // User already exists, update their info
          const updatedUsers = [...prevState.users];
          updatedUsers[existingUserIndex] = normalizedUser;
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
              normalizedUser
            ]
          };
        }
      });
    });

    // Handle user leave
    socketIo.on(EventType.USER_LEAVE, (data) => {
      log(`User left: ${data.username} (${data.clientId})`);
      
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
              log(`Updating user in state: ${user.username} -> ${data.payload.newUsername}`);
              return {
                ...user,
                username: data.payload.newUsername,
                // Update avatar if provided
                ...(data.payload.avatarId ? { avatarId: data.payload.avatarId } : {})
              };
            }
            return user;
          });
          
          // Log updated users for debugging
          log(`Updated users: ${JSON.stringify(updatedUsers)}`);
          
          // 2. Update all chat messages from this client to show the new username
          const updatedChatHistory = prevState.chatHistory.map(msg => {
            if (msg.clientId === data.payload.clientId) {
              log(`Updating message from ${msg.username} to ${data.payload.newUsername}`);
              return {
                ...msg,
                username: data.payload.newUsername
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
            username: usernameRef.current, 
            clientId: clientIdRef.current,
            avatarId: avatarIdRef.current,
            timestamp: Date.now(),
            payload: {}
          });
        }
      }, 300);
    });
    
    // Handle avatar changes
    socketIo.on(EventType.AVATAR_CHANGE, (data) => {
      log(`Avatar change event received: ${data.payload.oldAvatarId} -> ${data.payload.newAvatarId} (${data.payload.clientId})`);
      
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
              log(`Updating avatar in state: ${user.avatarId} -> ${data.payload.newAvatarId}`);
              return {
                ...user,
                avatarId: data.payload.newAvatarId
              };
            }
            return user;
          });
          
          // Update all chat messages from this client to show the new avatar
          const updatedChatHistory = prevState.chatHistory.map(msg => {
            if (msg.clientId === data.payload.clientId) {
              return {
                ...msg,
                avatarId: data.payload.newAvatarId
              };
            }
            return msg;
          });
          
          return {
            ...prevState,
            users: updatedUsers,
            chatHistory: updatedChatHistory
          };
        });
      }
    });

    // Add to the setupSocketHandlers function, in the same area where other socket events are handled
    socketIo.on('LOAD_MORE_MESSAGES_RESPONSE', (data: any) => {
      log(`Received older messages: ${data.payload.messages?.length || 0} messages for page ${data.payload.page}`);
      
      // Resolve the promise with the messages
      if (data.payload.requestId && pendingMessageRequests.has(data.payload.requestId)) {
        const resolver = pendingMessageRequests.get(data.payload.requestId);
        if (resolver) {
          // Important: call the resolver with the messages array
          resolver(data.payload.messages || []);
          pendingMessageRequests.delete(data.payload.requestId);
        } else {
          log('Resolver function not found for request ID:', data.payload.requestId);
        }
      } else {
        log('Request ID not found in pending requests:', data.payload.requestId);
      }
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
    
    log(`Initializing with valid data: roomId=${roomIdRef.current}, username=${usernameRef.current}, clientId=${clientIdRef.current}, avatarId=${avatarIdRef.current}`);
    
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
  const reconnect = useCallback((newUsername: string, newClientId: string, newAvatarId: string) => {
    log(`Reconnecting with new username: ${newUsername} (client ${newClientId}, avatar ${newAvatarId})`);
    
    // Update refs
    usernameRef.current = newUsername;
    clientIdRef.current = newClientId;
    avatarIdRef.current = newAvatarId;
    
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
        username: usernameRef.current,
        clientId: clientIdRef.current,
        avatarId: avatarIdRef.current,
        payload: { content },
        timestamp: Date.now()
      });
    } else {
      log('Cannot send chat message: not connected');
    }
  }, []);

  // Helper for loading additional chat messages
  const loadMoreMessages = useCallback((page: number): Promise<ChatMessage[]> => {
    return new Promise((resolve) => {
      if (socketRef.current && socketRef.current.connected) {
        const requestId = `msg_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Store the resolver function to call when response arrives
        pendingMessageRequests.set(requestId, resolve);
        
        log(`Requesting older messages, page ${page}`);
        socketRef.current.emit('LOAD_MORE_MESSAGES', {
          roomId: roomIdRef.current,
          username: usernameRef.current,
          clientId: clientIdRef.current,
          avatarId: avatarIdRef.current,
          payload: { page, requestId },
          timestamp: Date.now()
        });
      } else {
        resolve([]); // Resolve with empty array if not connected
      }
    });
  }, []);

  // Helper for loading older chat messages
  const loadOlderMessages = useCallback(async (page: number) => {
    const olderMessages = await loadMoreMessages(page);
    if (olderMessages && olderMessages.length > 0) {
      // Update the roomState directly here
      setRoomState(prevState => ({
        ...prevState,
        chatHistory: [...olderMessages, ...prevState.chatHistory]
      }));
      return olderMessages;
    }
    return [];
  }, [loadMoreMessages]);

  // Helper for updating playback state
  const updatePlayback = useCallback((currentTime: number, isPlaying: boolean, trackId: string, source: 'youtube' | 'soundcloud' = 'youtube') => {
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending playback update: ${trackId} (${isPlaying ? 'playing' : 'paused'} at ${currentTime}s)`);
      socketRef.current.emit(EventType.PLAYBACK_UPDATE, {
        roomId: roomIdRef.current,
        username: usernameRef.current,
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
        username: usernameRef.current,
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
    if (newUsername === usernameRef.current) {
      log("Username unchanged, ignoring");
      return;
    }
    
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending username change: ${usernameRef.current} -> ${newUsername}`);
      
      // Store old username before updating
      const oldUsername = usernameRef.current;
      
      // Update our ref immediately
      usernameRef.current = newUsername;
      
      // Update local state immediately without waiting for server response
      setRoomState(prevState => {
        // Log current state for debugging
        log(`Current users before update: ${JSON.stringify(prevState.users)}`);
        
        // Update our entry in the users array
        const updatedUsers = prevState.users.map(user => {
          if (user.clientId === clientIdRef.current) {
            log(`Updating user in local state: ${user.username} -> ${newUsername}`);
            return {
              ...user,
              username: newUsername
            };
          }
          return user;
        });
        
        // Log updated users for debugging
        log(`Updated users: ${JSON.stringify(updatedUsers)}`);
        
        // Update chat messages from this client
        const updatedChatHistory = prevState.chatHistory.map(msg => {
          if (msg.clientId === clientIdRef.current) {
            log(`Updating message from ${msg.username} to ${newUsername}`);
            return {
              ...msg,
              username: newUsername
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
        username: oldUsername, // Use old username in message
        clientId: clientIdRef.current,
        avatarId: avatarIdRef.current,
        payload: { 
          oldUsername, 
          newUsername,
          avatarId: avatarIdRef.current,
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
            username: newUsername, // Use new username here
            clientId: clientIdRef.current,
            avatarId: avatarIdRef.current,
            timestamp: Date.now(),
            payload: {}
          });
        }
      }, 500); // Short delay to allow server to process username change
    } else {
      log('Cannot change username: not connected');
    }
  }, []);
  
  // Helper for changing avatar
  const changeAvatar = useCallback((newAvatarId: string) => {
    if (newAvatarId === avatarIdRef.current) {
      log("Avatar unchanged, ignoring");
      return;
    }
    
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending avatar change: ${avatarIdRef.current} -> ${newAvatarId}`);
      
      // Store old avatar before updating
      const oldAvatarId = avatarIdRef.current;
      
      // Update our ref immediately
      avatarIdRef.current = newAvatarId;
      
      // Update local state immediately
      setRoomState(prevState => {
        // Update our entry in the users array
        const updatedUsers = prevState.users.map(user => {
          if (user.clientId === clientIdRef.current) {
            log(`Updating avatar in local state: ${user.avatarId} -> ${newAvatarId}`);
            return {
              ...user,
              avatarId: newAvatarId
            };
          }
          return user;
        });
        
        // Update chat messages from this client
        const updatedChatHistory = prevState.chatHistory.map(msg => {
          if (msg.clientId === clientIdRef.current) {
            return {
              ...msg,
              avatarId: newAvatarId
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
      
      // Send the avatar change event
      socketRef.current.emit(EventType.AVATAR_CHANGE, {
        roomId: roomIdRef.current,
        username: usernameRef.current,
        clientId: clientIdRef.current,
        avatarId: newAvatarId,
        payload: { 
          oldAvatarId, 
          newAvatarId,
          username: usernameRef.current, 
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
            username: usernameRef.current,
            clientId: clientIdRef.current,
            avatarId: newAvatarId,
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
    reconnect,
    loadMoreMessages,
    loadOlderMessages
  };
}