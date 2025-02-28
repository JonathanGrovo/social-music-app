// hooks/useSocket.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { EventType, RoomState, ChatMessage } from '../types';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Helper type for tracking users
interface UserInfo {
  username: string;
  clientId: string;
}

// Add this temporary debug function at the top of useSocket.ts
function testDirectConnection() {
  console.warn('TESTING DIRECT SOCKET CONNECTION');
  const testSocket = io(SOCKET_URL || 'http://localhost:3000', { 
    transports: ['websocket', 'polling']
  });
  
  testSocket.on('connect', () => {
    console.warn('TEST SOCKET CONNECTED SUCCESSFULLY!');
  });
  
  testSocket.on('connect_error', (error) => {
    console.error('TEST SOCKET CONNECTION ERROR:', error.message);
  });
  
  // Auto-disconnect after 10 seconds
  setTimeout(() => {
    testSocket.disconnect();
    console.warn('TEST SOCKET DISCONNECTED');
  }, 10000);
}

// Call this function once when the module loads
testDirectConnection();

export function useSocket(roomId: string, userId: string, clientId: string) {
  // Add near the top of the hook
  const log = useCallback((message: string, data?: any) => {
    console.log(`[Socket Debug] ${message}`, data || '');
  }, []);
  
  // Basic input validation - return dummy implementation if missing input
  const hasRequiredValues = Boolean(roomId && userId && clientId);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>({
    queue: [],
    chatHistory: [],
    users: []
  });
  
  // Track user info with clientId as the key
  const userInfoMap = useRef<Map<string, UserInfo>>(new Map());
  
  // Track users by username when clientId isn't available
  const usernameSet = useRef<Set<string>>(new Set());
  
  // Use refs to keep track of current values in callbacks
  const userIdRef = useRef(userId);
  const clientIdRef = useRef(clientId);
  const roomIdRef = useRef(roomId);
  const socketRef = useRef<Socket | null>(null);
  
  // Batch updates to prevent multiple re-renders
  const pendingStateUpdates = useRef<Partial<RoomState> | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track initialization to prevent duplicate connections
  const isInitializedRef = useRef(false);

  // Add this with your other refs
  const isUnmountingRef = useRef(false);

  // Track unmounting to prevent unnecessary disconnections
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);
  
  // Update refs when props change
  useEffect(() => {
    if (!hasRequiredValues) return;
    
    const userIdChanged = userIdRef.current !== userId;
    const clientIdChanged = clientIdRef.current !== clientId;
    const roomIdChanged = roomIdRef.current !== roomId;
    
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
  }, [userId, clientId, roomId, log, hasRequiredValues]);
  
  // Apply batched state updates
  const applyPendingUpdates = useCallback(() => {
    if (pendingStateUpdates.current) {
      setRoomState(prev => ({
        ...prev,
        ...pendingStateUpdates.current
      }));
      pendingStateUpdates.current = null;
    }
  }, []);

  // Add near other callback methods
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
  }, [log]);

  // Add this effect near other useEffects
  useEffect(() => {
    const syncInterval = setInterval(requestFullSync, 30000); // Sync every 30 seconds
    return () => clearInterval(syncInterval);
  }, [requestFullSync]);

  const updateRoomState = useCallback((updates: Partial<RoomState>) => {
  setRoomState(prevState => ({
    ...prevState,
    queue: updates.queue ?? prevState.queue,
    chatHistory: updates.chatHistory ?? prevState.chatHistory,
    users: updates.users ?? prevState.users,
    currentTrack: updates.currentTrack ?? prevState.currentTrack
  }));
}, []);
  
  // Build a combined list of usernames from both tracking methods
  const getUserList = useCallback(() => {
    // Start with all usernames from userInfoMap
    const usersFromMap = Array.from(userInfoMap.current.values()).map(info => info.username);
    
    // Add any usernames from usernameSet that aren't already in the list
    const completeList = [...usersFromMap];
    
    usernameSet.current.forEach(username => {
      if (!completeList.includes(username)) {
        completeList.push(username);
      }
    });
    
    return completeList;
  }, []);
  
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
  }, [log]);

  // Setup socket handlers
  const setupSocketHandlers = useCallback((socketIo: Socket) => {
    log('Setting up socket handlers');
    
    socketIo.on('connect', () => {
      log(`Connected to WebSocket server (${socketIo.id})`);
      console.warn(`SOCKET DEBUG: Successfully connected to server with ID ${socketIo.id}`);
      setConnected(true);
      
      // Join room with both userId and clientId
      log(`Joining room ${roomIdRef.current} as ${userIdRef.current} (${clientIdRef.current})`);
      socketIo.emit(EventType.USER_JOIN, { 
        roomId: roomIdRef.current, 
        userId: userIdRef.current, 
        clientId: clientIdRef.current 
      });
      
      // Request initial sync
      log('Requesting initial sync');
      socketIo.emit(EventType.SYNC_REQUEST, { 
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        timestamp: Date.now(),
        payload: {}
      });
    });

    socketIo.on('disconnect', (reason) => {
      log(`Disconnected from WebSocket server. Reason: ${reason}`);
      console.warn(`SOCKET DEBUG: Disconnected from server. Reason: ${reason}`);
      setConnected(false);
    });

    socketIo.on('reconnect', (attemptNumber) => {
      console.warn(`SOCKET DEBUG: Reconnected to server after ${attemptNumber} attempts`);
      setConnected(true);
      
      // Re-join room after reconnection
      if (roomIdRef.current && userIdRef.current) {
        socketIo.emit(EventType.USER_JOIN, { 
          roomId: roomIdRef.current, 
          userId: userIdRef.current, 
          clientId: clientIdRef.current 
        });
      }
    });

    socketIo.on('reconnect_attempt', (attemptNumber) => {
      console.warn(`SOCKET DEBUG: Attempting to reconnect: attempt #${attemptNumber}`);
    });

    socketIo.on('reconnect_error', (error) => {
      console.warn(`SOCKET DEBUG: Reconnection error: ${error}`);
    });

    socketIo.on('reconnect_failed', () => {
      console.warn(`SOCKET DEBUG: Failed to reconnect after maximum attempts`);
    });

    socketIo.on('connect_error', (error) => {
      log(`Connection error: ${error.message}`);
      setConnected(false);
    });

    // Add near your other event handlers
    socketIo.on('error', (error) => {
      console.error(`SOCKET DEBUG: Server error: ${error}`);
    });

    // Listen for any events (if your socket.io allows this)
    socketIo.onAny((event, ...args) => {
      console.log(`SOCKET DEBUG: Received event ${event}`, args);
    });

    // Handle room sync
    socketIo.on(EventType.SYNC_RESPONSE, (data) => {
      log(`Received sync response with ${data.payload.queue?.length || 0} queue items`);
      
      // Handle user list
      if (data.payload.users) {
        // Update user info map with all users
        data.payload.users.forEach((userEntry: any) => {
          if (typeof userEntry === 'object' && userEntry.clientId && userEntry.username) {
            userInfoMap.current.set(userEntry.clientId, {
              username: userEntry.username,
              clientId: userEntry.clientId
            });
            usernameSet.current.add(userEntry.username);
          } else if (typeof userEntry === 'string') {
            usernameSet.current.add(userEntry);
          }
        });
      }
      
      // Get the complete user list
      const userList = getUserList();
      
      // Ensure chat history is preserved and mapped to current usernames
      let updatedChatHistory = data.payload.chatHistory || [];
      updatedChatHistory = updatedChatHistory.map((msg: ChatMessage) => {
        // If message has clientId, look up the current username for that clientId
        if (msg.clientId && userInfoMap.current.has(msg.clientId)) {
          return {
            ...msg,
            userId: userInfoMap.current.get(msg.clientId)!.username
          };
        }
        return msg;
      });
      
      // Apply all updates in one state change
      setRoomState({
        currentTrack: data.payload.currentTrack,
        queue: data.payload.queue || [],
        chatHistory: updatedChatHistory,
        users: userList
      });
    });

    // Handle chat messages
    socketIo.on(EventType.CHAT_MESSAGE, (data) => {
      log(`Received chat message from ${data.userId} (${data.clientId})`);
      
      // Store the user info
      if (data.clientId) {
        userInfoMap.current.set(data.clientId, {
          username: data.userId,
          clientId: data.clientId
        });
        usernameSet.current.add(data.userId);
      }
      
      // Preserve the existing chat history and add the new message
      setRoomState(prevState => {
        // Create a new array to trigger re-render
        const updatedChatHistory = [
          ...(prevState.chatHistory || []), 
          {
            userId: data.userId,
            content: data.payload.content,
            timestamp: data.timestamp,
            clientId: data.clientId
          }
        ];
        
        return {
          ...prevState,
          chatHistory: updatedChatHistory
        };
      });
    });

    // Handle queue updates
    socketIo.on(EventType.QUEUE_UPDATE, (data) => {
      log(`Received queue update with ${data.payload.queue?.length || 0} items`);
      
      // Only update queue, avoid re-rendering everything
      updateRoomState({
        queue: data.payload.queue || []
      });
    });

    // Handle playback updates
    socketIo.on(EventType.PLAYBACK_UPDATE, (data) => {
      log(`Received playback update for track ${data.payload.trackId}`);
      
      if (data.payload.trackId) {
        // Only update the current track
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
      log(`User joined: ${data.payload.userId} (${data.payload.clientId})`);
      
      // Store the user info
      if (data.payload.clientId) {
        userInfoMap.current.set(data.payload.clientId, {
          username: data.payload.userId,
          clientId: data.payload.clientId
        });
      }
      
      // Always add to the username set
      usernameSet.current.add(data.payload.userId);
      
      // Get complete user list
      const userList = getUserList();
      
      // Only update users
      updateRoomState({
        users: userList
      });
    });

    // Handle user leave
    socketIo.on(EventType.USER_LEAVE, (data) => {
      log(`User left: ${data.payload.userId} (${data.payload.clientId})`);
      
      // Remove the user from the map if clientId exists
      if (data.payload.clientId) {
        userInfoMap.current.delete(data.payload.clientId);
      }
      
      // Check if this username exists in any other clients before removing from set
      const username = data.payload.userId;
      const hasOtherWithSameUsername = Array.from(userInfoMap.current.values())
        .some(info => info.username === username);
        
      if (!hasOtherWithSameUsername) {
        usernameSet.current.delete(username);
      }
      
      // Get complete user list
      const userList = getUserList();
      
      // Only update users
      updateRoomState({
        users: userList
      });
    });
    
    socketIo.on(EventType.USERNAME_CHANGE, (data) => {
      log(`Username change received: ${data.payload.oldUsername} -> ${data.payload.newUsername}`);
      
      // Immediately update chat history locally
      setRoomState(prevState => {
        // Create a new chat history with updated usernames
        const updatedChatHistory = prevState.chatHistory.map(msg => {
          // If the message was from the old username's client ID, update to new username
          if (msg.clientId === data.payload.clientId) {
            return {
              ...msg,
              userId: data.payload.newUsername
            };
          }
          return msg;
        });
    
        // Also update the users list
        const updatedUsers = prevState.users.filter(user => 
          user !== data.payload.oldUsername
        );
        updatedUsers.push(data.payload.newUsername);
    
        return {
          ...prevState,
          chatHistory: updatedChatHistory,
          users: updatedUsers
        };
      });
    
      // Update user tracking maps
      if (data.payload.clientId) {
        userInfoMap.current.set(data.payload.clientId, {
          username: data.payload.newUsername,
          clientId: data.payload.clientId
        });
        
        // Remove old username, add new username
        usernameSet.current.delete(data.payload.oldUsername);
        usernameSet.current.add(data.payload.newUsername);
      }
    });
    
    return socketIo;
  }, [getUserList, updateRoomState, roomState.chatHistory, log]);

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
    
    console.warn(`SOCKET DEBUG: Initializing with valid data: roomId=${roomIdRef.current}, userId=${userIdRef.current}, clientId=${clientIdRef.current}`);
    
    // Add initial user info to map
    userInfoMap.current.set(clientIdRef.current, {
      username: userIdRef.current,
      clientId: clientIdRef.current
    });
    
    // Add to username set
    usernameSet.current.add(userIdRef.current);

    // Create socket with explicit options
    console.warn(`SOCKET DEBUG: Creating socket with URL ${SOCKET_URL}`);
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket'], // Use websocket only for more stability
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      query: {
        clientId: clientIdRef.current
      },
      forceNew: false // Don't create a new connection each time
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
    
    // Add a fallback for single user scenarios - if no sync response received quickly
    const fallbackTimer = setTimeout(() => {
      if (roomState.users.length <= 1 && socketRef.current && socketRef.current.connected) {
        log('Single user detected, ensuring proper sync state');
        sendJoinRoom(socketRef.current);
      }
    }, 2000);
    
    // Track connection status with a timeout
    const connectTimeout = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        log('Connection timeout - trying to force reconnect');
        socketRef.current.connect();
      }
    }, 5000);

    // Cleanup function
    return () => {
      log('Cleaning up socket connection');
      clearTimeout(fallbackTimer);
      clearTimeout(connectTimeout);
      
      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
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
  }, [log]);
  
  // Manual disconnect helper
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      log('Manually disconnecting socket');
      socketRef.current.disconnect();
      isInitializedRef.current = false;
    }
  }, [log]);
  
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
  }, [log]);

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
  }, [log]);

  // Helper for updating queue
  const updateQueue = useCallback((queue: any[]) => {
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
  }, [log]);

  // Helper for changing username
  const changeUsername = useCallback((newUsername: string) => {
    if (socketRef.current && socketRef.current.connected) {
      log(`Sending username change: ${userIdRef.current} -> ${newUsername}`);
      socketRef.current.emit(EventType.USERNAME_CHANGE, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        payload: { 
          oldUsername: userIdRef.current,
          newUsername,
          clientId: clientIdRef.current 
        },
        timestamp: Date.now()
      });
      
      // Update our ref
      const oldUsername = userIdRef.current;
      userIdRef.current = newUsername;
      
      // Update the user info map
      userInfoMap.current.set(clientIdRef.current, {
        username: newUsername,
        clientId: clientIdRef.current
      });
      
      // Update username set
      usernameSet.current.add(newUsername);
      
      // Check if old username is still in use before removing from set
      const hasOtherWithOldUsername = Array.from(userInfoMap.current.values())
        .some(info => info.username === oldUsername && info.clientId !== clientIdRef.current);
        
      if (!hasOtherWithOldUsername) {
        usernameSet.current.delete(oldUsername);
      }
      
      // Update chat messages locally and user list
      const updatedChatHistory = roomState.chatHistory.map(msg => {
        if (msg.clientId === clientIdRef.current) {
          return {
            ...msg,
            userId: newUsername
          };
        }
        return msg;
      });
      
      // Get complete user list
      const userList = getUserList();
      
      // Update the state, but try to minimize re-renders
      updateRoomState({
        users: userList,
        chatHistory: updatedChatHistory
      });
    } else {
      log('Cannot change username: not connected');
    }
  }, [getUserList, updateRoomState, roomState.chatHistory, log]);

  // Handle manual join room attempts
  useEffect(() => {
    if (socket && connected && !roomState.users.includes(userId)) {
      console.warn('SOCKET DEBUG: Connected but not joined to room, attempting to join');
      sendJoinRoom(socket);
    }
  }, [connected, socket, roomState.users, userId, sendJoinRoom]);

  return {
    socket,
    connected,
    roomState,
    sendChatMessage,
    updatePlayback,
    updateQueue,
    changeUsername,
    disconnect,
    reconnect
  };
}