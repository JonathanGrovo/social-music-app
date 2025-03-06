// SidebarProfile.tsx - Handle user profile in the sidebar
import { useState, useRef } from 'react';
import AvatarSelector from './AvatarSelector';
import UsernameEditor from './UsernameEditor';

interface SidebarProfileProps {
  username: string;
  avatarId: string;
  onUsernameChange: (newUsername: string) => void;
  onAvatarChange: (newAvatarId: string) => void;
}

export default function SidebarProfile({
  username,
  avatarId,
  onUsernameChange,
  onAvatarChange
}: SidebarProfileProps) {
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  
  return (
    <div className="p-4 border-b border-border">
      <h3 className="text-sm font-semibold mb-2 text-foreground">Your Profile</h3>
      <div className="flex items-center">
        {/* Avatar with edit button */}
        <div className="relative mr-3 flex-shrink-0">
          <div 
            className="w-12 h-12 rounded-full overflow-hidden cursor-pointer border-2 border-primary"
            onClick={() => setIsEditingAvatar(true)}
          >
            <img 
              src={`/avatars/${avatarId}.png`} 
              alt="Your Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <button 
            className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            onClick={() => setIsEditingAvatar(true)}
          >
            ✎
          </button>
        </div>
        
        {/* Username editor */}
        <div className="min-w-0 flex-1">
          <UsernameEditor 
            currentUsername={username} 
            onUsernameChange={onUsernameChange}
            showYouIndicator={false}
          />
        </div>
      </div>
      
      {/* Avatar selector dialog */}
      {isEditingAvatar && (
        <div className="mt-3">
          <AvatarSelector 
            currentAvatarId={avatarId}
            onSelect={(newAvatarId) => {
              onAvatarChange(newAvatarId);
              setIsEditingAvatar(false);
            }}
            onCancel={() => setIsEditingAvatar(false)}
          />
        </div>
      )}
    </div>
  );
}