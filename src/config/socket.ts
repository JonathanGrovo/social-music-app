// src/config/socket.ts

import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { EventType } from '../types/socket';
import dbService from '@/services/database';

interface UserData {
  username: string;
  avatarId: string;
  isRoomOwner?: boolean;
}

// Store room state for synchronization and history
interface RoomState {
  roomName?: string;
  currentTrack?: {
    id: string;
    source: 'youtube' | 'soundcloud';
    startTime: number;
    isPlaying: boolean;
    timestamp?: number;
  };
  queue: Array<{
    id: string;
    source: 'youtube' | 'soundcloud';
    title?: string;
    thumbnail?: string;
    duration?: number;
  }>;
  chatHistory: Array<{
    username: string;
    content: string;
    timestamp: number;
    clientId: string;
    avatarId?: string; // Added avatar support
  }>;
  // Track active users by client ID, with user data as the value
  users: Map<string, UserData>; // Map of clientId -> UserData
}

export class SocketManager {
  private io: Server;
  // Track room states for synchronization and history
  private roomStates: Map<string, RoomState> = new Map();
  // Track which socket belongs to which user and room
  private socketToUser: Map<string, { username: string, clientId: string, roomId: string, avatarId: string }> = new Map();
  
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
  private getOrCreateRoomState(roomId: string, roomName?: string): RoomState {
    if (!this.roomStates.has(roomId)) {
      // Create new room state
      this.roomStates.set(roomId, {
        roomName: roomName || '',
        queue: [],
        chatHistory: [],  // Initialize with empty array
        users: new Map<string, UserData>()
      });
      
      // Asynchronously load chat history from database
      // Note: This is an optimization for startup performance
      // The complete history is loaded on-demand in SYNC_REQUEST
      setTimeout(() => {
        const roomState = this.roomStates.get(roomId);
        if (roomState) {
          const chatHistory = dbService.getMessagesByRoom(roomId);
          if (chatHistory.length > 0) {
            console.log(`Loaded ${chatHistory.length} messages for room ${roomId} from database`);
            roomState.chatHistory = chatHistory;
          }
        }
      }, 0);
    }
    return this.roomStates.get(roomId)!;
  }

  // Helper method to create consistent user objects for responses
  private createUserObject(clientId: string, userData: UserData) {
    return {
      clientId,
      username: userData.username,
      avatarId: userData.avatarId || 'avatar1',
      isRoomOwner: !!userData.isRoomOwner
    };
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log('New socket connection:', socket.id);
      
      // Extract clientId from connection handshake if available
      const clientId = socket.handshake.query.clientId as string || socket.id;

      // Handle room joining
      socket.on(EventType.USER_JOIN, (data: { roomId: string; username: string; clientId?: string; avatarId?: string }) => {
        console.log('User joining room:', data);
        const { roomId } = data;
        const username = data.username;
        const avatarId = data.avatarId || 'avatar1';
        
        // Use provided clientId or fall back to socket query param
        const userClientId = data.clientId || clientId;

        // Check if room exists in database
        if (!dbService.roomExists(roomId)) {
          // Room doesn't exist, send error to client
          socket.emit('error', {
            message: 'Room not found or no longer available',
            code: 'ROOM_NOT_FOUND'
          });
          return;
        }

        // Update room last active timestamp
        dbService.touchRoom(roomId)
        
        // Join the socket.io room
        socket.join(roomId);
        
        // Update our tracking maps
        this.socketToUser.set(socket.id, { 
          username,
          clientId: userClientId, 
          roomId,
          avatarId
        });
        
        // Add user to room state
        const roomState = this.getOrCreateRoomState(roomId);
        
        // Determine if this is the first user (room owner)
        const isRoomOwner = roomState.users.size === 0;
        
        // Add this user to the users map with complete data
        roomState.users.set(userClientId, {
          username,
          avatarId,
          isRoomOwner
        });
        
        // Convert users map to array of user info objects for response
        const usersList = Array.from(roomState.users.entries()).map(([clientId, userData]) => 
          this.createUserObject(clientId, userData)
        );
        
        // Broadcast to everyone including the sender for a single user case
        this.io.to(roomId).emit(EventType.USER_JOIN, {
          roomId,
          username,
          clientId: userClientId,
          avatarId,
          isRoomOwner,
          payload: { 
            username, 
            clientId: userClientId,
            avatarId,
            isRoomOwner
          },
          timestamp: Date.now()
        });

        // Send current room state to the newly joined user
        socket.emit(EventType.SYNC_RESPONSE, {
          roomId,
          username: 'server',
          clientId: 'server',
          payload: {
            roomName: roomState.roomName,
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
          this.handleUserLeave(socket, userInfo.roomId, userInfo.username, userInfo.clientId);
        }
      });

      // Handle username change
      socket.on(EventType.USERNAME_CHANGE, (message: any) => {
        console.log('Username change request:', message);
        const { roomId, payload } = message;
        const { oldUsername, newUsername, clientId: userClientId, avatarId } = payload;
        
        const roomState = this.getOrCreateRoomState(roomId);
        
        // Update the username in the users map
        if (roomState.users.has(userClientId)) {
          const userData = roomState.users.get(userClientId) || { 
            username: oldUsername, 
            avatarId: avatarId || 'avatar1' 
          };
          
          // Update with new username
          const updatedUserData = {
            ...userData,
            username: newUsername
          };
          
          roomState.users.set(userClientId, updatedUserData);
          
          // Update chat history to reflect new username
          roomState.chatHistory = roomState.chatHistory.map(msg => {
            if (msg.clientId === userClientId) {
              return { ...msg, username: newUsername };
            }
            return msg;
          });
          
          // Get updated list of users
          const usersList = Array.from(roomState.users.entries()).map(([clientId, userData]) => 
            this.createUserObject(clientId, userData)
          );
          
          // Broadcast the username change to all users in the room
          this.io.to(roomId).emit(EventType.USERNAME_CHANGE, {
            roomId,
            username: newUsername,
            clientId: userClientId,
            avatarId: userData.avatarId,
            payload: { 
              oldUsername, 
              newUsername, 
              clientId: userClientId, 
              avatarId: userData.avatarId,
              users: usersList 
            },
            timestamp: Date.now()
          });
        }
      });
      
      // Handle avatar changes (new event type)
      socket.on(EventType.AVATAR_CHANGE, (message: any) => {
        console.log('Avatar change request:', message);
        const { roomId, payload } = message;
        const { oldAvatarId, newAvatarId, clientId: userClientId, username } = payload;
        
        const roomState = this.getOrCreateRoomState(roomId);
        
        // Update the avatar in the users map
        if (roomState.users.has(userClientId)) {
          const userData = roomState.users.get(userClientId) || { 
            username: username,
            avatarId: oldAvatarId 
          };
          
          // Update with new avatar
          const updatedUserData = {
            ...userData,
            avatarId: newAvatarId
          };
          
          roomState.users.set(userClientId, updatedUserData);
          
          // Update chat history to reflect new avatar
          roomState.chatHistory = roomState.chatHistory.map(msg => {
            if (msg.clientId === userClientId) {
              return { ...msg, avatarId: newAvatarId };
            }
            return msg;
          });
          
          // Get updated list of users
          const usersList = Array.from(roomState.users.entries()).map(([clientId, userData]) => 
            this.createUserObject(clientId, userData)
          );
          
          // Broadcast the avatar change to all users in the room
          this.io.to(roomId).emit(EventType.AVATAR_CHANGE, {
            roomId,
            username: username,
            clientId: userClientId,
            avatarId: newAvatarId,
            payload: { 
              oldAvatarId, 
              newAvatarId, 
              clientId: userClientId, 
              username: username,
              users: usersList 
            },
            timestamp: Date.now()
          });
        }
      });

      // Handle chat messages
      socket.on(EventType.CHAT_MESSAGE, (message: any) => {
        console.log('Received chat message:', message);
        const { roomId, payload, timestamp, clientId } = message;
        const username = message.username
        const avatarId = message.avatarId || 'avatar1';

        // Create message object
        const messageObj = {
          username,
          content: payload.content,
          timestamp,
          clientId,
          avatarId
        };

        // Add to in-memory chat history
        const roomState = this.getOrCreateRoomState(roomId);
        roomState.chatHistory.push(messageObj);

        // Save to database
        dbService.saveMessage(roomId, messageObj);
        
        // Broadcast to all users in the room
        this.io.to(roomId).emit(EventType.CHAT_MESSAGE, {
          roomId,
          username,
          clientId,
          avatarId,
          payload: { content: payload.content },
          timestamp
        });
      });

      // Handle playback updates
      socket.on(EventType.PLAYBACK_UPDATE, (message: any) => {
        console.log(`Playback update for ${message.payload.trackId} at ${message.payload.currentTime}s`);
        
        const { roomId, payload, clientId } = message;
        
        // Update room state
        const roomState = this.getOrCreateRoomState(roomId);
        if (payload.trackId) {
          roomState.currentTrack = {
            id: payload.trackId,
            source: payload.source || 'youtube',
            startTime: Number(payload.currentTime) || 0,
            isPlaying: payload.isPlaying,
            timestamp: Date.now()
          };
        }
        
        // Broadcast to all users in the room EXCEPT the sender
        socket.to(roomId).emit(EventType.PLAYBACK_UPDATE, message);
      });

      // Handle queue updates
      socket.on(EventType.QUEUE_UPDATE, (message: any) => {
        console.log('Queue update:', message);
        const { roomId, payload } = message;
        
        // Update queue in room state
        if (payload.queue) {
          const roomState = this.getOrCreateRoomState(roomId);
          roomState.queue = [...payload.queue];
        }
        
        // Broadcast to all in the room except the sender
        socket.to(roomId).emit(EventType.QUEUE_UPDATE, message);
      });

      // Handle sync requests
      socket.on(EventType.SYNC_REQUEST, (message: any) => {
        console.log('Sync request:', message);
        const { roomId } = message;
        
        // Get room state
        const roomState = this.getOrCreateRoomState(roomId);
        
        // Calculate accurate current time if track is playing
        let currentTrack = roomState.currentTrack;
        if (currentTrack && currentTrack.isPlaying && currentTrack.timestamp) {
          const elapsed = (Date.now() - currentTrack.timestamp) / 1000;
          currentTrack = {
            ...currentTrack,
            startTime: currentTrack.startTime + elapsed
          };
        }

        const chatHistory = dbService.getMessagesByRoom(roomId);
        
        // Convert users map to array
        const usersList = Array.from(roomState.users.entries()).map(([clientId, userData]) => 
          this.createUserObject(clientId, userData)
        );
        
        // Send current state with COMPLETE chat history, no hasMoreMessages flag
        socket.emit(EventType.SYNC_RESPONSE, {
          roomId,
          username: 'server',
          clientId: 'server',
          payload: {
            currentTrack,
            queue: roomState.queue,
            chatHistory: chatHistory,
            // Remove hasMoreMessages flag
            users: usersList,
            roomName: roomState.roomName
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
          this.handleUserLeave(socket, userInfo.roomId, userInfo.username, userInfo.clientId);
          // Clean up our mapping
          this.socketToUser.delete(socket.id);
        }
      });
    });
  }

  // Helper method to handle a user leaving a room
  private handleUserLeave(socket: Socket, roomId: string, username: string, clientId: string) {
    console.log(`User ${username} (client ${clientId}) leaving room ${roomId}`);
    
    // Leave the socket.io room
    socket.leave(roomId);
    
    const roomState = this.roomStates.get(roomId);
    if (roomState) {
      // Get user data before removal to access isRoomOwner status
      const userData = roomState.users.get(clientId);
      const wasRoomOwner = userData?.isRoomOwner || false;
      
      // Remove this specific client
      roomState.users.delete(clientId);
      
      // If the room owner left, assign ownership to someone else
      if (wasRoomOwner && roomState.users.size > 0) {
        // Get the first user and make them owner
        const [newOwnerClientId, newOwnerData] = Array.from(roomState.users.entries())[0];
        const updatedOwnerData = {
          ...newOwnerData,
          isRoomOwner: true
        };
        
        // Update the user data with new owner status
        roomState.users.set(newOwnerClientId, updatedOwnerData);
        
        // Let all clients know about the new owner
        this.io.to(roomId).emit(EventType.ROOM_OWNER_CHANGE, {
          roomId,
          username: updatedOwnerData.username,
          clientId: newOwnerClientId,
          avatarId: updatedOwnerData.avatarId,
          payload: { 
            newOwnerClientId, 
            newOwnerUsername: updatedOwnerData.username 
          },
          timestamp: Date.now()
        });
      }
      
      // Broadcast the user leave event
      this.io.to(roomId).emit(EventType.USER_LEAVE, {
        roomId,
        username,
        clientId,
        payload: { username, clientId },
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
  public createRoom(roomId: string, roomName?: string): RoomState {
    // Create a new room state regardless of whether it exists
    const roomState = {
      roomName: roomName || '',
      queue: [],
      chatHistory: [],
      users: new Map<string, UserData>() // clientId -> UserData map
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
  
  // Get users in a specific room with consistent structure
  public getRoomUsers(roomId: string): any[] {
    const roomState = this.roomStates.get(roomId);
    return roomState ? 
      Array.from(roomState.users.entries()).map(([clientId, userData]) => 
        this.createUserObject(clientId, userData)
      ) : [];
  }

  // Delete a room
  public deleteRoom(roomId: string): boolean {
    return this.roomStates.delete(roomId);
  }
}