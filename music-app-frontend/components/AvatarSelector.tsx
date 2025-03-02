'use client';

import { useState } from 'react';

interface AvatarSelectorProps {
  currentAvatarId: string;
  onSelect: (avatarId: string) => void;
  onCancel: () => void;
}

// Available avatars - add more as needed
const AVAILABLE_AVATARS = [
  'avatar1', 'avatar2', 'avatar3', 'avatar4', 'avatar5', 
  'avatar6', 'avatar7', 'avatar8', 'avatar9', 'avatar10'
];

export default function AvatarSelector({ 
  currentAvatarId, 
  onSelect, 
  onCancel 
}: AvatarSelectorProps) {
  const [selectedAvatarId, setSelectedAvatarId] = useState(currentAvatarId);
  
  // Handle selecting an avatar
  const handleSelect = () => {
    if (selectedAvatarId !== currentAvatarId) {
      onSelect(selectedAvatarId);
    } else {
      onCancel(); // No change, just cancel
    }
  };
  
  return (
    <div className="bg-accent rounded-lg p-3">
      <h4 className="text-sm font-semibold mb-2 text-foreground">Select Avatar</h4>
      
      <div className="grid grid-cols-5 gap-2 mb-3">
        {AVAILABLE_AVATARS.map((avatarId) => (
          <div 
            key={avatarId}
            className={`
              w-10 h-10 rounded-full overflow-hidden cursor-pointer
              ${selectedAvatarId === avatarId ? 'ring-2 ring-primary' : 'ring-1 ring-muted hover:ring-secondary'}
              transition-all
            `}
            onClick={() => setSelectedAvatarId(avatarId)}
          >
            <img 
              src={`/avatars/${avatarId}.png`} 
              alt={`Avatar ${avatarId}`} 
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
      
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm bg-muted hover:bg-accent-foreground/10 text-foreground rounded"
        >
          Cancel
        </button>
        <button
          onClick={handleSelect}
          className="px-3 py-1 text-sm bg-primary hover:bg-primary-hover text-white rounded"
        >
          Save
        </button>
      </div>
    </div>
  );
}