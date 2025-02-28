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
  
    // Add this at the beginning of your useSocket hook
  useEffect(() => {
    console.warn(`SOCKET DEBUG: Browser URL: ${window.location.origin}, Socket URL: ${SOCKET_URL}`);
    console.warn(`SOCKET DEBUG: Using roomId=${roomId}, userId=${userId}, clientId=${clientId}`);
  }, []);
  
  
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
  
  // Debug logging
  const log = useCallback((message: string) => {
    console.log(`[Socket] ${message}`);
  }, []);
  
  // Update refs when props change
  useEffect(() => {
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
      }
    }
  }, [userId, clientId, roomId, log]);
  
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
  
  // Queue a state update
  const queueStateUpdate = useCallback((update: Partial<RoomState>) => {
    // If we have no pending updates, create a new object
    if (!pendingStateUpdates.current) {
      pendingStateUpdates.current = { ...update };
    } else {
      // Merge with existing pending updates
      pendingStateUpdates.current = {
        ...pendingStateUpdates.current,
        ...update,
        // Special handling for arrays to ensure they're properly merged
        users: update.users || pendingStateUpdates.current.users,
        queue: update.queue || pendingStateUpdates.current.queue,
        chatHistory: update.chatHistory || pendingStateUpdates.current.chatHistory
      };
    }
    
    // Clear existing timeout if any
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Set timeout to apply updates
    updateTimeoutRef.current = setTimeout(() => {
      applyPendingUpdates();
      updateTimeoutRef.current = null;
    }, 50); // Small delay to batch updates
  }, [applyPendingUpdates]);
  
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
      return;
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
  }, []);

  // Setup socket handlers
  const setupSocketHandlers = useCallback((socketIo: Socket) => {
    log('Setting up socket handlers');
    
    socketIo.on('connect', () => {
      log(`Connected to WebSocket server (${socketIo.id})`);
      setConnected(true);
      
      // Add debug alert
      console.warn(`SOCKET DEBUG: Connected! Attempting to join room ${roomIdRef.current} as ${userIdRef.current}`);
      
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

    socketIo.on('disconnect', () => {
      log('Disconnected from WebSocket server');
      setConnected(false);
    });

    socketIo.on('connect_error', (error) => {
      log(`Connection error: ${error.message}`);
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
            // Handle object format (has clientId)
            userInfoMap.current.set(userEntry.clientId, {
              username: userEntry.username,
              clientId: userEntry.clientId
            });
            usernameSet.current.add(userEntry.username);
          } else if (typeof userEntry === 'string') {
            // Handle string format (legacy) - add to username set
            log(`Adding legacy user format: ${userEntry}`);
            usernameSet.current.add(userEntry);
          }
        });
      }
      
      // Get the complete user list
      const userList = getUserList();
      log(`User list after sync: ${userList.join(', ')}`);
      
      // Update chat history to map to current usernames
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
      
      // Only update chat history, don't re-render user list
      queueStateUpdate({
        chatHistory: [...roomState.chatHistory, {
          userId: data.userId,
          content: data.payload.content,
          timestamp: data.timestamp,
          clientId: data.clientId // Store clientId with the message
        }]
      });
    });

    // Handle queue updates
    socketIo.on(EventType.QUEUE_UPDATE, (data) => {
      log(`Received queue update with ${data.payload.queue?.length || 0} items`);
      
      // Only update queue, avoid re-rendering everything
      queueStateUpdate({
        queue: data.payload.queue || []
      });
    });

    // Handle playback updates
    socketIo.on(EventType.PLAYBACK_UPDATE, (data) => {
      log(`Received playback update for track ${data.payload.trackId}`);
      
      if (data.payload.trackId) {
        // Only update the current track
        queueStateUpdate({
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
      queueStateUpdate({
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
      queueStateUpdate({
        users: userList
      });
    });
    
    // Handle username changes
    socketIo.on(EventType.USERNAME_CHANGE, (data) => {
      log(`Username change: ${data.payload.oldUsername} -> ${data.payload.newUsername} (${data.payload.clientId})`);
      
      // Update the user info map
      if (data.payload.clientId) {
        userInfoMap.current.set(data.payload.clientId, {
          username: data.payload.newUsername,
          clientId: data.payload.clientId
        });
        
        // Add new username to set
        usernameSet.current.add(data.payload.newUsername);
        
        // Check if old username is still in use before removing from set
        const oldUsername = data.payload.oldUsername;
        const hasOtherWithOldUsername = Array.from(userInfoMap.current.values())
          .some(info => info.username === oldUsername && info.clientId !== data.payload.clientId);
          
        if (!hasOtherWithOldUsername) {
          usernameSet.current.delete(oldUsername);
        }
      }
      
      // Get complete user list
      const userList = getUserList();
      
      // Update chat history to reflect the new username
      const updatedChatHistory = roomState.chatHistory.map(msg => {
        if (msg.clientId === data.payload.clientId) {
          return {
            ...msg,
            userId: data.payload.newUsername
          };
        }
        return msg;
      });
      
      // Update both parts but minimize re-renders
      queueStateUpdate({
        users: userList,
        chatHistory: updatedChatHistory
      });
    });
  }, [getUserList, queueStateUpdate, roomState.chatHistory, sendJoinRoom]);

  // Initialize or reinitialize socket connection
  useEffect(() => {
    // Skip if already initialized or missing required data
    if (isInitializedRef.current) {
      return;
    }
    
    // ADD THIS CHECK - Skip initialization if any required value is empty
    if (!roomIdRef.current || !userIdRef.current || !clientIdRef.current) {
      console.warn('SOCKET DEBUG: Skipping initialization - missing required values');
      return;
    } else {
      console.warn('SOCKET DEBUG: ALL VALUES PRESENT, PROCEEDING WITH CONNECTION');
    }
  
    console.warn(`SOCKET DEBUG: Initializing with valid data: roomId=${roomIdRef.current}, userId=${userIdRef.current}, clientId=${clientIdRef.current}`);
    
    // Add initial user info to map
    userInfoMap.current.set(clientIdRef.current, {
      username: userIdRef.current,
      clientId: clientIdRef.current
    });
    
    // Add to username set
    usernameSet.current.add(userIdRef.current);

    // Add this before creating the socket instance
    console.warn(`SOCKET DEBUG: About to initialize. roomId=${roomIdRef.current}, userId=${userIdRef.current}, clientId=${clientIdRef.current}`);
    console.warn(`SOCKET DEBUG: Browser URL: ${window.location.origin}, Socket URL: ${SOCKET_URL}`);
    console.warn(`SOCKET DEBUG: Creating socket with URL ${SOCKET_URL}`);
    const socketIo = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket as fallback
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      timeout: 30000, // Increase timeout further
      query: {
        clientId: clientIdRef.current
      },
      forceNew: true // Force a new connection
    });
    
    // Log the socket state
    console.warn(`SOCKET DEBUG: Socket created, id=${socketIo.id}, connected=${socketIo.connected}`);
    
    // Force connect if not connecting automatically
    if (!socketIo.connected) {
      console.warn('SOCKET DEBUG: Socket not connected, forcing connect');
      try {
        // Check the socket's readiness
        console.warn(`SOCKET DEBUG: Socket status - connected: ${socketIo.connected}, connecting: ${socketIo.connecting}, id: ${socketIo.id}`);
        
        // Try to force connect
        socketIo.connect();
        
        // Add a 100ms delay and check status again
        setTimeout(() => {
          console.warn(`SOCKET DEBUG: After connect() - connected: ${socketIo.connected}, connecting: ${socketIo.connecting}, id: ${socketIo.id}`);
          
          // If still not connected, try a more aggressive approach
          if (!socketIo.connected && !socketIo.connecting) {
            console.warn('SOCKET DEBUG: Still not connecting, trying alternative connection approach');
            
            // Try to disconnect and reconnect
            socketIo.disconnect();
            setTimeout(() => {
              socketIo.connect();
              console.warn('SOCKET DEBUG: Forced reconnection attempt');
            }, 100);
          }
        }, 100);
      } catch (error) {
        console.error('SOCKET DEBUG: Error forcing connection:', error);
      }
    }
    
    // Setup event handlers
    setupSocketHandlers(socketIo);
    
    // Store references
    socketRef.current = socketIo;
    setSocket(socketIo);
    isInitializedRef.current = true;
    
    // If already connected (rare but possible), send join immediately
    if (socketIo.connected) {
      sendJoinRoom(socketIo);
    }
    
    // Add a fallback for single user scenarios - if no sync response received quickly
    const fallbackTimer = setTimeout(() => {
      if (roomState.users.length <= 1 && socketIo.connected) {
        log('Single user detected, ensuring proper sync state');
        socketIo.emit(EventType.SYNC_REQUEST, { 
          roomId: roomIdRef.current,
          userId: userIdRef.current,
          clientId: clientIdRef.current,
          timestamp: Date.now(),
          payload: {}
        });
      }
    }, 2000);

    // Cleanup function
    return () => {
      log('Cleaning up socket connection');
      clearTimeout(fallbackTimer);
      
      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      
      // Only disconnect if explicitly cleaning up
      socketIo.disconnect();
      isInitializedRef.current = false;
    };
  // Run this effect whenever initialization status changes or refs are updated
  }, [isInitializedRef.current, setupSocketHandlers, sendJoinRoom]);

  // Add this new useEffect to trigger initialization when values are updated
  useEffect(() => {
    // Only run if we haven't initialized yet and have all required values
    if (!isInitializedRef.current && roomId && userId && clientId) {
      console.warn(`SOCKET DEBUG: Values now available, roomId=${roomId}, userId=${userId}, clientId=${clientId}`);
      
      // Update refs
      roomIdRef.current = roomId;
      userIdRef.current = userId;
      clientIdRef.current = clientId;
      
      // Force re-render to trigger the initialization effect
      // We use a state update to force the component to re-render
      const forceUpdate = {};
      setRoomState(prev => ({...prev, ...forceUpdate}));
    }
  }, [roomId, userId, clientId]);

  // Check if we need to reinitialize when not initialized
  useEffect(() => {
    if (!isInitializedRef.current && userIdRef.current && clientIdRef.current && roomIdRef.current) {
      log('Not initialized but have all required data, triggering initialization');
      // Force re-render to trigger the initialization effect
      setConnected(false);
    }
  }, [userId, clientId, roomId, isInitializedRef.current, log]);

  const sendChatMessage = useCallback((content: string) => {
    if (socket && connected) {
      log(`Sending chat message: ${content.substring(0, 20)}...`);
      socket.emit(EventType.CHAT_MESSAGE, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        payload: { content },
        timestamp: Date.now()
      });
    } else {
      log('Cannot send chat message: not connected');
    }
  }, [socket, connected, log]);

  const updatePlayback = useCallback((currentTime: number, isPlaying: boolean, trackId: string, source: 'youtube' | 'soundcloud' = 'youtube') => {
    if (socket && connected) {
      log(`Sending playback update: ${trackId} (${isPlaying ? 'playing' : 'paused'} at ${currentTime}s)`);
      socket.emit(EventType.PLAYBACK_UPDATE, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        payload: { currentTime, isPlaying, trackId, source },
        timestamp: Date.now()
      });
    } else {
      log('Cannot update playback: not connected');
    }
  }, [socket, connected, log]);

  const updateQueue = useCallback((queue: any[]) => {
    if (socket && connected) {
      log(`Sending queue update with ${queue.length} items`);
      socket.emit(EventType.QUEUE_UPDATE, {
        roomId: roomIdRef.current,
        userId: userIdRef.current,
        clientId: clientIdRef.current,
        payload: { queue },
        timestamp: Date.now()
      });
    } else {
      log('Cannot update queue: not connected');
    }
  }, [socket, connected, log]);

  // Handle username change
  const changeUsername = useCallback((newUsername: string) => {
    if (socket && connected) {
      log(`Sending username change: ${userIdRef.current} -> ${newUsername}`);
      socket.emit(EventType.USERNAME_CHANGE, {
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
      queueStateUpdate({
        users: userList,
        chatHistory: updatedChatHistory
      });
    } else {
      log('Cannot change username: not connected');
    }
  }, [socket, connected, log, getUserList, queueStateUpdate, roomState.chatHistory]);

  // Manual disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      log('Manually disconnecting socket');
      socketRef.current.disconnect();
      isInitializedRef.current = false;
    }
  }, [log]);

  // Manual reconnect function with new username
  const reconnect = useCallback((newUsername: string, newClientId: string) => {
    log(`Reconnecting with new username: ${newUsername} (client ${newClientId})`);
    
    // Update refs
    userIdRef.current = newUsername;
    clientIdRef.current = newClientId;
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Reset initialization flag
    isInitializedRef.current = false;
    
    // Force re-render to trigger the initialization effect
    setConnected(false);
  }, [log]);

  // Add a debug function to manually join
  useEffect(() => {
    if (socket && connected && socket.id) {
      console.warn('SOCKET DEBUG: Connected socket detected, trying manual join after 1 second');
      
      const timer = setTimeout(() => {
        console.warn(`SOCKET DEBUG: Manual join attempt for room ${roomIdRef.current}`);
        socket.emit(EventType.USER_JOIN, { 
          roomId: roomIdRef.current, 
          userId: userIdRef.current, 
          clientId: clientIdRef.current 
        });
        
        socket.emit(EventType.SYNC_REQUEST, { 
          roomId: roomIdRef.current,
          userId: userIdRef.current,
          clientId: clientIdRef.current,
          timestamp: Date.now(),
          payload: {}
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [socket, connected]);

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