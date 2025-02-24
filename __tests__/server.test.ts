import request from 'supertest';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { createServer } from 'http';
import { app } from '../src/server';
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
  let io: Server;
  let serverSocket: any;
  let clientSocket: any;
  let httpServer: any;

  beforeAll((done) => {
    httpServer = createServer(app);
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  describe('Room Events', () => {
    it('should handle user joining a room', (done) => {
      const roomData = {
        roomId: 'test-room',
        userId: 'test-user'
      };
      
      clientSocket.emit(EventType.USER_JOIN, roomData);
      
      serverSocket.on(EventType.USER_JOIN, (data: any) => {
        expect(data).toHaveProperty('payload');
        expect(data.payload.userId).toBe(roomData.userId);
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('userId', roomData.userId);
        done();
      });
    });

    it('should handle user leaving a room', (done) => {
      const roomData = {
        roomId: 'test-room',
        userId: 'test-user'
      };
      
      clientSocket.emit(EventType.USER_LEAVE, roomData);
      
      serverSocket.on(EventType.USER_LEAVE, (data: any) => {
        expect(data).toHaveProperty('payload');
        expect(data.payload.userId).toBe(roomData.userId);
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('userId', roomData.userId);
        done();
      });
    });
  });

  describe('Chat Functionality', () => {
    it('should handle chat messages', (done) => {
      const message = {
        roomId: 'test-room',
        message: {
          payload: {
            content: 'Hello, World!'
          },
          timestamp: Date.now(),
          userId: 'test-user'
        }
      };
      
      clientSocket.emit(EventType.CHAT_MESSAGE, message);
      
      serverSocket.on(EventType.CHAT_MESSAGE, (data: any) => {
        expect(data).toHaveProperty('payload');
        expect(data.payload.content).toBe(message.message.payload.content);
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('userId', message.message.userId);
        done();
      });
    });
  });

  describe('Playback Synchronization', () => {
    it('should handle playback updates', (done) => {
      const playbackData = {
        roomId: 'test-room',
        update: {
          payload: {
            currentTime: 120,
            isPlaying: true,
            trackId: 'test-track'
          },
          timestamp: Date.now(),
          userId: 'test-user'
        }
      };
      
      clientSocket.emit(EventType.PLAYBACK_UPDATE, playbackData);
      
      serverSocket.on(EventType.PLAYBACK_UPDATE, (data: any) => {
        expect(data).toMatchObject(playbackData.update);
        done();
      });
    });
  });

  describe('Queue Management', () => {
    it('should handle queue updates', (done) => {
      const queueData = {
        roomId: 'test-room',
        update: {
          payload: {
            queue: [
              { id: 'track-1', source: 'youtube' },
              { id: 'track-2', source: 'soundcloud' }
            ]
          },
          timestamp: Date.now(),
          userId: 'test-user'
        }
      };
      
      clientSocket.emit(EventType.QUEUE_UPDATE, queueData);
      
      serverSocket.on(EventType.QUEUE_UPDATE, (data: any) => {
        expect(data).toMatchObject(queueData.update);
        done();
      });
    });
  });
});