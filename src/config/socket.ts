// src/config/websocket.ts
  import { WebSocket, WebSocketServer } from 'ws';
  import { Server } from 'http';
  import { EventType, WebSocketMessage, Room } from '../types/websocket';
  
  export class WebSocketManager {
    private wss: WebSocketServer;
    private rooms: Map<string, Room>;
  
    constructor(server: Server) {
      this.wss = new WebSocketServer({ server });
      this.rooms = new Map();
      this.initialize();
    }
  
    private initialize() {
      this.wss.on('connection', (ws: WebSocket) => {
        console.log('New WebSocket connection established');
  
        ws.on('message', (data: string) => {
          try {
            const message: WebSocketMessage = JSON.parse(data);
            this.handleMessage(ws, message);
          } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
              type: 'ERROR',
              payload: { message: 'Invalid message format' },
              timestamp: Date.now()
            }));
          }
        });
  
        ws.on('close', () => {
          this.handleDisconnect(ws);
        });
  
        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      });
    }
  
    private handleMessage(ws: WebSocket, message: WebSocketMessage) {
      switch (message.type) {
        case EventType.USER_JOIN:
          this.handleUserJoin(ws, message);
          break;
        case EventType.USER_LEAVE:
          this.handleUserLeave(ws, message);
          break;
        default:
          this.broadcastToRoom(message.roomId, message);
      }
    }
  
    private handleUserJoin(ws: WebSocket, message: WebSocketMessage) {
      const { roomId } = message;
      
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, { id: roomId, users: new Set() });
      }
  
      const room = this.rooms.get(roomId)!;
      room.users.add(ws);
  
      // Notify other users in the room
      this.broadcastToRoom(roomId, {
        type: EventType.USER_JOIN,
        payload: { userId: message.userId },
        timestamp: Date.now(),
        roomId,
        userId: message.userId
      }, ws); // Exclude the sender
    }
  
    private handleUserLeave(ws: WebSocket, message: WebSocketMessage) {
      const { roomId } = message;
      const room = this.rooms.get(roomId);
  
      if (room) {
        room.users.delete(ws);
        
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        } else {
          this.broadcastToRoom(roomId, {
            type: EventType.USER_LEAVE,
            payload: { userId: message.userId },
            timestamp: Date.now(),
            roomId,
            userId: message.userId
          });
        }
      }
    }
  
    private handleDisconnect(ws: WebSocket) {
      // Remove the disconnected user from all rooms
      this.rooms.forEach((room, roomId) => {
        if (room.users.has(ws)) {
          room.users.delete(ws);
          if (room.users.size === 0) {
            this.rooms.delete(roomId);
          }
        }
      });
    }
  
    private broadcastToRoom(roomId: string, message: WebSocketMessage, exclude?: WebSocket) {
      const room = this.rooms.get(roomId);
      if (room) {
        const messageStr = JSON.stringify(message);
        room.users.forEach(client => {
          if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });
      }
    }
  
    public getRoomCount(): number {
      return this.rooms.size;
    }
  
    public getUserCountInRoom(roomId: string): number {
      const room = this.rooms.get(roomId);
      return room ? room.users.size : 0;
    }
  }
