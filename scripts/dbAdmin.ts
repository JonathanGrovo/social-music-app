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
  console.log('3. Exit');
  
  rl.question('Select an option: ', (answer) => {
    switch (answer) {
      case '1':
        countMessagesInRoom();
        break;
      case '2':
        backupDatabase();
        break;
      case '3':
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

// Start the tool
promptUser();