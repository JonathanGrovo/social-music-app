// Sidebar.tsx - Main sidebar component that combines everything
import { useState, useEffect } from 'react';
import SidebarProfile from './SidebarProfile';
import ShareLinkButton from './ShareLinkButton';
import { UserInfo } from '../types';
import { Tooltip } from 'react-tooltip';
import useTooltipFix from '../hooks/useTooltipFix';  // If you have this custom hook

interface SidebarProps {
  roomId: string;
  roomName: string;
  connected: boolean;
  users: UserInfo[];
  currentUsername: string;
  currentClientId: string;
  currentAvatarId: string;
  onUsernameChange: (newUsername: string) => void;
  onAvatarChange: (newAvatarId: string) => void;
}

export default function Sidebar({
  roomId,
  roomName,
  connected,
  users,
  currentUsername,
  currentClientId,
  currentAvatarId,
  onUsernameChange,
  onAvatarChange
}: SidebarProps) {

    useTooltipFix();
  
  return (
    <div className="w-64 bg-card flex flex-col h-full">
      {/* Room header */}
      <div className="p-4">
        <h1 className="text-xl font-bold truncate text-foreground">
          {roomName ? roomName : 'Social Music Room'}
        </h1>
        <div className="text-sm mt-1">
          {connected ? (
            <span className="inline-flex items-center text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center text-red-500">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
              Disconnected
            </span>
          )}
        </div>
      </div>
      
      {/* Share link */}
      <ShareLinkButton roomId={roomId} />
      
      {/* User profile */}
      <SidebarProfile 
        username={currentUsername}
        avatarId={currentAvatarId}
        onUsernameChange={onUsernameChange}
        onAvatarChange={onAvatarChange}
      />
      
      {/* Users list */}
      <div className="flex-1 p-4 overflow-y-auto">
        <p className="text-sm text-muted-foreground mb-2">Users in Room ({users.length}):</p>
        <ul className="space-y-1">
            {Array.isArray(users) && users.map((user, index: number) => (
                <li 
                    key={`user-${user.clientId}`} 
                    className="flex items-center text-foreground py-1"
                >
            {/* Avatar with status indicator */}
                <div className="relative mr-3 flex-shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img 
                    src={`/avatars/${user.avatarId || 'avatar1'}.png`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                    />
                </div>
                <span 
                    className="h-3 w-3 rounded-full bg-green-500 absolute bottom-0 right-0 border border-card status-tooltip-trigger outline-none" 
                    data-tooltip-id={`status-tooltip-${index}`}
                    data-tooltip-place="top"
                    tabIndex={-1}
                ></span>
                </div>
              
              <div className="truncate min-w-0 flex-1 flex items-center py-0.5">
                <div className="flex flex-grow truncate min-w-0 items-center">
                  <span className="truncate max-w-[120px] inline-block leading-none text-foreground" title={user.username}>
                    {user.username}
                  </span>
                  
                  {user.isRoomOwner && (
                    <span 
                        className="text-yellow-500 ml-1 flex-shrink-0 inline-flex items-center status-tooltip-trigger" 
                        style={{ position: 'relative', top: '1px' }}
                        data-tooltip-id="room-owner-tooltip"
                    >
                        👑
                    </span>
                )}
                  
                  {user.clientId === currentClientId && 
                    <span className="ml-1 text-xs text-muted-foreground font-normal whitespace-nowrap flex-shrink-0">(You)</span>
                  }
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      
      {/* Audio controls placeholder */}
      <div className="p-4 border-t border-border">
        <h3 className="text-sm font-semibold mb-2 text-foreground">Audio Controls</h3>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Volume</span>
          <input type="range" className="w-32" />
        </div>
      </div>

        {/* Add these at the end, before the closing div */}
        <Tooltip 
            id="room-owner-tooltip" 
            content="Room Owner" 
            place="top" 
            positionStrategy="fixed"
            offset={5}
            className="status-tooltip"
        />

        {/* Create tooltips for each user */}
        {Array.isArray(users) && users.map((_, index: number) => (
            <Tooltip
                key={`status-tooltip-${index}`}
                id={`status-tooltip-${index}`}
                content="Active"
                place="top"
                positionStrategy="fixed"
                offset={5}
                className="status-tooltip"
            />
        ))}
    </div>
  );
}