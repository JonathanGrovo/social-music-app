// src/config/socket.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { EventType, SocketMessage, ChatMessage, QueueMessage, PlaybackMessage, UsernameChangeMessage } from '../types/socket';

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
    clientId?: string; // Add this line
  }>;
  // Track active users with client IDs
  users: Map<string, Set<string>>; // Map of userId -> Set of clientIds 
}

export class SocketManager {
  private io: Server;
  // Track room states for synchronization and history
  private roomStates: Map<string, RoomState> = new Map();
  // Track which socket belongs to which user and room
  private socketToUser: Map<string, { userId: string, clientId: string, roomId: string }> = new Map();
  
  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
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
        users: new Map<string, Set<string>>()
      });
    }
    return this.roomStates.get(roomId)!;
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log('New socket connection:', socket.id);
      
      // Extract clientId from connection handshake if available
      const clientId = socket.handshake.query.clientId as string || socket.id;

      // Handle room joining
      socket.on(EventType.USER_JOIN, (data: { roomId: string; userId: string; clientId?: string }) => {
        console.log('User joining room:', data);
        const { roomId, userId } = data;
        // Use provided clientId or fall back to socket query param
        const userClientId = data.clientId || clientId;
        
        // Join the socket.io room
        socket.join(roomId);
        
        // Update our tracking maps
        this.socketToUser.set(socket.id, { userId, clientId: userClientId, roomId });
        
        // Add user to room state
        const roomState = this.getOrCreateRoomState(roomId);
        
        // Initialize user's client IDs set if needed
        if (!roomState.users.has(userId)) {
          roomState.users.set(userId, new Set<string>());
        }
        
        // Add this client ID to the user's set
        roomState.users.get(userId)!.add(userClientId);
        
        // Convert users map to array of usernames for response
        const usersList = Array.from(roomState.users.keys());
        
        // Broadcast to everyone including the sender for a single user case
        this.io.to(roomId).emit(EventType.USER_JOIN, {
          roomId,
          payload: { userId, clientId: userClientId },
          timestamp: Date.now(),
          userId,
          clientId: userClientId
        });

        // Send current room state to the newly joined user
        socket.emit(EventType.SYNC_RESPONSE, {
          roomId,
          payload: {
            currentTrack: roomState.currentTrack,
            queue: roomState.queue,
            chatHistory: roomState.chatHistory,
            users: usersList
          },
          timestamp: Date.now(),
          userId: 'server',
          clientId: 'server'
        });
      });

      // Handle user leaving explicitly
      socket.on(EventType.USER_LEAVE, () => {
        const userInfo = this.socketToUser.get(socket.id);
        if (userInfo) {
          this.handleUserLeave(socket, userInfo.roomId, userInfo.userId, userInfo.clientId);
        }
      });

    // In the USERNAME_CHANGE event handler (around line 250-300)
    socket.on(EventType.USERNAME_CHANGE, (message: UsernameChangeMessage) => {
      console.log('Username change request:', message);
      const { roomId, payload } = message;
      const { oldUsername, newUsername, clientId: userClientId } = payload;
      
      const roomState = this.getOrCreateRoomState(roomId);
      
      // Check if the old username exists
      if (roomState.users.has(oldUsername)) {
        // Get the set of client IDs for the old username
        const clientIds = roomState.users.get(oldUsername)!;
        
        // Check if the client ID is in the set
        if (clientIds.has(userClientId)) {
          // Remove the client ID from the old username
          clientIds.delete(userClientId);
          
          // If no more clients with this username, remove it
          if (clientIds.size === 0) {
            roomState.users.delete(oldUsername);
          }
          
          // Add the client ID to the new username
          if (!roomState.users.has(newUsername)) {
            roomState.users.set(newUsername, new Set<string>());
          }
          roomState.users.get(newUsername)!.add(userClientId);
          
          // Get updated list of users
          const usersList = Array.from(roomState.users.keys());
          
          // Broadcast the username change to all users in the room
          this.io.to(roomId).emit(EventType.USERNAME_CHANGE, {
            roomId,
            payload: { 
              oldUsername, 
              newUsername, 
              clientId: userClientId, 
              users: usersList 
            },
            timestamp: Date.now(),
            userId: newUsername,
            clientId: userClientId
          });
        }
      }
    });

        // Handle chat messages
        // Handle chat messages
      socket.on(EventType.CHAT_MESSAGE, (message: ChatMessage) => {
        console.log('Received chat message:', message);
        const { roomId, userId, payload, timestamp, clientId } = message;
        
        // Add to persistent chat history
        const roomState = this.getOrCreateRoomState(roomId);
        roomState.chatHistory.push({
          userId,
          content: payload.content,
          timestamp,
          clientId: clientId // Use the destructured clientId
        });
        
        // Limit chat history to prevent memory issues (last 100 messages)
        if (roomState.chatHistory.length > 100) {
          roomState.chatHistory.shift();
        }
        
        // Broadcast to all users in the room with full message details
        this.io.to(roomId).emit(EventType.CHAT_MESSAGE, {
          roomId,
          userId,
          payload: { content: payload.content },
          timestamp,
          clientId // Use the destructured clientId
        } as ChatMessage); // Add type assertion
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
        
        // Convert users map to array of usernames for response
        const usersList = Array.from(roomState.users.keys());
        
        // Send current state with chat history
        socket.emit(EventType.SYNC_RESPONSE, {
          roomId,
          payload: {
            currentTrack,
            queue: roomState.queue,
            chatHistory: roomState.chatHistory,
            users: usersList
          },
          timestamp: Date.now(),
          userId: 'server',
          clientId: 'server'
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Handle user leaving the room
        const userInfo = this.socketToUser.get(socket.id);
        if (userInfo) {
          this.handleUserLeave(socket, userInfo.roomId, userInfo.userId, userInfo.clientId);
          // Clean up our mapping
          this.socketToUser.delete(socket.id);
        }
      });
    });
  }

  // Helper method to handle a user leaving a room
  private handleUserLeave(socket: Socket, roomId: string, userId: string, clientId: string) {
    console.log(`User ${userId} (client ${clientId}) leaving room ${roomId}`);
    
    // Leave the socket.io room
    socket.leave(roomId);
    
    // Update room state
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      // Remove this specific client for this user
      if (roomState.users.has(userId)) {
        const clientIds = roomState.users.get(userId)!;
        clientIds.delete(clientId);
        
        // If this was the last client for this user, remove the user entirely
        if (clientIds.size === 0) {
          roomState.users.delete(userId);
          
          // Broadcast the user leave event
          this.io.to(roomId).emit(EventType.USER_LEAVE, {
            roomId,
            payload: { userId, clientId },
            timestamp: Date.now(),
            userId,
            clientId
          });
        }
      }
      
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
      users: new Map<string, Set<string>>()
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
    return roomState ? Array.from(roomState.users.keys()) : [];
  }

  // Delete a room
  public deleteRoom(roomId: string): boolean {
    return this.roomStates.delete(roomId);
  }
}