'use client';

import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player/youtube';
import { QueueItem } from '../types';

// TEST FLAG - Set to true to force unmuted autoplay for testing
const FORCE_UNMUTED = true;

interface PlayerControlsProps {
  currentTrack?: {
    id: string;
    source: 'youtube' | 'soundcloud';
    startTime: number;
    isPlaying: boolean;
  };
  queue: QueueItem[]; 
  onPlaybackUpdate: (currentTime: number, isPlaying: boolean, trackId: string, source: 'youtube' | 'soundcloud') => void;
  onUpdateQueue: (queue: QueueItem[]) => void;
}

export default function PlayerControls({ 
  currentTrack, 
  queue, 
  onPlaybackUpdate, 
  onUpdateQueue 
}: PlayerControlsProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // User preference system
  const [userPrefersMuted, setUserPrefersMuted] = useState(() => {
    // Default to muted on first visit
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('videoMuted');
      return FORCE_UNMUTED ? false : stored === null ? true : stored === 'true';
    }
    return FORCE_UNMUTED ? false : true;
  });
  
  // Autoplay detection system
  const [isMuted, setIsMuted] = useState(FORCE_UNMUTED ? false : true); // Start muted by default until we know more
  const [autoplayTested, setAutoplayTested] = useState(FORCE_UNMUTED);
  const [autoplayRequiresMute, setAutoplayRequiresMute] = useState(!FORCE_UNMUTED);
  const [showMuteNotification, setShowMuteNotification] = useState(false);
  const [autoplayAttempted, setAutoplayAttempted] = useState(false);
  
  // Only play YouTube videos
  const youtubeQueue = (queue || []).filter(item => item.source === 'youtube');
    
  // Debug logging function
  const logDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => `${message}\n${prev}`.slice(0, 500)); // Keep last 500 chars
  };

  // Save user preference when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && !FORCE_UNMUTED) {
      localStorage.setItem('videoMuted', userPrefersMuted.toString());
      logDebug(`User preference saved: ${userPrefersMuted ? 'muted' : 'unmuted'}`);
    } else if (FORCE_UNMUTED) {
      logDebug('TESTING MODE: Forced unmuted mode active - preferences not saved');
    }
  }, [userPrefersMuted]);

  // Test autoplay capabilities when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && !autoplayTested) {
      if (FORCE_UNMUTED) {
        // Skip real testing in force unmuted mode
        logDebug('TESTING MODE: Forcing unmuted autoplay support');
        setAutoplayRequiresMute(false);
        setAutoplayTested(true);
        setIsMuted(false);
        return;
      }
      
      const testAutoplay = async () => {
        try {
          logDebug('Testing unmuted autoplay capability...');
          
          // Create a video element
          const video = document.createElement('video');
          video.muted = false;
          video.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0AAACrQYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjYwMSBhOGExYWE4IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTMgZGVibG9jaz0wOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0wIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEyIGxvb2thaGVhZF90aHJlYWRzPTMgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCB2YnZfbWF4cmF0ZT03NjggdmJ2X2J1ZnNpemU9MzAwMCBjcmZfbWF4PTAuMCBuYWxfaHJkPW5vbmUgZmlsbGVyPTAgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAA9liIQAM//+9zy+s8XYgAAAAwAAAwAAJuSKkoQFH8A5LOAADED+JiQAAAMAZYfBkUf+2VCYvQAAAAMAALcMYE0AAHFAQAAAAwAAL78gAQsjMm3AAAADAABHJwBBh0f+X5AAAAMAAIcyUKYADVAQAAAADAACPLYBHpSPQAAAAAGPnHrlpWMZPrkhrvsTJKMgbKzRu1GhnZQZDH6NUcg5xTYLJHWdOv4vKwrX6Xxb/0mBkTpfbRX3ZTQOyVwlrxA/JZ8p5L15n+3+Vnvq6PZnP9P4/7j+fv/77vnM4aaun/Nv3P//+5ZzzOQ0NOWMpAAVvmlZs0qROyPQeQU3bGKs9tcv8OaH2WVJOvsCQGZ/Op5sWqJlyBhBGfFn8YgBD2xbKnKDp5AO5WcfGvL/KO5j3qf5dhVevcTMRQxUWGsEQxzA+Qi5noWSUNUVk0U1JlcnSSRZJ6cCXM43+h/m5yzAz3GQyvlRPp1vHcq//7pUYQAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwAAAwA';
          
          // Set a small size and hide it
          video.style.width = '1px';
          video.style.height = '1px';
          video.style.position = 'fixed';
          video.style.opacity = '0.01';
          
          // Add to DOM temporarily
          document.body.appendChild(video);
          
          // Try to play it
          const playPromise = video.play();
          
          if (playPromise !== undefined) {
            try {
              await playPromise;
              // If we get here, autoplay without muting is allowed
              logDebug('✅ Unmuted autoplay is supported!');
              setAutoplayRequiresMute(false);
            } catch (e) {
              // Autoplay not allowed without muting
              logDebug('❌ Unmuted autoplay is NOT supported. Will use muted autoplay.');
              setAutoplayRequiresMute(true);
            }
          } else {
            // Playback promise not supported, assume we need muting
            logDebug('❓ Unable to test autoplay. Will use muted autoplay to be safe.');
            setAutoplayRequiresMute(true);
          }
          
          // Clean up
          document.body.removeChild(video);
          setAutoplayTested(true);
          
          // Apply user preference if unmuted autoplay is supported
          if (!autoplayRequiresMute) {
            setIsMuted(userPrefersMuted);
          }
          
        } catch (e) {
          logDebug(`Error testing autoplay: ${e}`);
          setAutoplayRequiresMute(true);
          setAutoplayTested(true);
        }
      };
      
      // Run the test
      testAutoplay();
    }
  }, [autoplayTested, userPrefersMuted]);

  // On component mount
  useEffect(() => {
    if (FORCE_UNMUTED) {
      logDebug('TESTING MODE: Forced unmuted mode active');
    }
    
    logDebug('PlayerControls mounted');
    logDebug(`Queue has ${queue.length} items (${youtubeQueue.length} YouTube)`);
    
    // Return cleanup function
    return () => {
      logDebug('PlayerControls unmounting');
    };
  }, []);
  
  // Log when queue or currentTrack changes
  useEffect(() => {
    logDebug(`Queue updated: ${youtubeQueue.length} YouTube videos in queue`);
  }, [youtubeQueue.length]);
  
  // Current track changed
  useEffect(() => {
    if (currentTrack) {
      logDebug(`Current track updated: ${currentTrack.id} (${currentTrack.source})`);
      logDebug(`Current track state: isPlaying=${currentTrack.isPlaying}, startTime=${currentTrack.startTime}`);
      setAutoplayAttempted(true);
      
      if (FORCE_UNMUTED) {
        // Force unmuted in test mode
        setIsMuted(false);
        logDebug('TESTING MODE: Forcing unmuted playback');
      } else {
        // If user prefers unmuted but browser requires mute for autoplay
        if (!userPrefersMuted && autoplayRequiresMute) {
          setIsMuted(true);
          setShowMuteNotification(true);
          logDebug('Starting muted due to browser restrictions despite user preference');
        } else {
          // Apply user preference
          setIsMuted(userPrefersMuted);
          logDebug(`Applying user preference: ${userPrefersMuted ? 'muted' : 'unmuted'}`);
        }
      }
    } else {
      logDebug('Current track is null');
    }
  }, [currentTrack, userPrefersMuted, autoplayRequiresMute]);
  
  // Sync with remote track state
  useEffect(() => {
    if (currentTrack && !isSeeking && playerReady) {
      logDebug(`Syncing with remote track: ${currentTrack.id}, playing: ${currentTrack.isPlaying}`);
      setLocalIsPlaying(currentTrack.isPlaying);
      
      // If we're more than 2 seconds off, update our position
      const currentTime = playerRef.current?.getCurrentTime() || 0;
      if (Math.abs(currentTime - currentTrack.startTime) > 2) {
        logDebug(`Seeking to ${currentTrack.startTime}s (current: ${currentTime}s)`);
        playerRef.current?.seekTo(currentTrack.startTime, 'seconds');
      }
    }
  }, [currentTrack, isSeeking, playerReady]);

  // Auto-play first track in queue if nothing is playing
  useEffect(() => {
    const attemptToPlayFromQueue = () => {
      if (!currentTrack && youtubeQueue.length > 0 && !autoplayAttempted) {
        const nextTrack = youtubeQueue[0];
        logDebug(`No current track, playing first in queue: ${nextTrack.id}`);
        
        setAutoplayAttempted(true);
        
        // Start playing the first track in queue
        onPlaybackUpdate(0, true, nextTrack.id, 'youtube');
        
        // Delay queue update to ensure playback starts
        setTimeout(() => {
          logDebug('Removing played track from queue after delay');
          // Remove the track from the queue
          const newQueue = [...queue];
          const indexToRemove = newQueue.findIndex(item => 
            item.id === nextTrack.id && item.source === 'youtube'
          );
          if (indexToRemove !== -1) {
            newQueue.splice(indexToRemove, 1);
            onUpdateQueue(newQueue);
          }
        }, 1500);
        
        return true;
      }
      return false;
    };
    
    // Try to play immediately if we have a queue but no current track
    if (!currentTrack && youtubeQueue.length > 0 && !autoplayAttempted && autoplayTested) {
      logDebug('Attempting to play from queue immediately');
      attemptToPlayFromQueue();
    }
  }, [
    currentTrack, 
    youtubeQueue, 
    onPlaybackUpdate, 
    onUpdateQueue, 
    queue, 
    autoplayAttempted, 
    autoplayTested
  ]);
  
  // Get YouTube video URL
  const getVideoUrl = () => {
    if (!currentTrack) return '';
    
    if (currentTrack.source === 'youtube') {
      return `https://www.youtube.com/watch?v=${currentTrack.id}`;
    }
    return '';
  };
  
  const handlePlay = () => {
    logDebug('Play button clicked');
    logDebug(`Current track: ${currentTrack ? JSON.stringify(currentTrack) : 'null'}`);
    logDebug(`Queue length: ${youtubeQueue.length}`);
    
    setLocalIsPlaying(true);
    if (currentTrack) {
      onPlaybackUpdate(
        playerRef.current?.getCurrentTime() || 0,
        true,
        currentTrack.id,
        currentTrack.source
      );
    } else if (youtubeQueue.length > 0) {
      // If nothing is playing but we have a queue, play the first item
      const nextTrack = youtubeQueue[0];
      logDebug(`Playing first in queue: ${nextTrack.id}`);
      
      onPlaybackUpdate(0, true, nextTrack.id, 'youtube');
      
      // Delay removing from queue to ensure playback starts properly
      setTimeout(() => {
        logDebug('Removing played track from queue after delay');
        // Remove from queue
        const newQueue = [...queue];
        const indexToRemove = newQueue.findIndex(item => 
          item.id === nextTrack.id && item.source === 'youtube'
        );
        if (indexToRemove !== -1) {
          newQueue.splice(indexToRemove, 1);
          onUpdateQueue(newQueue);
        }
      }, 1500);
    }
  };
  
  const handlePause = () => {
    logDebug('Pause button clicked');
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
    logDebug(`Video duration: ${duration}s`);
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
    logDebug(`Seeking to ${playbackPosition}s`);
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

  const handleEnded = () => {
    logDebug('Video ended');
    // When current track ends, play the next one in queue
    if (youtubeQueue.length > 0) {
      const nextTrack = youtubeQueue[0];
      logDebug(`Playing next in queue: ${nextTrack.id}`);
      
      // Start playing the next track
      onPlaybackUpdate(0, true, nextTrack.id, 'youtube');
      
      // Delay removing from queue to ensure playback starts properly
      setTimeout(() => {
        logDebug('Removing next track from queue after delay');
        // Remove the played track from the queue
        const newQueue = [...queue];
        const indexToRemove = newQueue.findIndex(item => 
          item.id === nextTrack.id && item.source === 'youtube'
        );
        if (indexToRemove !== -1) {
          newQueue.splice(indexToRemove, 1);
          onUpdateQueue(newQueue);
        }
      }, 1500);
    } else {
      // No more tracks in queue, stop playback
      logDebug('No more tracks in queue');
      setLocalIsPlaying(false);
      if (currentTrack) {
        onPlaybackUpdate(
          playerRef.current?.getCurrentTime() || 0,
          false,
          currentTrack.id,
          currentTrack.source
        );
      }
    }
  };

  const handleReady = (player: any) => {
    logDebug("Player is ready");
    logDebug(`Current URL: ${getVideoUrl()}`);
    logDebug(`Current queue length: ${youtubeQueue.length}`);
    logDebug(`Current track: ${currentTrack ? JSON.stringify(currentTrack) : 'null'}`);
    
    setPlayerReady(true);
    setPlayerError(null);
    
    // Try to get video title from player data
    try {
      const playerData = player.getInternalPlayer();
      if (playerData && playerData.getVideoData) {
        const videoData = playerData.getVideoData();
        if (videoData && videoData.title) {
          logDebug(`Video title: ${videoData.title}`);
          setVideoTitle(videoData.title);
        }
      }
    } catch (e) {
      logDebug(`Couldn't get video title: ${e}`);
    }
  };

  const handleError = (error: any) => {
    logDebug(`Player error: ${JSON.stringify(error)}`);
    setPlayerError("Failed to load YouTube video. It may be unavailable or restricted.");
    
    // If the current track fails, try to play the next one
    if (youtubeQueue.length > 0) {
      const nextTrack = youtubeQueue[0];
      logDebug(`Error with current video, playing next: ${nextTrack.id}`);
      
      // Start playing the next track
      setTimeout(() => {
        onPlaybackUpdate(0, true, nextTrack.id, 'youtube');
        
        // Remove the failed track from the queue after a delay
        setTimeout(() => {
          logDebug('Removing failed track from queue after delay');
          const newQueue = [...queue];
          const indexToRemove = newQueue.findIndex(item => 
            item.id === nextTrack.id && item.source === 'youtube'
          );
          if (indexToRemove !== -1) {
            newQueue.splice(indexToRemove, 1);
            onUpdateQueue(newQueue);
          }
        }, 1500);
      }, 1000);
    }
  };
  
  // Format time as minutes:seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Skip to next track in queue
  const skipToNext = () => {
    if (youtubeQueue.length > 0) {
      const nextTrack = youtubeQueue[0];
      logDebug(`Skipping to next: ${nextTrack.id}`);
      
      // Start playing the next track
      onPlaybackUpdate(0, true, nextTrack.id, 'youtube');
      
      // Delay removing from queue to ensure playback starts properly
      setTimeout(() => {
        logDebug('Removing skipped-to track from queue after delay');
        // Remove the track from the queue
        const newQueue = [...queue];
        const indexToRemove = newQueue.findIndex(item => 
          item.id === nextTrack.id && item.source === 'youtube'
        );
        if (indexToRemove !== -1) {
          newQueue.splice(indexToRemove, 1);
          onUpdateQueue(newQueue);
        }
      }, 1500);
    }
  };

  // Manually start playing first track in queue
  const playFromQueue = () => {
    if (youtubeQueue.length > 0) {
      const nextTrack = youtubeQueue[0];
      logDebug(`Manually playing from queue: ${nextTrack.id}`);
      
      // Start playing the first track
      onPlaybackUpdate(0, true, nextTrack.id, 'youtube');
      
      // Delay removing from queue to ensure playback starts properly
      setTimeout(() => {
        logDebug('Removing manually played track from queue after delay');
        // Remove the track from the queue
        const newQueue = [...queue];
        const indexToRemove = newQueue.findIndex(item => 
          item.id === nextTrack.id && item.source === 'youtube'
        );
        if (indexToRemove !== -1) {
          newQueue.splice(indexToRemove, 1);
          onUpdateQueue(newQueue);
        }
      }, 1500);
    }
  };

  // Toggle mute state
  const toggleMute = () => {
    if (FORCE_UNMUTED) {
      // In test mode, always unmute, but still log
      logDebug('TESTING MODE: Forcing unmuted state (toggle ignored)');
      setIsMuted(false);
      return;
    }
    
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    setUserPrefersMuted(newMutedState); // Save preference
    setShowMuteNotification(false); // Hide notification if showing
    logDebug(`Video ${newMutedState ? 'muted' : 'unmuted'}, preference saved`);
  };
  
  // Dismiss notification
  const dismissNotification = () => {
    setShowMuteNotification(false);
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-md border border-border">
      {/* Testing Mode Indicator */}
      {FORCE_UNMUTED && (
        <div className="bg-yellow-500 text-black p-3 mb-4 rounded flex justify-between items-center">
          <span className="font-bold">TESTING MODE: Forced unmuted playback</span>
        </div>
      )}
      
      {/* Notification for auto-mute */}
      {showMuteNotification && !FORCE_UNMUTED && (
        <div className="bg-accent text-accent-foreground p-3 mb-4 rounded flex justify-between items-center">
          <div className="flex items-center">
            <span className="mr-2">🔊</span>
            <span>Video started muted due to browser restrictions. Click unmute to hear audio.</span>
          </div>
          <button 
            onClick={dismissNotification} 
            className="text-primary hover:text-primary-hover"
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="aspect-video w-full mb-4 bg-black rounded overflow-hidden relative">
        {currentTrack && currentTrack.source === 'youtube' ? (
          <>
            <ReactPlayer
              ref={playerRef}
              url={getVideoUrl()}
              playing={localIsPlaying}
              muted={isMuted}
              controls={false}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onEnded={handleEnded}
              onReady={handleReady}
              onError={handleError}
              width="100%"
              height="100%"
              config={{
                playerVars: {
                  modestbranding: 1,
                  origin: typeof window !== 'undefined' ? window.location.origin : '',
                  autoplay: 1 // Try to autoplay
                }
              }}
            />
            
            {/* Mute/Unmute button overlay */}
            {isMuted && !FORCE_UNMUTED && (
              <div className="absolute bottom-4 right-4 z-10">
                <button
                  onClick={toggleMute}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm flex items-center"
                >
                  <span className="mr-1">🔊</span> Unmute
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-white">No video playing</p>
          </div>
        )}
      </div>
      
      {playerError && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-4">
          {playerError}
        </div>
      )}
      
      {currentTrack ? (
        <>
          <div className="mb-2">
            <p className="font-semibold text-lg text-foreground">{videoTitle || 'YouTube Video'}</p>
            <p className="text-muted-foreground text-sm">{currentTrack.id}</p>
          </div>
          
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={() => localIsPlaying ? handlePause() : handlePlay()}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-full"
            >
              {localIsPlaying ? 'Pause' : 'Play'}
            </button>
            
            <button
              onClick={skipToNext}
              className="bg-muted hover:bg-accent text-foreground px-4 py-2 rounded-full disabled:opacity-50"
              disabled={youtubeQueue.length === 0}
            >
              Skip
            </button>
            
            {!FORCE_UNMUTED && (
              <button
                onClick={toggleMute}
                className={`${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-muted hover:bg-accent'} ${isMuted ? 'text-white' : 'text-foreground'} px-4 py-2 rounded-full`}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
            )}
          </div>
          
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
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(playbackPosition)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted-foreground">No video is currently playing</p>
          {youtubeQueue.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                {youtubeQueue.length} video(s) in queue
              </p>
              <button
                onClick={playFromQueue}
                className="bg-secondary hover:bg-secondary-hover text-white px-4 py-2 rounded-full"
              >
                Play From Queue
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Audio autoplay status */}
      {autoplayTested && !FORCE_UNMUTED && (
        <div className="mt-3 text-xs text-muted-foreground flex items-center">
          <div className={`h-2 w-2 rounded-full mr-1 ${autoplayRequiresMute ? 'bg-yellow-500' : 'bg-secondary'}`}></div>
          <span>
            {autoplayRequiresMute 
              ? 'This browser requires user interaction for unmuted playback' 
              : 'Unmuted autoplay supported'}
          </span>
        </div>
      )}
      
      {FORCE_UNMUTED && (
        <div className="mt-3 text-xs text-yellow-500 flex items-center">
          <div className="h-2 w-2 rounded-full mr-1 bg-yellow-500"></div>
          <span>
            Testing mode: Forcing unmuted playback regardless of browser policy
          </span>
        </div>
      )}
      
      {/* Debug panel */}
      <div className="mt-4 p-2 bg-muted rounded text-xs font-mono h-24 overflow-y-auto">
        <p className="font-bold mb-1 text-foreground">Debug Info:</p>
        <pre className="whitespace-pre-wrap text-muted-foreground">{debugInfo}</pre>
      </div>
    </div>
  );
}