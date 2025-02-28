// Username generator
export function generateUsername(): string {
    const adjectives = [
      'Happy', 'Lucky', 'Sunny', 'Clever', 'Swift', 
      'Bright', 'Cool', 'Jazzy', 'Snazzy', 'Funky',
      'Smooth', 'Calm', 'Wild', 'Brave', 'Vivid',
      'Nifty', 'Epic', 'Dapper', 'Quirky', 'Lively'
    ];
  
    const nouns = [
      'Panda', 'Tiger', 'Dolphin', 'Eagle', 'Wolf',
      'Fox', 'Lion', 'Raven', 'Hawk', 'Bear',
      'Dragon', 'Phoenix', 'Falcon', 'Shark', 'Owl',
      'Lynx', 'Badger', 'Rhino', 'Koala', 'Penguin'
    ];
  
    // Get random elements
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    // Add a random number between 1-999
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${adjective}${noun}${number}`;
  }