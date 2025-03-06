// hooks/useMessageRecovery.ts
import { useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

/**
 * Hook to protect against message loss by maintaining a backup
 * of chat history in localStorage
 */
export function useMessageRecovery(
  messages: ChatMessage[],
  roomId: string,
  maxStoredMessages: number = 100
) {
  // Use a ref to track the latest messages without causing re-renders
  const latestMessagesRef = useRef<ChatMessage[]>(messages);
  
  // Keep our ref updated with the latest messages
  useEffect(() => {
    if (messages && messages.length > 0) {
      latestMessagesRef.current = messages;
      
      try {
        // Store to localStorage as backup (limit to last 100 messages to prevent storage issues)
        const messagesToStore = messages.slice(-maxStoredMessages);
        localStorage.setItem(`chat_backup_${roomId}`, JSON.stringify(messagesToStore));
      } catch (e) {
        console.warn('Failed to store messages backup', e);
      }
    }
  }, [messages, roomId, maxStoredMessages]);
  
  // Check localStorage for backup messages on mount
  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem(`chat_backup_${roomId}`);
      if (storedMessages) {
        const parsedMessages = JSON.parse(storedMessages) as ChatMessage[];
        
        // Only use backup if it has messages and our current list is empty
        if (parsedMessages.length > 0 && messages.length === 0) {
          console.info(`Recovered ${parsedMessages.length} messages from backup`);
          latestMessagesRef.current = parsedMessages;
        }
      }
    } catch (e) {
      console.warn('Failed to load messages backup', e);
    }
  }, [roomId, messages.length]);
  
  // Function to get the current message history (either from props or backup)
  const getMessages = () => {
    if (messages && messages.length > 0) {
      return messages;
    } else {
      return latestMessagesRef.current;
    }
  };
  
  // Function to clear the backup (e.g., when changing rooms)
  const clearBackup = () => {
    try {
      localStorage.removeItem(`chat_backup_${roomId}`);
    } catch (e) {
      console.warn('Failed to clear messages backup', e);
    }
  };
  
  return {
    getMessages,
    clearBackup
  };
}

export default useMessageRecovery;