// scripts/dbAdmin.ts
import dbService from '../src/services/database';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function promptUser() {
  console.log('\nDatabase Admin Tool');
  console.log('------------------');
  console.log('1. Count messages in a room');
  console.log('2. Backup database');
  console.log('3. Delete a specific room');
  console.log('4. Delete ALL rooms');
  console.log('5. Exit');
  
  rl.question('Select an option: ', (answer) => {
    switch (answer) {
      case '1':
        countMessagesInRoom();
        break;
      case '2':
        backupDatabase();
        break;
      case '3':
        deleteRoom();
        break;
      case '4':
        deleteAllRooms();
        break;
      case '5':
        console.log('Exiting...');
        dbService.close();
        rl.close();
        break;
      default:
        console.log('Invalid option');
        promptUser();
    }
  });
}

function countMessagesInRoom() {
  rl.question('Enter room ID: ', (roomId) => {
    try {
      const messages = dbService.getMessagesByRoom(roomId);
      console.log(`Room ${roomId} has ${messages.length} messages.`);
      
      if (messages.length > 0) {
        const firstMsg = new Date(messages[0].timestamp).toISOString();
        const lastMsg = new Date(messages[messages.length - 1].timestamp).toISOString();
        console.log(`First message: ${firstMsg}`);
        console.log(`Last message: ${lastMsg}`);
      }
    } catch (err) {
      console.error('Error counting messages:', err);
    }
    
    promptUser();
  });
}

function backupDatabase() {
  console.log('Creating database backup...');
  // Implement backup logic here, e.g., using fs to copy the database file
  console.log('Backup complete!');
  promptUser();
}

function deleteRoom() {
  rl.question('Enter room ID to delete: ', (roomId) => {
    try {
      const deleted = dbService.deleteRoom(roomId);
      if (deleted) {
        console.log(`Room ${roomId} successfully deleted from database`);
      } else {
        console.log(`Room ${roomId} not found in database`);
      }
    } catch (err) {
      console.error('Error deleting room:', err);
    }
    
    promptUser();
  });
}

function deleteAllRooms() {
  rl.question('Are you sure you want to delete ALL rooms? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
      try {
        const count = dbService.deleteAllRooms();
        console.log(`Successfully deleted ${count} rooms from database`);
      } catch (err) {
        console.error('Error deleting all rooms:', err);
      }
    } else {
      console.log('Operation cancelled');
    }
    
    promptUser();
  });
}

// Start the tool
promptUser();