// src/types/room.ts
export interface Room {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    users: string[]; // Array of user IDs
    currentTrack?: {
      id: string;
      source: 'youtube' | 'soundcloud';
      startTime: number;
      timestamp: number;
    };
    queue: Array<{
      id: string;
      source: 'youtube' | 'soundcloud';
    }>;
  }