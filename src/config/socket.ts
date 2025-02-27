// src/config/socket.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { EventType, SocketMessage, ChatMessage, QueueMessage, PlaybackMessage } from '../types/socket';

// Store room state for synchronization and history
interface RoomState {
  currentTrack?: {
    id: string;
    source: 'youtube' | 'soundcloud';
    startTime: number;
    isPlaying: boolean;
    timestamp?: number; // To calculate time offset
  };
  queue: Array<{
    id: string;
    source: 'youtube' | 'soundcloud';
    title?: string;
    thumbnail?: string;
    duration?: number;
  }>;
  chatHistory: Array<{
    userId: string;
    content: string;
    timestamp: number;
  }>;
  // Track active users
  users: Set<string>; 
}

export class SocketManager {
  private io: Server;
  // Track room states for synchronization and history
  private roomStates: Map<string, RoomState> = new Map();
  // Track which socket belongs to which user and room
  private socketToUser: Map<string, { userId: string, roomId: string }> = new Map();
  
  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.initialize();
  }

  // Helper method to get or create room state (PRIVATE)
  private getOrCreateRoomState(roomId: string): RoomState {
    if (!this.roomStates.has(roomId)) {
      this.roomStates.set(roomId, { 
        queue: [],
        chatHistory: [],
        users: new Set<string>()
      });
    }
    return this.roomStates.get(roomId)!;
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log('New socket connection:', socket.id);

      // Handle room joining
      // In the USER_JOIN handler
      socket.on(EventType.USER_JOIN, (data: { roomId: string; userId: string }) => {
        console.log('User joining room:', data);
        const { roomId, userId } = data;
        
        // Join the socket.io room
        socket.join(roomId);
        
        // Update our tracking maps
        this.socketToUser.set(socket.id, { userId, roomId });
        
        // Add user to room state
        const roomState = this.getOrCreateRoomState(roomId);
        roomState.users.add(userId);
        
        // Broadcast to everyone including the sender for a single user case
        this.io.to(roomId).emit(EventType.USER_JOIN, {
          roomId,
          payload: { userId },
          timestamp: Date.now(),
          userId
        });

        // Send current room state to the newly joined user
        socket.emit(EventType.SYNC_RESPONSE, {
          roomId,
          payload: {
            currentTrack: roomState.currentTrack,
            queue: roomState.queue,
            chatHistory: roomState.chatHistory,
            users: Array.from(roomState.users)
          },
          timestamp: Date.now(),
          userId: 'server'
        });
      });

      // Handle user leaving explicitly
      socket.on(EventType.USER_LEAVE, () => {
        const userInfo = this.socketToUser.get(socket.id);
        if (userInfo) {
          this.handleUserLeave(socket, userInfo.roomId, userInfo.userId);
        }
      });

      // Handle chat messages
      socket.on(EventType.CHAT_MESSAGE, (message: ChatMessage) => {
        console.log('Received chat message:', message);
        const { roomId, userId, payload, timestamp } = message;
        
        // Add to persistent chat history
        const roomState = this.getOrCreateRoomState(roomId);
        roomState.chatHistory.push({
          userId,
          content: payload.content,
          timestamp
        });
        
        // Limit chat history to prevent memory issues (last 100 messages)
        if (roomState.chatHistory.length > 100) {
          roomState.chatHistory.shift();
        }
        
        // Broadcast to all users in the room
        this.io.to(roomId).emit(EventType.CHAT_MESSAGE, message);
      });

      // Handle playback updates
      socket.on(EventType.PLAYBACK_UPDATE, (message: PlaybackMessage) => {
        console.log('Playback update:', message);
        const { roomId, payload } = message;
        
        // Update room state
        const roomState = this.getOrCreateRoomState(roomId);
        if (payload.trackId) {
          // Ensure we're setting startTime correctly
          roomState.currentTrack = {
            id: payload.trackId,
            source: payload.source || 'youtube',
            startTime: payload.currentTime || 0, // Use the exact time from the client
            isPlaying: payload.isPlaying,
            timestamp: Date.now() // Record when this update happened for future sync
          };
        }
        
        // Broadcast to all users in the room, including sender for single user case
        this.io.to(roomId).emit(EventType.PLAYBACK_UPDATE, message);
      });

      // Handle queue updates
      socket.on(EventType.QUEUE_UPDATE, (message: QueueMessage) => {
        console.log('Queue update:', message);
        const { roomId, payload } = message;
        
        // Update queue in room state
        if (payload.queue) {
          const roomState = this.getOrCreateRoomState(roomId);
          roomState.queue = [...payload.queue];
        }
        
        // Broadcast to all in the room
        this.io.to(message.roomId).emit(EventType.QUEUE_UPDATE, message);
      });

      // Handle sync requests
      socket.on(EventType.SYNC_REQUEST, (message: SocketMessage) => {
        console.log('Sync request:', message);
        const { roomId } = message;
        
        const roomState = this.getOrCreateRoomState(roomId);
        
        // Calculate accurate current time if track is playing
        let currentTrack = roomState.currentTrack;
        if (currentTrack && currentTrack.isPlaying && currentTrack.timestamp) {
          const elapsed = (Date.now() - currentTrack.timestamp) / 1000; // Convert to seconds
          currentTrack = {
            ...currentTrack,
            startTime: currentTrack.startTime + elapsed
          };
        }
        
        // Send current state with chat history
        socket.emit(EventType.SYNC_RESPONSE, {
          roomId,
          payload: {
            currentTrack,
            queue: roomState.queue,
            chatHistory: roomState.chatHistory,
            users: Array.from(roomState.users)
          },
          timestamp: Date.now(),
          userId: 'server'
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Handle user leaving the room
        const userInfo = this.socketToUser.get(socket.id);
        if (userInfo) {
          this.handleUserLeave(socket, userInfo.roomId, userInfo.userId);
          // Clean up our mapping
          this.socketToUser.delete(socket.id);
        }
      });
    });
  }

  // Helper method to handle a user leaving a room
  private handleUserLeave(socket: Socket, roomId: string, userId: string) {
    console.log(`User ${userId} leaving room ${roomId}`);
    
    // Leave the socket.io room
    socket.leave(roomId);
    
    // Update room state
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      roomState.users.delete(userId);
      
      // Broadcast to everyone in the room
      this.io.to(roomId).emit(EventType.USER_LEAVE, {
        roomId,
        payload: { userId },
        timestamp: Date.now(),
        userId
      });
      
      // Clean up empty rooms after some time to avoid losing history immediately
      if (roomState.users.size === 0) {
        setTimeout(() => {
          // Double-check the room is still empty before deleting
          const state = this.roomStates.get(roomId);
          if (state && state.users.size === 0) {
            console.log(`Room ${roomId} is empty, cleaning up state`);
            this.roomStates.delete(roomId);
          }
        }, 5 * 60 * 1000); // 5 minutes delay before cleanup
      }
    }
  }

  // PUBLIC methods for external access
  
  // Create a new room
  public createRoom(roomId: string): RoomState {
    // Create a new room state regardless of whether it exists
    const roomState = { 
      queue: [],
      chatHistory: [],
      users: new Set<string>()
    };
    this.roomStates.set(roomId, roomState);
    return roomState;
  }
  
  // Get room information
  public getRoomState(roomId: string): RoomState | undefined {
    return this.roomStates.get(roomId);
  }
  
  // Get list of active room IDs
  public getActiveRooms(): string[] {
    return Array.from(this.roomStates.keys());
  }
  
  // Get users in a specific room
  public getRoomUsers(roomId: string): string[] {
    const roomState = this.roomStates.get(roomId);
    return roomState ? Array.from(roomState.users) : [];
  }

  // Delete a room
  public deleteRoom(roomId: string): boolean {
    return this.roomStates.delete(roomId);
  }
}