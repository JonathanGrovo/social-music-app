// hooks/useSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { EventType, RoomState } from '../types';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useSocket(roomId: string, userId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>({
    queue: [],
    chatHistory: [],
    users: []
  });

  // Debug logging
  const log = useCallback((message: string) => {
    console.log(`[Socket] ${message}`);
  }, []);

  // In useSocket.ts, inside the first useEffect where you establish the connection:
  useEffect(() => {
    if (!userId || !roomId) {
      log('Missing userId or roomId, not connecting');
      return;
    }

    log(`Connecting to ${SOCKET_URL} for room ${roomId} as user ${userId}`);
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    socketIo.on('connect', () => {
      log(`Connected to WebSocket server (${socketIo.id})`);
      setConnected(true);
      
      // Join room
      log(`Joining room ${roomId}`);
      socketIo.emit(EventType.USER_JOIN, { roomId, userId });
      
      // Request initial sync
      log('Requesting initial sync');
      socketIo.emit(EventType.SYNC_REQUEST, { 
        roomId,
        userId,
        timestamp: Date.now(),
        payload: {}
      });
      
      // Add a fallback for single user scenarios - if no sync response received quickly
      setTimeout(() => {
        if (roomState.users.length <= 1) {
          log('Single user detected, ensuring proper sync state');
          socketIo.emit(EventType.SYNC_REQUEST, { 
            roomId,
            userId,
            timestamp: Date.now(),
            payload: {}
          });
        }
      }, 2000);
    });

    socketIo.on('disconnect', () => {
      log('Disconnected from WebSocket server');
      setConnected(false);
    });

    socketIo.on('connect_error', (error) => {
      log(`Connection error: ${error.message}`);
    });

    // Handle room sync
    socketIo.on(EventType.SYNC_RESPONSE, (data) => {
      log(`Received sync response with ${data.payload.queue?.length || 0} queue items`);
      setRoomState({
        currentTrack: data.payload.currentTrack,
        queue: data.payload.queue || [],
        chatHistory: data.payload.chatHistory || [],
        users: data.payload.users || []
      });
    });

    // Handle chat messages
    socketIo.on(EventType.CHAT_MESSAGE, (data) => {
      log(`Received chat message from ${data.userId}`);
      setRoomState(prev => ({
        ...prev,
        chatHistory: [...prev.chatHistory, {
          userId: data.userId,
          content: data.payload.content,
          timestamp: data.timestamp
        }]
      }));
    });

    // Handle queue updates
    socketIo.on(EventType.QUEUE_UPDATE, (data) => {
      log(`Received queue update with ${data.payload.queue?.length || 0} items`);
      setRoomState(prev => ({
        ...prev,
        queue: data.payload.queue || []
      }));
    });

    // Handle playback updates
    socketIo.on(EventType.PLAYBACK_UPDATE, (data) => {
      log(`Received playback update for track ${data.payload.trackId}`);
      
      if (data.payload.trackId) {
        setRoomState(prev => ({
          ...prev,
          currentTrack: {
            id: data.payload.trackId,
            source: data.payload.source || 'youtube',
            startTime: data.payload.currentTime || 0,
            isPlaying: data.payload.isPlaying
          }
        }));
      }
    });

    // Handle user join
    socketIo.on(EventType.USER_JOIN, (data) => {
      log(`User joined: ${data.payload.userId}`);
      setRoomState(prev => ({
        ...prev,
        users: [...prev.users.filter(u => u !== data.payload.userId), data.payload.userId]
      }));
    });

    // Handle user leave
    socketIo.on(EventType.USER_LEAVE, (data) => {
      log(`User left: ${data.payload.userId}`);
      setRoomState(prev => ({
        ...prev,
        users: prev.users.filter(u => u !== data.payload.userId)
      }));
    });

    setSocket(socketIo);

    return () => {
      log('Cleaning up socket connection');
      socketIo.disconnect();
    };
  }, [roomId, userId, log]);

  const sendChatMessage = useCallback((content: string) => {
    if (socket && connected) {
      log(`Sending chat message: ${content.substring(0, 20)}...`);
      socket.emit(EventType.CHAT_MESSAGE, {
        roomId,
        userId,
        payload: { content },
        timestamp: Date.now()
      });
    } else {
      log('Cannot send chat message: not connected');
    }
  }, [socket, connected, roomId, userId, log]);

  const updatePlayback = useCallback((currentTime: number, isPlaying: boolean, trackId: string, source: 'youtube' | 'soundcloud' = 'youtube') => {
    if (socket && connected) {
      log(`Sending playback update: ${trackId} (${isPlaying ? 'playing' : 'paused'} at ${currentTime}s)`);
      socket.emit(EventType.PLAYBACK_UPDATE, {
        roomId,
        userId,
        payload: { currentTime, isPlaying, trackId, source },
        timestamp: Date.now()
      });
    } else {
      log('Cannot update playback: not connected');
    }
  }, [socket, connected, roomId, userId, log]);

  const updateQueue = useCallback((queue: any[]) => {
    if (socket && connected) {
      log(`Sending queue update with ${queue.length} items`);
      socket.emit(EventType.QUEUE_UPDATE, {
        roomId,
        userId,
        payload: { queue },
        timestamp: Date.now()
      });
    } else {
      log('Cannot update queue: not connected');
    }
  }, [socket, connected, roomId, userId, log]);

  return {
    socket,
    connected,
    roomState,
    sendChatMessage,
    updatePlayback,
    updateQueue
  };
}