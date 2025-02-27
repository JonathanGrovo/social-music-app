import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const socketIo = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    socketIo.on('connect', () => {
      console.log('Connected to WebSocket server');
      setConnected(true);
      
      // Join room
      socketIo.emit(EventType.USER_JOIN, { roomId, userId });
      
      // Request initial sync
      socketIo.emit(EventType.SYNC_REQUEST, { 
        roomId,
        userId,
        timestamp: Date.now(),
        payload: {}
      });
    });

    socketIo.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setConnected(false);
    });

    // Handle room sync
    socketIo.on(EventType.SYNC_RESPONSE, (data) => {
      console.log('Received sync response:', data);
      setRoomState({
        currentTrack: data.payload.currentTrack,
        queue: data.payload.queue,
        chatHistory: data.payload.chatHistory,
        users: data.payload.users
      });
    });

    // Handle chat messages
    socketIo.on(EventType.CHAT_MESSAGE, (data) => {
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
      setRoomState(prev => ({
        ...prev,
        queue: data.payload.queue
      }));
    });

    // Handle playback updates
    socketIo.on(EventType.PLAYBACK_UPDATE, (data) => {
      setRoomState(prev => ({
        ...prev,
        currentTrack: {
          id: data.payload.trackId,
          source: data.payload.source || 'youtube',
          startTime: data.payload.currentTime,
          isPlaying: data.payload.isPlaying,
          timestamp: data.timestamp
        }
      }));
    });

    // Handle user join
    socketIo.on(EventType.USER_JOIN, (data) => {
      setRoomState(prev => ({
        ...prev,
        users: [...prev.users.filter(u => u !== data.payload.userId), data.payload.userId]
      }));
    });

    // Handle user leave
    socketIo.on(EventType.USER_LEAVE, (data) => {
      setRoomState(prev => ({
        ...prev,
        users: prev.users.filter(u => u !== data.payload.userId)
      }));
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [roomId, userId]);

  const sendChatMessage = (content: string) => {
    if (socket && connected) {
      socket.emit(EventType.CHAT_MESSAGE, {
        roomId,
        userId,
        payload: { content },
        timestamp: Date.now()
      });
    }
  };

  const updatePlayback = (currentTime: number, isPlaying: boolean, trackId: string, source: 'youtube' | 'soundcloud' = 'youtube') => {
    if (socket && connected) {
      socket.emit(EventType.PLAYBACK_UPDATE, {
        roomId,
        userId,
        payload: { currentTime, isPlaying, trackId, source },
        timestamp: Date.now()
      });
    }
  };

  const updateQueue = (queue: any[]) => {
    if (socket && connected) {
      socket.emit(EventType.QUEUE_UPDATE, {
        roomId,
        userId,
        payload: { queue },
        timestamp: Date.now()
      });
    }
  };

  return {
    socket,
    connected,
    roomState,
    sendChatMessage,
    updatePlayback,
    updateQueue
  };
}