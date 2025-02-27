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
      setError('Please enter a valid URL');
      return;
    }

    try {
      // Extract YouTube video ID
      let videoId = '';
      let source: 'youtube' | 'soundcloud' = 'youtube';
      
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        // YouTube
        const url = new URL(videoUrl);
        if (videoUrl.includes('youtube.com/watch')) {
          videoId = url.searchParams.get('v') || '';
        } else if (videoUrl.includes('youtu.be/')) {
          videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        }
        source = 'youtube';
      } else if (videoUrl.includes('soundcloud.com')) {
        // SoundCloud - just store the full path
        videoId = videoUrl.split('soundcloud.com/')[1];
        source = 'soundcloud';
      }

      if (!videoId) {
        setError('Could not extract video ID from URL');
        return;
      }

      const newItem: QueueItem = {
        id: videoId,
        source: source,
        title: `${source}: ${videoId}` // This would ideally fetch the actual title
      };

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

  return (
    <div className="bg-white rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4">Queue</h2>
      
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
          className="flex-1 border rounded-l px-3 py-2"
          placeholder="YouTube or SoundCloud URL"
        />
        <button
          onClick={addToQueue}
          className="bg-green-500 text-white px-4 py-2 rounded-r"
        >
          Add
        </button>
      </div>
      
      {queue.length === 0 ? (
        <p className="text-gray-500 text-center py-4">Queue is empty</p>
      ) : (
        <ul className="divide-y">
          {queue.map((item, index) => (
            <li key={index} className="py-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.title || item.id}</p>
                  <p className="text-sm text-gray-500">{item.source}</p>
                </div>
                <button
                  onClick={() => removeFromQueue(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}