// src/routes/rooms.ts
import { Router } from 'express';
import { validateRoomCreation } from '../middleware/validation';

const router = Router();

// Get all rooms
router.get('/', (req, res) => {
  res.status(200).json({
    rooms: [] // This will be populated when we add database functionality
  });
});

// Get specific room
router.get('/:roomId', (req, res) => {
  const { roomId } = req.params;
  res.status(200).json({
    room: {
      id: roomId,
      // More room data will be added later
    }
  });
});

// Create new room
router.post('/', validateRoomCreation, (req, res) => {
  const { name } = req.body;
  res.status(201).json({
    message: 'Room created successfully',
    room: {
      id: 'temp-id', // Will be replaced with actual ID when we add database
      name
    }
  });
});

// Delete room
router.delete('/:roomId', (req, res) => {
  const { roomId } = req.params;
  res.status(200).json({
    message: 'Room deleted successfully',
    roomId
  });
});

export default router;