// types/index.ts

export interface ChatMessage {
  username: string;
  content: string;
  timestamp: number;
  clientId: string;
  avatarId?: string;
}

export interface QueueItem {
  id: string;
  source: 'youtube' | 'soundcloud';
  title?: string;
  thumbnail?: string;
  duration?: number;
}

export interface UserInfo {
  username: string;
  clientId: string;
  avatarId: string;
  isRoomOwner?: boolean;
}

export interface RoomState {
  roomName?: string,
  currentTrack?: {
    id: string;
    source: 'youtube' | 'soundcloud';
    startTime: number;
    isPlaying: boolean;
    timestamp?: number;
  };
  queue: QueueItem[];
  chatHistory: ChatMessage[];
  users: UserInfo[]; 
}

export enum EventType {
  PLAYBACK_UPDATE = 'PLAYBACK_UPDATE',
  QUEUE_UPDATE = 'QUEUE_UPDATE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',
  USERNAME_CHANGE = 'USERNAME_CHANGE',
  AVATAR_CHANGE = 'AVATAR_CHANGE'  // New event type for avatar changes
}