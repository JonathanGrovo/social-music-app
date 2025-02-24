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
  let thirdClientSocket: any; // Added for testing history
  let port: number;

  beforeAll((done) => {
    httpServer = createServer(app);
    socketManager = new SocketManager(httpServer);
    
    httpServer.listen(() => {
      port = (httpServer.address() as any).port;
      console.log(`Test server listening on port ${port}`);
      
      done();
    });
  });

  beforeEach((done) => {
    // Create fresh socket connections for each test
    clientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: true
    });
    
    secondClientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: true
    });
    
    thirdClientSocket = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: true
    });
    
    let connectedCount = 0;
    const checkDone = () => {
      connectedCount++;
      if (connectedCount === 3) done();
    };

    clientSocket.on('connect', () => {
      console.log('First client connected');
      checkDone();
    });

    secondClientSocket.on('connect', () => {
      console.log('Second client connected');
      checkDone();
    });
    
    thirdClientSocket.on('connect', () => {
      console.log('Third client connected');
      checkDone();
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    if (secondClientSocket.connected) {
      secondClientSocket.disconnect();
    }
    if (thirdClientSocket.connected) {
      thirdClientSocket.disconnect();
    }
  });

  afterAll(() => {
    httpServer.close();
  });

  describe('Room Events', () => {
    const roomId = 'test-room';
    
    it('should handle user joining a room', (done) => {
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

    it('should handle user leaving a room', (done) => {
      const userId = 'test-user';

      secondClientSocket.once(EventType.USER_LEAVE, (data: any) => {
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

      // Join both clients to the room
      secondClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user2' });
      
      setTimeout(() => {
        clientSocket.emit(EventType.USER_JOIN, { roomId, userId });
        
        // Then have the first client leave
        setTimeout(() => {
          clientSocket.emit(EventType.USER_LEAVE);
        }, 100);
      }, 100);
    });

    it('should handle chat messages and persist history', (done) => {
      const message1 = {
        roomId,
        userId: 'user1',
        payload: { content: 'First message' },
        timestamp: Date.now()
      };
      
      const message2 = {
        roomId,
        userId: 'user2',
        payload: { content: 'Second message' },
        timestamp: Date.now() + 100
      };

      // Join first two clients to the room
      clientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user1' });
      
      setTimeout(() => {
        secondClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user2' });
        
        // Send chat messages
        setTimeout(() => {
          clientSocket.emit(EventType.CHAT_MESSAGE, message1);
          
          setTimeout(() => {
            secondClientSocket.emit(EventType.CHAT_MESSAGE, message2);
            
            // Now join with third client and verify it gets chat history
            setTimeout(() => {
              thirdClientSocket.once(EventType.SYNC_RESPONSE, (data: any) => {
                try {
                  expect(data.payload.chatHistory).toHaveLength(2);
                  expect(data.payload.chatHistory[0].content).toEqual('First message');
                  expect(data.payload.chatHistory[1].content).toEqual('Second message');
                  done();
                } catch (error) {
                  done(error);
                }
              });
              
              thirdClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user3' });
            }, 100);
          }, 100);
        }, 100);
      }, 100);
    });

    it('should handle queue updates and persistence', (done) => {
      const queueUpdate = {
        roomId,
        userId: 'user1',
        payload: {
          queue: [
            { id: 'youtube-123', source: 'youtube', title: 'Test Song 1' },
            { id: 'soundcloud-456', source: 'soundcloud', title: 'Test Song 2' }
          ]
        },
        timestamp: Date.now()
      };

      // Join first client and update queue
      clientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user1' });
      
      setTimeout(() => {
        clientSocket.emit(EventType.QUEUE_UPDATE, queueUpdate);
        
        // Join with second client and verify it gets the queue
        setTimeout(() => {
          secondClientSocket.once(EventType.SYNC_RESPONSE, (data: any) => {
            try {
              expect(data.payload.queue).toHaveLength(2);
              expect(data.payload.queue[0].id).toEqual('youtube-123');
              expect(data.payload.queue[1].id).toEqual('soundcloud-456');
              done();
            } catch (error) {
              done(error);
            }
          });
          
          secondClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user2' });
        }, 100);
      }, 100);
    });

    it('should handle playback updates and sync accurately', (done) => {
      const playbackUpdate = {
        roomId,
        userId: 'user1',
        payload: {
          currentTime: 30.5,
          isPlaying: true,
          trackId: 'youtube-123',
          source: 'youtube'
        },
        timestamp: Date.now()
      };

      // Join first client and update playback
      clientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user1' });
      
      setTimeout(() => {
        clientSocket.emit(EventType.PLAYBACK_UPDATE, playbackUpdate);
        
        // Wait a bit to ensure time passes
        setTimeout(() => {
          // Join with second client and verify it gets synced playback
          secondClientSocket.once(EventType.SYNC_RESPONSE, (data: any) => {
            try {
              expect(data.payload.currentTrack).toBeDefined();
              expect(data.payload.currentTrack.id).toEqual('youtube-123');
              // The startTime should be greater than our original time due to time passing
              expect(data.payload.currentTrack.startTime).toBeGreaterThanOrEqual(30.5);
              done();
            } catch (error) {
              done(error);
            }
          });
          
          secondClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user2' });
        }, 500); // Wait 500ms to test time advance
      }, 100);
    });

    it('should track users in a room correctly', (done) => {
      // Join first client
      clientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user1' });
      
      setTimeout(() => {
        // Join second client
        secondClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user2' });
        
        setTimeout(() => {
          // Join third client and check user list
          thirdClientSocket.once(EventType.SYNC_RESPONSE, (data: any) => {
            try {
              expect(data.payload.users).toContain('user1');
              expect(data.payload.users).toContain('user2');
              expect(data.payload.users).toContain('user3');
              
              // Now have second client leave and check that it's removed
              secondClientSocket.emit(EventType.USER_LEAVE);
              
              setTimeout(() => {
                // Request sync to get updated user list
                thirdClientSocket.once(EventType.SYNC_RESPONSE, (newData: any) => {
                  try {
                    expect(newData.payload.users).toContain('user1');
                    expect(newData.payload.users).not.toContain('user2');
                    expect(newData.payload.users).toContain('user3');
                    done();
                  } catch (error) {
                    done(error);
                  }
                });
                
                thirdClientSocket.emit(EventType.SYNC_REQUEST, {
                  roomId,
                  userId: 'user3',
                  payload: {},
                  timestamp: Date.now()
                });
              }, 100);
            } catch (error) {
              done(error);
            }
          });
          
          thirdClientSocket.emit(EventType.USER_JOIN, { roomId, userId: 'user3' });
        }, 100);
      }, 100);
    });
  });
});