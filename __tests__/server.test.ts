import request from 'supertest';
import { Server } from 'http';
import { io as Client } from 'socket.io-client';
import { createServer } from 'http';
import { app } from '../src/server';
import { SocketManager } from '../src/config/socket';
import { EventType } from '../src/types/socket';

describe('API Endpoints', () => {
  const agent = request(app);

  describe('Health Check', () => {
    it('should return 200 OK', async () => {
      const response = await agent.get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'healthy' });
    });
  });

  describe('Room Management', () => {
    it('should create a new room', async () => {
      const response = await agent
        .post('/api/rooms')
        .send({ name: 'Test Room' });
      
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Room created successfully',
        room: {
          id: expect.any(String),
          name: 'Test Room'
        }
      });
    });

    it('should reject room creation without name', async () => {
      const response = await agent
        .post('/api/rooms')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toEqual({
        message: 'Room name is required',
        status: 400
      });
    });

    it('should reject room creation with long name', async () => {
      const longName = 'a'.repeat(51);
      const response = await agent
        .post('/api/rooms')
        .send({ name: longName });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toEqual({
        message: 'Room name must be less than 50 characters',
        status: 400
      });
    });

    it('should get all rooms', async () => {
      const response = await agent.get('/api/rooms');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rooms');
      expect(Array.isArray(response.body.rooms)).toBe(true);
    });

    it('should get a specific room', async () => {
      const createResponse = await agent
        .post('/api/rooms')
        .send({ name: 'Test Room' });
      
      const roomId = createResponse.body.room.id;
      
      const response = await agent.get(`/api/rooms/${roomId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('room');
      expect(response.body.room).toHaveProperty('id', roomId);
    });

    it('should delete a room', async () => {
      const createResponse = await agent
        .post('/api/rooms')
        .send({ name: 'Test Room' });
      
      const roomId = createResponse.body.room.id;
      
      const response = await agent.delete(`/api/rooms/${roomId}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Room deleted successfully',
        roomId
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes', async () => {
      const response = await agent.get('/nonexistent-route');
      expect(response.status).toBe(404);
      expect(response.body.error).toEqual({
        message: 'Route not found',
        status: 404
      });
    });
  });
});

describe('WebSocket Functionality', () => {
  let httpServer: Server;
  let socketManager: SocketManager;
  let clientSocket: any;
  let secondClientSocket: any;

  beforeAll((done) => {
    httpServer = createServer(app);
    socketManager = new SocketManager(httpServer);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      console.log(`Test server listening on port ${port}`);
      
      clientSocket = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        autoConnect: true
      });
      
      secondClientSocket = Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        autoConnect: true
      });
      
      let connectedCount = 0;
      const checkDone = () => {
        connectedCount++;
        if (connectedCount === 2) done();
      };

      clientSocket.on('connect', () => {
        console.log('First client connected');
        checkDone();
      });

      secondClientSocket.on('connect', () => {
        console.log('Second client connected');
        checkDone();
      });
    });
  });

  afterAll(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (secondClientSocket.connected) {
      secondClientSocket.disconnect();
    }
    httpServer.close();
  });

  describe('Room Events', () => {
    it('should handle user joining a room', (done) => {
      const roomId = 'test-room';
      const userId = 'test-user';

      secondClientSocket.once(EventType.USER_JOIN, (data: any) => {
        try {
          expect(data).toEqual(expect.objectContaining({
            roomId: roomId,
            payload: { userId: userId },
            userId: userId
          }));
          done();
        } catch (error) {
          done(error);
        }
      });

      // Join with second client first
      secondClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user2' });
      
      // Then emit join event from first client
      setTimeout(() => {
        clientSocket.emit(EventType.USER_JOIN, { roomId, userId });
      }, 100);
    });

    it('should handle chat messages', (done) => {
      const roomId = 'test-room';
      const message = {
        roomId,
        userId: 'test-user',
        payload: { content: 'Hello, World!' },
        timestamp: Date.now()
      };

      secondClientSocket.once(EventType.CHAT_MESSAGE, (data: any) => {
        try {
          expect(data).toEqual(expect.objectContaining({
            roomId: message.roomId,
            userId: message.userId,
            payload: message.payload
          }));
          done();
        } catch (error) {
          done(error);
        }
      });

      // Make sure both clients are in the room
      secondClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user2' });
      setTimeout(() => {
        clientSocket.emit(EventType.USER_JOIN, { roomId, userId: message.userId });
        setTimeout(() => {
          clientSocket.emit(EventType.CHAT_MESSAGE, message);
        }, 100);
      }, 100);
    });
  });
});