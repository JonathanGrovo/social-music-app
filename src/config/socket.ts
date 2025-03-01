// src/config/socket.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { EventType, SocketMessage, ChatMessage, QueueMessage, 
  PlaybackMessage, UsernameChangeMessage, UserInfo, 
  AvatarChangeMessage } from '../types/socket';

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
    clientId: string; // Client ID is required for chat messages
    avatarId?: string; // Add avatarId
  }>;
  // Track active users by client ID, with username as the value
  users: Map<string, { userId: string, avatarId: string }>; // Updated to include avatarId
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
        users: new Map<string, { userId: string, avatarId: string }>() // Updated to include avatarId
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
      socket.on(EventType.USER_JOIN, (data: { roomId: string; userId: string; clientId?: string; avatarId?: string }) => {
      console.log('User joining room:', data);
      const { roomId, userId } = data;
      // Use provided clientId or fall back to socket query param
      const userClientId = data.clientId || clientId;
      // Use provided avatarId or default to avatar1
      const userAvatarId = data.avatarId || 'avatar1';
      
      // Join the socket.io room
      socket.join(roomId);
      
      // Update our tracking maps
      this.socketToUser.set(socket.id, { userId, clientId: userClientId, roomId });
      
      // Add user to room state
      const roomState = this.getOrCreateRoomState(roomId);
      
      // Add this user to the users map (clientId -> { userId, avatarId })
      roomState.users.set(userClientId, { userId, avatarId: userAvatarId });
      
      // Convert users map to array of user info objects for response
      const usersList = Array.from(roomState.users.entries()).map(([clientId, userInfo]) => ({
        clientId,
        userId: userInfo.userId,
        avatarId: userInfo.avatarId
      }));
        
        // Broadcast to everyone including the sender for a single user case
        this.io.to(roomId).emit(EventType.USER_JOIN, {
          roomId,
          userId,
          clientId: userClientId,
          payload: { userId, clientId: userClientId },
          timestamp: Date.now()
        });

        // Send current room state to the newly joined user
        socket.emit(EventType.SYNC_RESPONSE, {
          roomId,
          userId: 'server',
          clientId: 'server',
          payload: {
            currentTrack: roomState.currentTrack,
            queue: roomState.queue,
            chatHistory: roomState.chatHistory,
            users: usersList
          },
          timestamp: Date.now()
        });
      });

      // Handle user leaving explicitly
      socket.on(EventType.USER_LEAVE, () => {
        const userInfo = this.socketToUser.get(socket.id);
        if (userInfo) {
          this.handleUserLeave(socket, userInfo.roomId, userInfo.userId, userInfo.clientId);
        }
      });

      // Handle username change
      socket.on(EventType.USERNAME_CHANGE, (message: UsernameChangeMessage) => {
        console.log('Username change request:', message);
        const { roomId, payload } = message;
        const { oldUsername, newUsername, clientId: userClientId } = payload;
        
        const roomState = this.getOrCreateRoomState(roomId);
        
        // Update the username in the users map while preserving avatarId
        if (roomState.users.has(userClientId)) {
          const currentUserInfo = roomState.users.get(userClientId);
          const avatarId = currentUserInfo ? currentUserInfo.avatarId : 'avatar1';
          
          // Update with new username but keep the same avatarId
          roomState.users.set(userClientId, { 
            userId: newUsername,
            avatarId 
          });
          
          // Update chat history to reflect new username
          roomState.chatHistory = roomState.chatHistory.map(msg => {
            if (msg.clientId === userClientId) {
              return { ...msg, userId: newUsername };
            }
            return msg;
          });
          
          // Get updated list of users
          const usersList = Array.from(roomState.users.entries()).map(([clientId, userInfo]) => ({
            clientId,
            userId: userInfo.userId,
            avatarId: userInfo.avatarId
          }));
          
          // Broadcast the username change to all users in the room
          this.io.to(roomId).emit(EventType.USERNAME_CHANGE, {
            roomId,
            userId: newUsername,
            clientId: userClientId,
            payload: { 
              oldUsername, 
              newUsername, 
              clientId: userClientId, 
              users: usersList 
            },
            timestamp: Date.now()
          });
        }
      });

      // Add after the USERNAME_CHANGE handler
      socket.on(EventType.AVATAR_CHANGE, (message: AvatarChangeMessage) => {
        console.log('Avatar change request:', message);
        const { roomId, payload } = message;
        const { oldAvatarId, newAvatarId, clientId: userClientId } = payload;
        
        const roomState = this.getOrCreateRoomState(roomId);
        
        // Update the avatar in the users map
        if (roomState.users.has(userClientId)) {
          const userInfo = roomState.users.get(userClientId);
          if (userInfo) {
            roomState.users.set(userClientId, {
              ...userInfo,
              avatarId: newAvatarId
            });
            
            // Update chat history to reflect new avatar
            roomState.chatHistory = roomState.chatHistory.map(msg => {
              if (msg.clientId === userClientId) {
                return { ...msg, avatarId: newAvatarId };
              }
              return msg;
            });
            
            // Get updated list of users
            const usersList = Array.from(roomState.users.entries()).map(([clientId, userInfo]) => ({
              clientId,
              userId: userInfo.userId,
              avatarId: userInfo.avatarId
            }));
            
            // Broadcast the avatar change to all users in the room
            this.io.to(roomId).emit(EventType.AVATAR_CHANGE, {
              roomId,
              userId: roomState.users.get(userClientId)?.userId || '',
              clientId: userClientId,
              payload: { 
                oldAvatarId, 
                newAvatarId, 
                clientId: userClientId, 
                users: usersList 
              },
              timestamp: Date.now()
            });
          }
        }
      });

      // Handle chat messages
      socket.on(EventType.CHAT_MESSAGE, (message: ChatMessage) => {
        console.log('Received chat message:', message);
        const { roomId, userId, payload, timestamp, clientId } = message;
        
        // Get the user's avatar ID from room state
        const roomState = this.getOrCreateRoomState(roomId);
        const userInfo = roomState.users.get(clientId);
        const avatarId = userInfo ? userInfo.avatarId : 'avatar1';
        
        // Add to persistent chat history with avatar ID
        roomState.chatHistory.push({
          userId,
          content: payload.content,
          timestamp,
          clientId,
          avatarId
        });
        
        // Limit chat history to prevent memory issues (last 100 messages)
        if (roomState.chatHistory.length > 100) {
          roomState.chatHistory.shift();
        }
        
        // Broadcast to all users in the room with full message details
        this.io.to(roomId).emit(EventType.CHAT_MESSAGE, {
          roomId,
          userId,
          clientId,
          payload: { content: payload.content },
          timestamp
        } as ChatMessage);
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
        
        // Convert users map to array of user info objects
        const usersList = Array.from(roomState.users.entries()).map(([clientId, userId]) => ({
          clientId,
          userId
        }));
        
        // Send current state with chat history
        socket.emit(EventType.SYNC_RESPONSE, {
          roomId,
          userId: 'server',
          clientId: 'server',
          payload: {
            currentTrack,
            queue: roomState.queue,
            chatHistory: roomState.chatHistory,
            users: usersList
          },
          timestamp: Date.now()
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
      // Remove this specific client
      roomState.users.delete(clientId);
      
      // Broadcast the user leave event
      this.io.to(roomId).emit(EventType.USER_LEAVE, {
        roomId,
        userId,
        clientId,
        payload: { userId, clientId },
        timestamp: Date.now()
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
      users: new Map<string, { userId: string, avatarId: string }>() // clientId -> userId map
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
  public getRoomUsers(roomId: string): UserInfo[] {
    const roomState = this.roomStates.get(roomId);
    return roomState ? 
      Array.from(roomState.users.entries()).map(([clientId, userInfo]) => ({ 
        clientId, 
        userId: userInfo.userId,
        avatarId: userInfo.avatarId
      })) : [];
  }

  // Delete a room
  public deleteRoom(roomId: string): boolean {
    return this.roomStates.delete(roomId);
  }
}