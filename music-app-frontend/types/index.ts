// types/index.ts

export interface ChatMessage {
  userId: string;
  content: string;
  timestamp: number;
  clientId: string; // Make clientId required to ensure proper tracking
}

export interface QueueItem {
  id: string;
  source: 'youtube' | 'soundcloud';
  title?: string;
  thumbnail?: string;
  duration?: number;
}

export interface UserInfo {
  userId: string;   // Username
  clientId: string; // Unique client identifier
}

export interface RoomState {
  currentTrack?: {
    id: string;
    source: 'youtube' | 'soundcloud';
    startTime: number;
    isPlaying: boolean;
    timestamp?: number;
  };
  queue: QueueItem[];
  chatHistory: ChatMessage[];
  users: UserInfo[]; // Array of user info objects
}

export enum EventType {
  PLAYBACK_UPDATE = 'PLAYBACK_UPDATE',
  QUEUE_UPDATE = 'QUEUE_UPDATE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',
  USERNAME_CHANGE = 'USERNAME_CHANGE'
}