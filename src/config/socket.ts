// src/config/socket.ts
import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { EventType, SocketMessage } from '@/types/socket';

export class SocketManager {
  private io: Server;

  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.initialize();
  }

  private initialize() {
    this.io.on('connection', (socket: Socket) => {
      console.log('New socket connection:', socket.id);

      // Handle room joining
      socket.on(EventType.USER_JOIN, (data: { roomId: string; userId: string }) => {
        const { roomId, userId } = data;
        
        // Join the room
        socket.join(roomId);
        
        // Notify others in the room
        socket.to(roomId).emit(EventType.USER_JOIN, {
          payload: { userId },
          timestamp: Date.now(),
          userId
        });

        // Send room info to the joining user
        const roomSize = this.io.sockets.adapter.rooms.get(roomId)?.size || 0;
        socket.emit('ROOM_INFO', {
          payload: { usersCount: roomSize },
          timestamp: Date.now(),
          userId
        });
      });

      // Handle room leaving
      socket.on(EventType.USER_LEAVE, (data: { roomId: string; userId: string }) => {
        const { roomId, userId } = data;
        
        socket.leave(roomId);
        socket.to(roomId).emit(EventType.USER_LEAVE, {
          payload: { userId },
          timestamp: Date.now(),
          userId
        });
      });

      // Handle chat messages
      socket.on(EventType.CHAT_MESSAGE, (data: { roomId: string; message: SocketMessage }) => {
        socket.to(data.roomId).emit(EventType.CHAT_MESSAGE, data.message);
      });

      // Handle playback updates
      socket.on(EventType.PLAYBACK_UPDATE, (data: { roomId: string; update: SocketMessage }) => {
        socket.to(data.roomId).emit(EventType.PLAYBACK_UPDATE, data.update);
      });

      // Handle queue updates
      socket.on(EventType.QUEUE_UPDATE, (data: { roomId: string; update: SocketMessage }) => {
        socket.to(data.roomId).emit(EventType.QUEUE_UPDATE, data.update);
      });

      // Handle effect updates
      socket.on(EventType.EFFECT_UPDATE, (data: { roomId: string; update: SocketMessage }) => {
        socket.to(data.roomId).emit(EventType.EFFECT_UPDATE, data.update);
      });

      // Handle sync requests
      socket.on(EventType.SYNC_REQUEST, (data: { roomId: string; request: SocketMessage }) => {
        socket.to(data.roomId).emit(EventType.SYNC_REQUEST, data.request);
      });

      // Handle sync responses
      socket.on(EventType.SYNC_RESPONSE, (data: { roomId: string; response: SocketMessage }) => {
        socket.to(data.roomId).emit(EventType.SYNC_RESPONSE, data.response);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  public getRoomCount(): number {
    return this.io.sockets.adapter.rooms.size;
  }

  public getUserCountInRoom(roomId: string): number {
    return this.io.sockets.adapter.rooms.get(roomId)?.size || 0;
  }
}