// Refined PlayerControls.tsx - preserves YouTube UI elements while handling playback events
import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player/youtube';
import { QueueItem } from '../types';
import { throttle } from 'lodash';

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
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [volume, setVolume] = useState(0.8);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  
  // Track if video is loaded
  const isVideoLoadedRef = useRef(false);
  // Track if we're handling a controlled state change
  const isControlledChangeRef = useRef(false);

  const ignoreNextPlayerEventRef = useRef(false);

  // Track whether changes are coming from external source
  const isExternalUpdateRef = useRef(false);

  // Track the last update we sent to prevent duplicates
  const lastUpdateSentRef = useRef({
    action: '', // 'play', 'pause', 'seek'
    time: 0,
    timestamp: 0
  });

  // Filter queue to only YouTube videos
  const youtubeQueue = (queue || []).filter(item => item.source === 'youtube');
  
  // Update local state and handle player update
  useEffect(() => {
    if (!currentTrack) return;
    
    console.log("[PlayerControls] Current track updated:", currentTrack.id, currentTrack.isPlaying);
    
    // Set flag to indicate we're applying an external update
    isExternalUpdateRef.current = true;
    
    // Update the play/pause state
    setLocalIsPlaying(currentTrack.isPlaying);
    
    // Only perform player updates if the player is available
    if (playerRef.current && isVideoLoadedRef.current) {
      console.log(`Applying track position: ${currentTrack.startTime}s`);
      playerRef.current.seekTo(currentTrack.startTime);
      setPlaybackPosition(currentTrack.startTime);
    }
    
    // Clear the flag after a short delay
    const timerId = setTimeout(() => {
      isExternalUpdateRef.current = false;
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [currentTrack]);

  // Toggle playback - unified function to handle all play/pause events
  const togglePlayback = () => {
    if (!isVideoLoadedRef.current || !currentTrack) return;
    
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() || 0 : 0;
    const newPlayState = !localIsPlaying;
    
    // Set flag to indicate we're handling a controlled state change
    isControlledChangeRef.current = true;
    
    // Update local state first
    setLocalIsPlaying(newPlayState);
    
    // Then send update to others
    onPlaybackUpdate(
      currentTime, 
      newPlayState,
      currentTrack.id,
      currentTrack.source
    );
    
    // Clear the flag after a short delay
    setTimeout(() => {
      isControlledChangeRef.current = false;
    }, 200);
  };

  // Handle progress updates
  const handleProgress = throttle((state: { playedSeconds: number }) => {
    if (!isSeeking) {
      setPlaybackPosition(state.playedSeconds);
    }
  }, 100);

  const handleDuration = (duration: number) => {
    console.log("Duration updated:", duration);
    setDuration(duration);
  };

  // Handle player events directly
  const handlePlayerPlay = () => {
    // Skip if we're processing an external update
    if (isExternalUpdateRef.current) {
      console.log("Ignoring YouTube play event (triggered by external update)");
      return;
    }
    
    // Check if this is a duplicate event (can happen with YouTube iframe API)
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() || 0 : 0;
    const now = Date.now();
    
    // Prevent duplicate events within a short timeframe
    if (
      lastUpdateSentRef.current.action === 'play' &&
      Math.abs(lastUpdateSentRef.current.time - currentTime) < 0.5 &&
      now - lastUpdateSentRef.current.timestamp < 500
    ) {
      console.log("Ignoring duplicate play event");
      return;
    }
  
    // This was a genuine user interaction with the video
    console.log("User clicked YouTube player to play");
    
    // Update local state (but avoid triggering another event)
    isExternalUpdateRef.current = true;
    setLocalIsPlaying(true);
    isExternalUpdateRef.current = false;
    
    // Record this update to prevent duplicates
    lastUpdateSentRef.current = {
      action: 'play',
      time: currentTime,
      timestamp: now
    };
    
    // Send update to others
    if (currentTrack) {
      onPlaybackUpdate(currentTime, true, currentTrack.id, currentTrack.source);
    }
  };
  
  const handlePlayerPause = () => {
    // Skip if we're processing an external update
    if (isExternalUpdateRef.current) {
      console.log("Ignoring YouTube pause event (triggered by external update)");
      return;
    }
    
    // Check if this is a duplicate event (can happen with YouTube iframe API)
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() || 0 : 0;
    const now = Date.now();
    
    // Prevent duplicate events within a short timeframe
    if (
      lastUpdateSentRef.current.action === 'pause' &&
      Math.abs(lastUpdateSentRef.current.time - currentTime) < 0.5 &&
      now - lastUpdateSentRef.current.timestamp < 500
    ) {
      console.log("Ignoring duplicate pause event");
      return;
    }
  
    // This was a genuine user interaction with the video
    console.log("User clicked YouTube player to pause");
    
    // Update local state (but avoid triggering another event)
    isExternalUpdateRef.current = true;
    setLocalIsPlaying(false);
    isExternalUpdateRef.current = false;
    
    // Record this update to prevent duplicates
    lastUpdateSentRef.current = {
      action: 'pause',
      time: currentTime,
      timestamp: now
    };
    
    // Send update to others
    if (currentTrack) {
      onPlaybackUpdate(currentTime, false, currentTrack.id, currentTrack.source);
    }
  };

  // Handle custom play/pause button
  const handlePlayPauseButton = () => {
    if (!isVideoLoadedRef.current || !currentTrack) return;
    
    const newPlayState = !localIsPlaying;
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() || 0 : 0;
    
    console.log(`Play/Pause button clicked - changing to ${newPlayState ? 'play' : 'pause'}`);
    
    // Set flag to indicate we're handling this change
    isExternalUpdateRef.current = true;
    
    // Update local state
    setLocalIsPlaying(newPlayState);
    
    // Send update to other users
    onPlaybackUpdate(currentTime, newPlayState, currentTrack.id, currentTrack.source);
    
    // Record this update to prevent duplicates
    lastUpdateSentRef.current = {
      action: newPlayState ? 'play' : 'pause',
      time: currentTime,
      timestamp: Date.now()
    };
    
    // Clear the flag after a short delay
    setTimeout(() => {
      isExternalUpdateRef.current = false;
    }, 1000);
  };

  // Skip to next track in queue
  const skipToNext = () => {
    console.log("Skip to next clicked");
    if (youtubeQueue.length > 0) {
      const nextTrack = youtubeQueue[0];
      
      // Reset video loaded flag
      isVideoLoadedRef.current = false;
      
      // Start playing next track
      onPlaybackUpdate(0, true, nextTrack.id, 'youtube');
      
      // Remove from queue after a short delay
      setTimeout(() => {
        const newQueue = [...queue];
        const indexToRemove = newQueue.findIndex(item => 
          item.id === nextTrack.id && item.source === 'youtube'
        );
        if (indexToRemove !== -1) {
          newQueue.splice(indexToRemove, 1);
          onUpdateQueue(newQueue);
        }
      }, 1000);
    }
  };

  // Skip to beginning of current track
  const skipToPrevious = () => {
    console.log("Skipping back to beginning");
    if (!isVideoLoadedRef.current || !currentTrack) return;
    
    // Seek to beginning and maintain current play state
    onPlaybackUpdate(0, localIsPlaying, currentTrack.id, currentTrack.source);
  };
  
  // Format time as minutes:seconds
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Get YouTube video URL
  const getVideoUrl = () => {
    if (!currentTrack) return '';
    return currentTrack.source === 'youtube' 
      ? `https://www.youtube.com/watch?v=${currentTrack.id}` 
      : '';
  };
  
  // Handle seeking on progress bar
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value);
    setPlaybackPosition(newPosition);
    setIsSeeking(true);
  };
  
  const handleSeekMouseUp = () => {
    setIsSeeking(false);
    
    if (!isVideoLoadedRef.current || !currentTrack) return;
    
    if (playerRef.current) {
      console.log(`Seeking to ${playbackPosition}s`);
      
      // Set flag to indicate we're handling this change
      isExternalUpdateRef.current = true;
      
      // Apply the seek locally
      playerRef.current.seekTo(playbackPosition);
      
      // Send update to others
      onPlaybackUpdate(
        playbackPosition,
        localIsPlaying,
        currentTrack.id,
        currentTrack.source
      );
      
      // Record this update to prevent duplicates
      lastUpdateSentRef.current = {
        action: 'seek',
        time: playbackPosition,
        timestamp: Date.now()
      };
      
      // Clear the flag after a short delay
      setTimeout(() => {
        isExternalUpdateRef.current = false;
      }, 1000);
    }
  };

  // Volume control handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (playerRef.current) {
      // ReactPlayer has a setVolume method but it's not exposed in the type
      const player = playerRef.current as any;
      if (player.getInternalPlayer) {
        try {
          player.getInternalPlayer().setVolume(newVolume * 100);
        } catch (e) {
          console.error('Error setting volume:', e);
        }
      }
    }
  };
  
  // Start playing first video in queue if needed
  useEffect(() => {
    if (!currentTrack && youtubeQueue.length > 0) {
      console.log('No current track but queue has videos - starting playback');
      skipToNext();
    }
  }, [currentTrack, youtubeQueue.length]);

  return (
    <div className="relative bg-card overflow-hidden flex flex-col" 
         style={{ height: 'calc(100vh - 187px)' }}>
      
      {/* Video Container */}
      <div style={{ 
        flexGrow: 1,
        backgroundColor: '#000', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {currentTrack && currentTrack.source === 'youtube' ? (
          <div style={{ 
            position: 'relative',
            width: '100%',
            height: '100%',
            maxHeight: 'calc(100vh - 250px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* The actual YouTube player */}
            <ReactPlayer
              ref={playerRef}
              url={getVideoUrl()}
              playing={localIsPlaying}
              volume={volume}
              controls={false}
              width="100%"
              height="100%"
              style={{ display: 'block' }}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onPlay={handlePlayerPlay}
              onPause={handlePlayerPause}
              onEnded={() => {
                console.log('Video ended, checking for next in queue');
                if (youtubeQueue.length > 0) {
                  skipToNext();
                }
              }}
              onReady={() => {
                console.log('Player ready');
                isVideoLoadedRef.current = true;
                
                // Try to get the video title
                if (playerRef.current && playerRef.current.getInternalPlayer()) {
                  try {
                    const player = playerRef.current.getInternalPlayer();
                    if (player.getVideoData) {
                      const videoData = player.getVideoData();
                      if (videoData && videoData.title) {
                        setVideoTitle(videoData.title);
                      }
                    }
                  } catch (e) {
                    console.error('Error getting video title:', e);
                  }
                }
                
                // Initial position setup
                if (currentTrack && currentTrack.startTime > 0) {
                  playerRef.current?.seekTo(currentTrack.startTime);
                  setPlaybackPosition(currentTrack.startTime);
                }
              }}
              config={{
                playerVars: {
                  modestbranding: 1,
                  origin: typeof window !== 'undefined' ? window.location.origin : '',
                  autoplay: 1,
                  enablejsapi: 1,
                  showinfo: 0,
                  rel: 0,
                  iv_load_policy: 3,
                  playsinline: 1,
                  fs: 0,
                  controls: 0,
                  disablekb: 1,
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <p className="text-white">No video playing</p>
          </div>
        )}
        
        {/* Video title overlay */}
        {currentTrack && videoTitle && (
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 transition-opacity">
            <p className="text-sm truncate">{videoTitle}</p>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex-none bg-card p-3" style={{ height: '100px' }}>
        {/* Progress bar */}
        <div className="flex items-center mb-4">
          <span className="text-xs text-foreground w-10">{formatTime(playbackPosition)}</span>
          <div className="mx-2 flex-1 relative h-2 bg-muted rounded overflow-hidden">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step="any"
              value={playbackPosition}
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
              onTouchEnd={handleSeekMouseUp}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="h-full bg-primary"
              style={{ width: `${duration ? (playbackPosition / duration) * 100 : 0}%` }}
            ></div>
          </div>
          <span className="text-xs text-foreground w-10 text-right">{formatTime(duration)}</span>
        </div>
        
        {/* Control buttons */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Volume control */}
            <div className="relative">
              <button 
                onClick={() => setShowVolumeControl(!showVolumeControl)}
                className="text-foreground hover:text-primary p-2"
                aria-label="Volume"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {volume === 0 ? (
                    <>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v6a3 3 0 0 0 5.12 2.12L9 9z"></path>
                      <path d="M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                    </>
                  ) : volume < 0.5 ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </>
                  )}
                </svg>
              </button>
              {showVolumeControl && (
                <div className="absolute bottom-10 left-0 bg-card p-2 rounded shadow-lg border border-border w-32 z-20">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Previous button */}
            <button 
              onClick={skipToPrevious}
              className="text-foreground hover:text-primary"
              aria-label="Previous"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="19 20 9 12 19 4 19 20"></polygon>
                <line x1="5" y1="19" x2="5" y2="5"></line>
              </svg>
            </button>
            
            {/* Play/Pause button */}
            <button 
              onClick={handlePlayPauseButton}
              className="bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-primary-hover"
              aria-label={localIsPlaying ? "Pause" : "Play"}
            >
              {localIsPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>
            
            {/* Next button */}
            <button
              onClick={skipToNext}
              className={`text-foreground ${youtubeQueue.length > 0 ? 'hover:text-primary' : 'opacity-50 cursor-not-allowed'}`}
              aria-label="Skip to next"
              disabled={youtubeQueue.length === 0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"></polygon>
                <line x1="19" y1="5" x2="19" y2="19"></line>
              </svg>
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Queue counter */}
            <div className="text-xs text-foreground">
              {youtubeQueue.length > 0 ? (
                <span>Next: {youtubeQueue.length} in queue</span>
              ) : (
                <span>Queue empty</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}