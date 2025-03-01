// utils/formatMessageTime.ts

/**
 * Formats a timestamp in Discord-style format:
 * - Today: "Today at 2:30 PM"
 * - Yesterday: "Yesterday at 2:30 PM"
 * - Other dates: "MM/DD/YYYY 2:30 PM"
 */
export function formatMessageTime(timestamp: number): string {
    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // Format the time part (hours and minutes with AM/PM)
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    const timeString = messageDate.toLocaleTimeString(undefined, timeOptions);
    
    // Check if the message is from today
    const isToday = messageDate.toDateString() === now.toDateString();
    if (isToday) {
      return `Today at ${timeString}`;
    }
    
    // Check if the message is from yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = messageDate.toDateString() === yesterday.toDateString();
    if (isYesterday) {
      return `Yesterday at ${timeString}`;
    }
    
    // For older messages, use the date format MM/DD/YYYY
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    };
    const dateString = messageDate.toLocaleDateString(undefined, dateOptions);
    return `${dateString} ${timeString}`;
  }