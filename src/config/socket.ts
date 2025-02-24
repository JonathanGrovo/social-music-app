import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { EventType, SocketMessage } from '../types/socket';

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
        console.log('User joining room:', data);
        const { roomId, userId } = data;
        
        // Join the room
        socket.join(roomId);
        
        // Broadcast to everyone EXCEPT the sender
        socket.broadcast.emit(EventType.USER_JOIN, {
          roomId,
          payload: { userId },
          timestamp: Date.now(),
          userId
        });
      });

      // Handle chat messages
      socket.on(EventType.CHAT_MESSAGE, (message: SocketMessage) => {
        console.log('Received chat message:', message);
        this.io.to(message.roomId).emit(EventType.CHAT_MESSAGE, message);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
}