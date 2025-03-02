// types/index.ts

export interface ChatMessage {
  username: string;    // Renamed from userId
  content: string;
  timestamp: number;
  clientId: string;    // Still needed for identification
  avatarId?: string;   // Optional avatar for the message
}

export interface QueueItem {
  id: string;
  source: 'youtube' | 'soundcloud';
  title?: string;
  thumbnail?: string;
  duration?: number;
}

export interface UserInfo {
  username: string;    // Renamed from userId - this is the display name
  clientId: string;    // Unique identifier for the user's connection
  avatarId: string;    // Avatar identifier
  isRoomOwner?: boolean; // Whether this user owns the room
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
  USERNAME_CHANGE = 'USERNAME_CHANGE',
  AVATAR_CHANGE = 'AVATAR_CHANGE'  // New event type for avatar changes
}