// utils/avatar.ts

// Available avatars - should match what's available in public/avatars folder
export const AVAILABLE_AVATARS = [
  'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 
  'avatar6', 'avatar7', 'avatar8', 'avatar9', 'avatar10'
];

/**
 * Generate a random avatar ID
 * @returns A random avatar ID from the available avatars
 */
export function generateRandomAvatarId(): string {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_AVATARS.length);
  return AVAILABLE_AVATARS[randomIndex];
}

/**
 * Get the path to an avatar image
 * @param avatarId The avatar ID
 * @returns The path to the avatar image
 */
export function getAvatarPath(avatarId: string): string {
  // Default to avatar1 if the provided ID isn't valid
  const validId = AVAILABLE_AVATARS.includes(avatarId) ? avatarId : 'avatar1';
  return `/avatars/${validId}.png`;
}