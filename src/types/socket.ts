// src/types/socket.ts
export enum EventType {
  PLAYBACK_UPDATE = 'PLAYBACK_UPDATE',
  QUEUE_UPDATE = 'QUEUE_UPDATE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  EFFECT_UPDATE = 'EFFECT_UPDATE',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE'
}

export interface SocketMessage {
  roomId: string;
  payload: any;
  timestamp: number;
  userId: string;
}

// Optional: More specific message types for better type safety
export interface ChatMessage extends SocketMessage {
  payload: {
    content: string;
  };
}

export interface PlaybackMessage extends SocketMessage {
  payload: {
    currentTime: number;
    isPlaying: boolean;
    trackId: string;
  };
}

export interface QueueMessage extends SocketMessage {
  payload: {
    queue: Array<{
      id: string;
      source: 'youtube' | 'soundcloud';
    }>;
  };
}