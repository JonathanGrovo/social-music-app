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
  payload: any;
  timestamp: number;
  userId: string;
}