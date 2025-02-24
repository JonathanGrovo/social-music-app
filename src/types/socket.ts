// src/types/socket.ts
export enum EventType {
  PLAYBACK_UPDATE = 'PLAYBACK_UPDATE',
  QUEUE_UPDATE = 'QUEUE_UPDATE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE'
}

// Base message interface
export interface SocketMessage {
  roomId: string;
  payload: any;
  timestamp: number;
  userId: string;
}

// Message types for better type safety
export interface ChatMessage extends SocketMessage {
  payload: {
    content: string;
  };
}

export interface UserMessage extends SocketMessage {
  payload: {
    userId: string;
  };
}

export interface PlaybackMessage extends SocketMessage {
  payload: {
    currentTime: number;
    isPlaying: boolean;
    trackId: string;
    source?: 'youtube' | 'soundcloud';
  };
}

export interface QueueMessage extends SocketMessage {
  payload: {
    queue: Array<{
      id: string;
      source: 'youtube' | 'soundcloud';
      title?: string;    // Optional metadata
      thumbnail?: string; // Optional metadata
      duration?: number;  // Optional metadata
    }>;
  };
}

export interface SyncRequestMessage extends SocketMessage {
  // Usually empty payload, just needs roomId and userId
}

export interface SyncResponseMessage extends SocketMessage {
  payload: {
    currentTrack?: {
      id: string;
      source: 'youtube' | 'soundcloud';
      startTime: number;
      isPlaying: boolean;
    };
    queue: Array<{
      id: string;
      source: 'youtube' | 'soundcloud';
      title?: string;
      thumbnail?: string;
      duration?: number;
    }>;
    chatHistory: Array<{
      userId: string;
      content: string;
      timestamp: number;
    }>;
    users: string[]; // List of users currently in the room
  };
}