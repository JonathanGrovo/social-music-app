// src/routes/rooms.ts
import { Router } from 'express';
import { validateRoomCreation } from '../middleware/validation';
import { v4 as uuidv4 } from 'uuid';
import { SocketManager } from '../config/socket';
import dbService from '@/services/database';

// We'll need to access the SocketManager instance from the server
let socketManager: SocketManager;

// This should be called when the server starts
export const setSocketManager = (manager: SocketManager) => {
  socketManager = manager;
};

const router = Router();

// Get all rooms (this endpoint is currently unused)
router.get('/', (req, res) => {
  if (!socketManager) {
    return res.status(500).json({
      error: {
        message: 'Socket manager not initialized',
        status: 500
      }
    });
  }
  
  const rooms = socketManager.getActiveRooms();
  
  // Build response with room details
  const roomDetails = rooms.map(roomId => {
    const state = socketManager.getRoomState(roomId);
    return {
      id: roomId,
      userCount: state?.users?.size || 0,
      hasActivePlayback: !!state?.currentTrack,
      queueLength: state?.queue?.length || 0
    };
  });
  
  res.status(200).json({
    rooms: roomDetails
  });
});

// Get specific room
router.get('/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  // First check if room exists in database
  const roomData = dbService.getRoom(roomId);
  
  if (!roomData) {
    return res.status(404).json({
      error: {
        message: 'Room not found',
        status: 404
      }
    });
  }
  
  // If room exists in database but not in memory, recreate it
  if (!socketManager.getRoomState(roomId)) {
    socketManager.createRoom(roomId, roomData.name);
  }
  
  // Get the in-memory room state (might still be undefined)
  const roomState = socketManager.getRoomState(roomId);
  
  // Update last active timestamp
  dbService.touchRoom(roomId);
  
  // Return room details with safe property access
  res.status(200).json({
    room: {
      id: roomId,
      name: roomData.name,
      users: socketManager.getRoomUsers(roomId),
      userCount: roomState?.users?.size || 0,
      currentTrack: roomState?.currentTrack || null,
      queueLength: roomState?.queue?.length || 0
    }
  });
});

// Create new room
router.post('/', validateRoomCreation, (req, res) => {
  const { name } = req.body;
  
  // Generate a new room ID
  const roomId = uuidv4();
  
  // Save room to database
  dbService.saveRoom(roomId, name);
  
  // Initialize room state in SocketManager
  if (socketManager) {
    // This will create an empty room state
    socketManager.createRoom(roomId, name);
  }
  
  res.status(201).json({
    message: 'Room created successfully',
    room: {
      id: roomId,
      name: name
    }
  });
});

// Get room queue
router.get('/:roomId/queue', (req, res) => {
  const { roomId } = req.params;
  
  if (!socketManager) {
    return res.status(500).json({
      error: {
        message: 'Socket manager not initialized',
        status: 500
      }
    });
  }
  
  const roomState = socketManager.getRoomState(roomId);
  
  if (!roomState) {
    return res.status(404).json({
      error: {
        message: 'Room not found',
        status: 404
      }
    });
  }
  
  // Return queue details
  res.status(200).json({
    roomId,
    currentTrack: roomState.currentTrack,
    queue: roomState.queue
  });
});

// Get room chat history
router.get('/:roomId/chat', (req, res) => {
  const { roomId } = req.params;
  
  if (!socketManager) {
    return res.status(500).json({
      error: {
        message: 'Socket manager not initialized',
        status: 500
      }
    });
  }
  
  const roomState = socketManager.getRoomState(roomId);
  
  if (!roomState) {
    return res.status(404).json({
      error: {
        message: 'Room not found',
        status: 404
      }
    });
  }
  
  // Return chat history
  res.status(200).json({
    roomId,
    chatHistory: roomState.chatHistory
  });
});

// Get room users
router.get('/:roomId/users', (req, res) => {
  const { roomId } = req.params;
  
  if (!socketManager) {
    return res.status(500).json({
      error: {
        message: 'Socket manager not initialized',
        status: 500
      }
    });
  }
  
  const users = socketManager.getRoomUsers(roomId);
  
  if (!users) {
    return res.status(404).json({
      error: {
        message: 'Room not found',
        status: 404
      }
    });
  }
  
  // Return user list
  res.status(200).json({
    roomId,
    users
  });
});

// Delete the room
router.delete('/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  if (!socketManager) {
    return res.status(500).json({
      error: {
        message: 'Socket manager not initialized',
        status: 500
      }
    });
  }
  
  // Check if room exists first
  const roomState = socketManager.getRoomState(roomId);
  
  if (!roomState) {
    return res.status(404).json({
      error: {
        message: 'Room not found',
        status: 404
      }
    });
  }
  
  // Delete room from SocketManager
  socketManager.deleteRoom(roomId);
  
  res.status(200).json({
    message: 'Room deleted successfully',
    roomId
  });
});

export default router;