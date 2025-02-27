export interface ChatMessage {
    userId: string;
    content: string;
    timestamp: number;
  }
  
  export interface QueueItem {
    id: string;
    source: 'youtube' | 'soundcloud';
    title?: string;
    thumbnail?: string;
    duration?: number;
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
    users: string[];
  }
  
  export enum EventType {
    PLAYBACK_UPDATE = 'PLAYBACK_UPDATE',
    QUEUE_UPDATE = 'QUEUE_UPDATE',
    CHAT_MESSAGE = 'CHAT_MESSAGE',
    USER_JOIN = 'USER_JOIN',
    USER_LEAVE = 'USER_LEAVE',
    SYNC_REQUEST = 'SYNC_REQUEST',
    SYNC_RESPONSE = 'SYNC_RESPONSE'
  }