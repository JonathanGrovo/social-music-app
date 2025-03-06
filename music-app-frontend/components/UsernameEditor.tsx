'use client';

import { useState, useRef, useEffect } from 'react';

interface UsernameEditorProps {
  currentUsername: string;
  onUsernameChange: (newUsername: string) => void;
  showYouIndicator?: boolean; // Optional prop to control (You) indicator display
}

// Discord-like username character limit
const USERNAME_MAX_LENGTH = 25;

export default function UsernameEditor({ 
  currentUsername, 
  onUsernameChange,
  showYouIndicator = true // Default to showing the (You) indicator
}: UsernameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(currentUsername);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  
  // Update local state when prop changes
  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);
  
  // When editing starts, focus the input
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      inputRef.current.select();
    }
  }, [isEditing]);
  
  // This is the main save function
  const handleSave = () => {
    const trimmedName = username.trim();
    
    if (trimmedName && trimmedName !== currentUsername) {
      onUsernameChange(trimmedName);
    }
    
    setIsEditing(false);
  };
  
  // Handle form submission (Enter key)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };
  
  // Direct handler for Save button click
  const handleSaveButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event bubbling
    handleSave();
  };
  
  // Handle cancel action
  const handleCancel = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Stop event bubbling
    }
    setUsername(currentUsername);
    setIsEditing(false);
  };
  
  // Handle clicking outside to cancel, but exclude form elements
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Don't do anything if not in editing mode
      if (!isEditing) return;
      
      // Get all the elements we need to check
      const clickedElement = e.target as Node;
      const form = formRef.current;
      const input = inputRef.current;
      const saveButton = saveButtonRef.current;
      const cancelButton = cancelButtonRef.current;
      
      // If clicked element is not part of our form or buttons
      if (form && 
          !form.contains(clickedElement) && 
          input !== clickedElement && 
          saveButton !== clickedElement && 
          cancelButton !== clickedElement) {
        handleCancel();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, currentUsername]);
  
  // Handle escape key to cancel
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (isEditing && e.key === 'Escape') {
        handleCancel();
      }
    }
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isEditing, currentUsername]);

  // Character count calculation and display
  const characterCount = username.length;
  const isAtLimit = characterCount >= USERNAME_MAX_LENGTH;

  // Render either the editor form or display view
  return (
    <div className="relative min-h-[24px] max-w-full">
      {isEditing ? (
        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          className="flex flex-col items-start space-y-2 max-w-full"
        >
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={(e) => {
              // Limit to max length
              if (e.target.value.length <= USERNAME_MAX_LENGTH) {
                setUsername(e.target.value);
              }
            }}
            className={`px-2 py-1 text-sm border rounded bg-input text-foreground border-border w-full ${
              isAtLimit ? 'border-red-500' : ''
            }`}
            placeholder="Enter username"
            maxLength={USERNAME_MAX_LENGTH}
          />
          
          <div className="flex items-center justify-between w-full">
            <div className={`text-xs ${isAtLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
              {characterCount}/{USERNAME_MAX_LENGTH}
            </div>
            
            <div className="flex space-x-2">
              <button 
                ref={cancelButtonRef}
                type="button" 
                onClick={handleCancel}
                className="text-xs bg-muted hover:bg-accent text-foreground px-2 py-1 rounded"
              >
                Cancel
              </button>
              <button 
                ref={saveButtonRef}
                type="submit"
                className="text-xs bg-primary hover:bg-primary-hover text-white px-2 py-1 rounded"
                disabled={username.trim().length === 0 || username === currentUsername}
              >
                Save
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex items-center group overflow-hidden overflow-ellipsis">
          <span 
            className="cursor-pointer hover:underline truncate max-w-[300px]"
            onClick={() => setIsEditing(true)}
            title={currentUsername}
          >
            {currentUsername}
          </span>
          {showYouIndicator && (
            <span 
              className="ml-1 text-xs text-muted-foreground font-normal whitespace-nowrap"
              onClick={() => setIsEditing(true)}
            >
              (You)
            </span>
          )}
          <div 
            className="ml-1 cursor-pointer flex-shrink-0"
            onClick={() => setIsEditing(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-muted-foreground group-hover:text-foreground hover:text-foreground transition-colors">
              <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25-1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}