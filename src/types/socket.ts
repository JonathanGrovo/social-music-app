// src/types/socket.ts
export enum EventType {
  PLAYBACK_UPDATE = 'PLAYBACK_UPDATE',
  QUEUE_UPDATE = 'QUEUE_UPDATE',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',
  USERNAME_CHANGE = 'USERNAME_CHANGE',
  AVATAR_CHANGE = 'AVATAR_CHANGE',
  ROOM_OWNER_CHANGE = 'ROOM_OWNER_CHANGE'
}

export interface SocketMessage {
  roomId: string;
  username: string;
  clientId: string;   // Client ID is required
  avatarId?: string;  // Optional avatar ID
  payload: any;
  timestamp: number;
}

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
    source: 'youtube' | 'soundcloud';
  };
}

export interface QueueMessage extends SocketMessage {
  payload: {
    queue: Array<{
      id: string;
      source: 'youtube' | 'soundcloud';
      title?: string;
      thumbnail?: string;
      duration?: number;
    }>;
  };
}

export interface UsernameChangeMessage extends SocketMessage {
  payload: {
    oldUsername: string;
    newUsername: string;
    clientId: string;
    avatarId?: string;
  };
}

export interface AvatarChangeMessage extends SocketMessage {
  payload: {
    oldAvatarId: string;
    newAvatarId: string;
    clientId: string;
    username: string;
  };
}

export interface RoomOwnerChangeMessage extends SocketMessage {
  payload: {
    newOwnerClientId: string;
    newOwnerUsername: string;
  };
}

// Type for user info in room
export interface UserInfo {
  username: string;
  clientId: string;    // Unique client identifier
  avatarId: string;    // Avatar identifier
  isRoomOwner?: boolean; // Whether this user owns the room
}