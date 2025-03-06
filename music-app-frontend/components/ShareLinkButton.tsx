// ShareLinkButton.tsx - For copying room links with feedback
import { useState } from 'react';

interface ShareLinkButtonProps {
  roomId: string;
}

export default function ShareLinkButton({ roomId }: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate room URL
  const roomUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/room/${roomId}` 
    : '';
  
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomUrl)
        .then(() => {
          setCopied(true);
          // Reset the copied state after 2 seconds
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  };
  
  return (
    <div className="flex flex-col px-4 py-2">
      <p className="text-sm text-muted-foreground mb-2">Share this link:</p>
      <div className="flex items-center">
        <p className="font-mono text-xs bg-muted p-2 rounded-l text-foreground truncate flex-1">
          {roomUrl}
        </p>
        <button 
          onClick={handleCopy}
          className="flex items-center bg-muted hover:bg-accent text-foreground px-2 py-2 rounded-r border-l border-border"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}