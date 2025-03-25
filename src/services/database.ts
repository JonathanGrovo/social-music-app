// src/services/database.ts
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define message structure to match your existing types
interface ChatMessage {
  username: string;
  content: string;
  timestamp: number;
  clientId: string;
  avatarId?: string;
}

export class DatabaseService {
  private db: BetterSqlite3.Database;
  
  constructor() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const dbPath = path.join(dataDir, 'chatHistory.db');
    this.db = new BetterSqlite3(dbPath);
    
    // Initialize database tables
    this.initializeTables();
  }
  
  private initializeTables(): void {

    // Create rooms table if it doesn't exist
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_active INTEGER NOT NULL
        );
    `);

    // Create messages table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roomId TEXT NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        clientId TEXT NOT NULL,
        avatarId TEXT DEFAULT 'avatar1',
        
        -- Add indices for faster querying
        UNIQUE(roomId, clientId, timestamp)
      );
      
      -- Create an index for faster retrieval by roomId and timestamp
      CREATE INDEX IF NOT EXISTS idx_messages_room_time 
      ON messages(roomId, timestamp);
    `);
    
    console.log('Database tables initialized');
  }
  
  /**
 * Save a room to the database
 */
saveRoom(roomId: string, roomName: string): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO rooms (id, name, created_at, last_active)
        VALUES (?, ?, ?, ?)
      `);
      
      const now = Date.now();
      stmt.run(roomId, roomName, now, now);
    } catch (error) {
      console.error(`Error saving room to database:`, error);
    }
  }
  
  /**
   * Update room's last active timestamp
   */
  touchRoom(roomId: string): void {
    try {
      const stmt = this.db.prepare(`
        UPDATE rooms SET last_active = ? WHERE id = ?
      `);
      
      stmt.run(Date.now(), roomId);
    } catch (error) {
      console.error(`Error updating room last_active:`, error);
    }
  }
  
  /**
   * Check if a room exists
   */
  roomExists(roomId: string): boolean {
    try {
      const stmt = this.db.prepare(`
        SELECT 1 FROM rooms WHERE id = ?
      `);
      
      const result = stmt.get(roomId);
      return !!result;
    } catch (error) {
      console.error(`Error checking if room exists:`, error);
      return false;
    }
  }
  
  /**
   * Get room details
   */
  getRoom(roomId: string): { id: string, name: string, created_at: number, last_active: number } | null {
    try {
      const stmt = this.db.prepare(`
        SELECT id, name, created_at, last_active FROM rooms WHERE id = ?
      `);
      
      return stmt.get(roomId) as any || null;
    } catch (error) {
      console.error(`Error getting room:`, error);
      return null;
    }
  }
  
  /**
   * Get all active rooms (active in the last 24 hours)
   */
  getActiveRooms(): Array<{ id: string, name: string, created_at: number, last_active: number }> {
    try {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      const stmt = this.db.prepare(`
        SELECT id, name, created_at, last_active
        FROM rooms
        WHERE last_active > ?
        ORDER BY last_active DESC
      `);
      
      return stmt.all(oneDayAgo) as any[];
    } catch (error) {
      console.error(`Error getting active rooms:`, error);
      return [];
    }
  }

  /**
   * Save a new chat message to the database
   */
  saveMessage(roomId: string, message: ChatMessage): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO messages (
          roomId, username, content, timestamp, clientId, avatarId
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        roomId,
        message.username,
        message.content,
        message.timestamp,
        message.clientId,
        message.avatarId || 'avatar1'
      );
    } catch (error) {
      console.error(`Error saving message to database:`, error);
    }
  }
  
  /**
   * Get all messages for a specific room
   */
  getMessagesByRoom(roomId: string): ChatMessage[] {
    try {
      const stmt = this.db.prepare(`
        SELECT username, content, timestamp, clientId, avatarId
        FROM messages
        WHERE roomId = ?
        ORDER BY timestamp ASC
      `);
      
      return stmt.all(roomId) as ChatMessage[];
    } catch (error) {
      console.error(`Error fetching messages for room ${roomId}:`, error);
      return [];
    }
  }
  
  /**
   * Get limited number of recent messages for a room
   */
  getRecentMessages(roomId: string, limit: number = 100): ChatMessage[] {
    try {
      const stmt = this.db.prepare(`
        SELECT username, content, timestamp, clientId, avatarId
        FROM messages
        WHERE roomId = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);
      
      // Reverse the results to get chronological order
      const messages = stmt.all(roomId, limit) as ChatMessage[];
      return messages.reverse();
    } catch (error) {
      console.error(`Error fetching recent messages for room ${roomId}:`, error);
      return [];
    }
  }

  /**
   * Get paginated messages for a room
   */
  getPaginatedMessages(roomId: string, page: number = 0, pageSize: number = 10): ChatMessage[] {
    try {
      console.log(`Getting page ${page} of messages for room ${roomId}, pageSize=${pageSize}`);
      const offset = page * pageSize;
      
      const stmt = this.db.prepare(`
        SELECT username, content, timestamp, clientId, avatarId
        FROM messages
        WHERE roomId = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `);
      
      const messages = stmt.all(roomId, pageSize, offset) as ChatMessage[];
      console.log(`Found ${messages.length} messages for page ${page}`);
      
      // Messages should be in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      console.error(`Error fetching paginated messages for room ${roomId}:`, error);
      return [];
    }
  }

  /**
 * Get the total count of messages in a room
 */
  getMessageCount(roomId: string): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE roomId = ?
      `);
      
      const result = stmt.get(roomId) as { count: number };
      return result.count;
    } catch (error) {
      console.error(`Error counting messages for room ${roomId}:`, error);
      return 0;
    }
  }

  /**
   * Close the database connection when shutting down
   */
  close(): void {
    this.db.close();
  }
}

// Create a singleton instance
const dbService = new DatabaseService();
export default dbService;