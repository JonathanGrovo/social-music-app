'use client';

import { useState, useRef, useEffect } from 'react';

interface UsernameEditorProps {
  currentUsername: string;
  onUsernameChange: (newUsername: string) => void;
}

export default function UsernameEditor({ currentUsername, onUsernameChange }: UsernameEditorProps) {
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

  // Render either the editor form or display view
  return (
    <div className="relative min-h-[24px]">
      {isEditing ? (
        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          className="flex items-center space-x-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
            className="px-2 py-1 text-sm border rounded bg-input text-foreground border-border"
            placeholder="Enter username"
            maxLength={20}
          />
          <button 
            ref={saveButtonRef}
            type="button"
            onClick={handleSaveButtonClick}
            className="text-xs bg-primary hover:bg-primary-hover text-white px-2 py-1 rounded"
          >
            Save
          </button>
          <button 
            ref={cancelButtonRef}
            type="button" 
            onClick={handleCancel}
            className="text-xs bg-muted hover:bg-accent text-foreground px-2 py-1 rounded"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-center group">
          <span 
            className="cursor-pointer hover:underline"
            onClick={() => setIsEditing(true)}
          >
            {currentUsername}
          </span>
          <span 
            className="ml-1 text-xs text-muted-foreground cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            (You)
          </span>
          <div 
            className="ml-1 cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-muted-foreground group-hover:text-foreground hover:text-foreground transition-colors">
              <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}