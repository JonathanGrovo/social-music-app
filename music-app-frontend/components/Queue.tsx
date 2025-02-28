'use client';

import { useState } from 'react';
import { QueueItem } from '../types';

interface QueueProps {
  queue: QueueItem[];
  onUpdateQueue: (queue: QueueItem[]) => void;
}

export default function Queue({ queue, onUpdateQueue }: QueueProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');

  const addToQueue = () => {
    if (!videoUrl.trim()) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    try {
      // Extract YouTube video ID
      let videoId = '';
      
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // YouTube
        if (videoUrl.includes('youtube.com/watch')) {
          const url = new URL(videoUrl);
          videoId = url.searchParams.get('v') || '';
        } else if (videoUrl.includes('youtu.be/')) {
          videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        } else if (videoUrl.includes('youtube.com/embed/')) {
          videoId = videoUrl.split('youtube.com/embed/')[1].split('?')[0];
        } else if (videoUrl.includes('youtube.com/shorts/')) {
          videoId = videoUrl.split('youtube.com/shorts/')[1].split('?')[0];
        }
      } else {
        // Try to treat input as a direct YouTube ID if it's 11 characters long
        const directId = videoUrl.trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(directId)) {
          videoId = directId;
        } else {
          setError('Unsupported URL format. Please use a YouTube URL or video ID.');
          return;
        }
      }

      if (!videoId) {
        setError('Could not extract YouTube video ID from URL');
        return;
      }

      // Create new queue item
      const newItem: QueueItem = {
        id: videoId,
        source: 'youtube',
        title: `YouTube Video (${videoId})` // This will be updated with actual title when played
      };

      // Add to queue
      onUpdateQueue([...queue, newItem]);
      setVideoUrl('');
      setError('');
    } catch (err) {
      setError('Invalid URL format');
    }
  };

  const removeFromQueue = (index: number) => {
    const newQueue = [...queue];
    newQueue.splice(index, 1);
    onUpdateQueue(newQueue);
  };

  // Filter to only show YouTube videos in the queue
  const youtubeQueue = (queue || []).filter(item => item.source === 'youtube');
  
  return (
    <div className="bg-card rounded-lg shadow-md p-4 border border-border">
      <h2 className="text-lg font-semibold mb-4 text-foreground">YouTube Queue</h2>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="flex mb-4">
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="flex-1 border rounded-l px-3 py-2 bg-input text-foreground border-border focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="YouTube URL or video ID"
        />
        <button
          onClick={addToQueue}
          className="bg-secondary hover:bg-secondary-hover text-white px-4 py-2 rounded-r"
        >
          Add
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2 text-foreground">Example URLs:</h3>
        <p className="text-xs text-muted-foreground">https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>
        <p className="text-xs text-muted-foreground">https://youtu.be/dQw4w9WgXcQ</p>
        <p className="text-xs text-muted-foreground">Or just paste the video ID: dQw4w9WgXcQ</p>
      </div>
      
      {youtubeQueue.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">Queue is empty</p>
      ) : (
        <div>
          <h3 className="font-medium text-foreground mb-2">Up Next ({youtubeQueue.length})</h3>
          <ul className="divide-y divide-border">
            {youtubeQueue.map((item, index) => (
              <li key={index} className="py-2">
                <div className="flex justify-between items-center">
                  <div className="truncate flex-1 pr-2">
                    <p className="font-medium truncate text-foreground">{item.title || `Video: ${item.id}`}</p>
                    <p className="text-sm text-muted-foreground">YouTube</p>
                  </div>
                  <button
                    onClick={() => removeFromQueue(queue.findIndex(q => q.id === item.id && q.source === item.source))}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}