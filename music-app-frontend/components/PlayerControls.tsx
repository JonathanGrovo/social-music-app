'use client';

import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';

interface PlayerControlsProps {
  currentTrack?: {
    id: string;
    source: 'youtube' | 'soundcloud';
    startTime: number;
    isPlaying: boolean;
  };
  onPlaybackUpdate: (currentTime: number, isPlaying: boolean, trackId: string, source: 'youtube' | 'soundcloud') => void;
}

export default function PlayerControls({ currentTrack, onPlaybackUpdate }: PlayerControlsProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  
  // Sync with remote track state
  useEffect(() => {
    if (currentTrack && !isSeeking) {
      setLocalIsPlaying(currentTrack.isPlaying);
      
      // If we're more than 2 seconds off, update our position
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      if (Math.abs(currentTime - currentTrack.startTime) > 2) {
        playerRef.current?.seekTo(currentTrack.startTime, 'seconds');
      }
    }
  }, [currentTrack, isSeeking]);
  
  // Get video URL based on source and ID
  const getVideoUrl = () => {
    if (!currentTrack) return '';
    
    if (currentTrack.source === 'youtube') {
      return `https://www.youtube.com/watch?v=${currentTrack.id}`;
    } else if (currentTrack.source === 'soundcloud') {
      return `https://soundcloud.com/${currentTrack.id}`;
    }
    return '';
  };
  
  const handlePlay = () => {
    setLocalIsPlaying(true);
    if (currentTrack) {
      onPlaybackUpdate(
        playerRef.current?.getCurrentTime() || 0,
        true,
        currentTrack.id,
        currentTrack.source
      );
    }
  };
  
  const handlePause = () => {
    setLocalIsPlaying(false);
    if (currentTrack) {
      onPlaybackUpdate(
        playerRef.current?.getCurrentTime() || 0,
        false,
        currentTrack.id,
        currentTrack.source
      );
    }
  };
  
  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isSeeking) {
      setPlaybackPosition(state.playedSeconds);
    }
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };
  
  const handleSeekStart = () => {
    setIsSeeking(true);
  };
  
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaybackPosition(parseFloat(e.target.value));
  };
  
  const handleSeekEnd = () => {
    setIsSeeking(false);
    playerRef.current?.seekTo(playbackPosition);
    
    if (currentTrack) {
      onPlaybackUpdate(
        playbackPosition,
        localIsPlaying,
        currentTrack.id,
        currentTrack.source
      );
    }
  };
  
  // Format time as minutes:seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      {currentTrack ? (
        <>
          <div className="hidden">
            <ReactPlayer
              ref={playerRef}
              url={getVideoUrl()}
              playing={localIsPlaying}
              controls={false}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
              onDuration={handleDuration}
              width="0"
              height="0"
            />
          </div>
          
          <div className="mb-2">
            <p className="font-semibold">Currently Playing:</p>
            <p className="text-gray-600">{currentTrack.id}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => localIsPlaying ? handlePause() : handlePlay()}
              className="bg-blue-500 text-white px-4 py-2 rounded-full"
            >
              {localIsPlaying ? 'Pause' : 'Play'}
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step="any"
                value={playbackPosition}
                onChange={handleSeekChange}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekEnd}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{formatTime(playbackPosition)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500">No track is currently playing</p>
          <p className="text-sm text-gray-400 mt-2">Add something to the queue to get started</p>
        </div>
      )}
    </div>
  );
}