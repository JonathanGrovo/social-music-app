// utils/avatar.ts

// List of avatar options (each has a unique ID and path)
export const avatarOptions = [
    { id: 'avatar1', path: '/avatars/avatar1.png' },
    { id: 'avatar2', path: '/avatars/avatar2.png' },
    { id: 'avatar3', path: '/avatars/avatar3.png' },
    { id: 'avatar4', path: '/avatars/avatar4.png' },
    { id: 'avatar5', path: '/avatars/avatar5.png' },
    { id: 'avatar6', path: '/avatars/avatar6.png' },
    { id: 'avatar7', path: '/avatars/avatar7.png' },
    { id: 'avatar8', path: '/avatars/avatar8.png' },
    { id: 'avatar9', path: '/avatars/avatar1.png' },
    { id: 'avatar10', path: '/avatars/avatar1.png' },
    { id: 'avatar11', path: '/avatars/avatar1.png' },
    { id: 'avatar12', path: '/avatars/avatar1.png' },
    { id: 'avatar13', path: '/avatars/avatar1.png' },
  ];
  
  /**
   * Assigns a random avatar ID from available options
   */
  export function generateRandomAvatarId(): string {
    const randomIndex = Math.floor(Math.random() * avatarOptions.length);
    return avatarOptions[randomIndex].id;
  }
  
  /**
   * Gets avatar path by ID
   */
  export function getAvatarPath(avatarId: string): string {
    const avatar = avatarOptions.find(option => option.id === avatarId);
    
    // Return the found avatar or default to the first one
    return avatar ? avatar.path : avatarOptions[0].path;
  }