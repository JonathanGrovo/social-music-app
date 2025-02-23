// src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';

export const validateRoomCreation = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      error: {
        message: 'Room name is required',
        status: 400
      }
    });
  }

  if (name.length > 50) {
    return res.status(400).json({
      error: {
        message: 'Room name must be less than 50 characters',
        status: 400
      }
    });
  }

  next();
};

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