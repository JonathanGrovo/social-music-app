// Updated PlayerControls.tsx
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
  const lastSentUpdateRef = useRef({
    trackId: '',
    time: 0,
    isPlaying: false,
    timestamp: 0
  });

  const lastSyncRequestTime = useRef(0);
  const isVideoLoadedRef = useRef(false);

  // Filter queue to only YouTube videos
  const youtubeQueue = (queue || []).filter(item => item.source === 'youtube');
  
  useEffect(() => {
    // Log whenever current track changes
    if (currentTrack) {
      console.log("Current track updated:", currentTrack.id, currentTrack.isPlaying);
      setLocalIsPlaying(currentTrack.isPlaying);
    }
  }, [currentTrack]);

  // Basic player functionality handlers
  const handlePlay = () => {
    console.log("Play clicked");
    
    // Only send update if we've fully loaded the video
    if (!isVideoLoadedRef.current) {
      console.log("Ignoring play click - video not yet loaded");
      return;
    }
    
    setLocalIsPlaying(true);
    
    if (currentTrack && playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      
      // Record this update to prevent loop
      lastSentUpdateRef.current = {
        trackId: currentTrack.id,
        time: currentTime,
        isPlaying: true,
        timestamp: Date.now()
      };
      
      onPlaybackUpdate(
        currentTime,
        true,
        currentTrack.id,
        currentTrack.source
      );
    }
  };
  
  const handlePause = () => {
    console.log("Pause clicked");
    
    // Only send update if we've fully loaded the video
    if (!isVideoLoadedRef.current) {
      console.log("Ignoring pause click - video not yet loaded");
      return;
    }
    
    setLocalIsPlaying(false);
    
    if (currentTrack && playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      
      // Record this update to prevent loop
      lastSentUpdateRef.current = {
        trackId: currentTrack.id,
        time: currentTime,
        isPlaying: false,
        timestamp: Date.now()
      };
      
      onPlaybackUpdate(
        currentTime,
        false,
        currentTrack.id,
        currentTrack.source
      );
    }
  };
  
  const handleProgress = (state: { playedSeconds: number }) => {
    if (!isSeeking) {
      // Just update local state, don't trigger any network events
      setPlaybackPosition(state.playedSeconds);
    }
  };

  const handleDuration = (duration: number) => {
    console.log("Duration updated:", duration);
    setDuration(duration);
  };

  // Skip to next video in queue
  const skipToNext = () => {
    console.log("Skip to next clicked");
    if (youtubeQueue.length > 0) {
      const nextTrack = youtubeQueue[0];
      
      // First update local track reference
      isVideoLoadedRef.current = false;
      
      // Always start from beginning
      onPlaybackUpdate(0, true, nextTrack.id, 'youtube');
      
      // Record this update to prevent loop
      lastSentUpdateRef.current = {
        trackId: nextTrack.id,
        time: 0,
        isPlaying: true,
        timestamp: Date.now()
      };
      
      // Remove track from queue after a short delay
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

  // Skip to previous (restart current track or go to previous)
  const skipToPrevious = () => {
    if (playerRef.current && playbackPosition > 3) {
      // If we're more than 3 seconds in, just restart current track
      playerRef.current.seekTo(0);
      setPlaybackPosition(0);
    } else {
      // Implement previous track logic if needed
      console.log("Skip to previous track - not implemented yet");
    }
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

  // Ensures scrubbing through playback doesn't cause too many events sent
  const throttledUpdatePlayback = useRef(
    throttle((time, isPlaying, trackId, source) => {
      onPlaybackUpdate(time, isPlaying, trackId, source);
    }, 500) // Half second throttle
  ).current;
  
  // Handle seeking on progress bar
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseFloat(e.target.value);
    setPlaybackPosition(newPosition);
    setIsSeeking(true);
  };
  
  const handleSeekMouseUp = () => {
    setIsSeeking(false);
    
    // Only send update if we've fully loaded the video
    if (!isVideoLoadedRef.current) {
      console.log("Ignoring seek - video not yet loaded");
      return;
    }
    
    if (playerRef.current && currentTrack) {
      // Seek locally
      playerRef.current.seekTo(playbackPosition);
      
      // Record this update to prevent loop
      lastSentUpdateRef.current = {
        trackId: currentTrack.id,
        time: playbackPosition,
        isPlaying: localIsPlaying,
        timestamp: Date.now()
      };
      
      // Send update to others
      onPlaybackUpdate(
        playbackPosition,
        localIsPlaying,
        currentTrack.id,
        currentTrack.source
      );
    }
  };
  // Volume control handlers
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
  
  // Check if we need to start playing a track from the queue
  useEffect(() => {
    // If we're not currently playing anything but there are videos in the queue
    if (!currentTrack && youtubeQueue.length > 0) {
      console.log('No current track but queue has videos - starting playback');
      skipToNext(); // Play the first video in the queue
    }
  }, [currentTrack, youtubeQueue.length]);

  useEffect(() => {
    if (!currentTrack || !playerRef.current) return;
    
    console.log(`Track update received - ID: ${currentTrack.id}, Time: ${currentTrack.startTime}s`);
    
    // Determine if this update is from our own actions
    const isSelfUpdate = 
      lastSentUpdateRef.current.trackId === currentTrack.id && 
      Math.abs(lastSentUpdateRef.current.time - currentTrack.startTime) < 0.5 &&
      lastSentUpdateRef.current.isPlaying === currentTrack.isPlaying &&
      (Date.now() - lastSentUpdateRef.current.timestamp) < 2000;
    
    if (isSelfUpdate) {
      console.log('Ignoring self-update');
      // Still update play state
      setLocalIsPlaying(currentTrack.isPlaying);
      return;
    }
    
    // Wait until player is fully loaded before seeking
    if (!isVideoLoadedRef.current) {
      console.log('Video not fully loaded yet, will seek when ready');
      // Just update the state, the onReady handler will take care of seeking
      return;
    }
    
    console.log(`Applying external seek to ${currentTrack.startTime}s`);
    
    // Apply the seek
    playerRef.current.seekTo(currentTrack.startTime);
    setPlaybackPosition(currentTrack.startTime);
    
    // Update play state
    setLocalIsPlaying(currentTrack.isPlaying);
  }, [currentTrack]);

  return (
    <div className="relative bg-card overflow-hidden flex flex-col" 
         style={{ height: 'calc(100vh - 187px)' }}>
      
      {/* Video Container - uses flex-grow to take available space */}
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
            <ReactPlayer
              ref={playerRef}
              url={getVideoUrl()}
              playing={localIsPlaying}
              volume={volume}
              controls={false}
              width="100%"
              height="100%"
              style={{ 
                display: 'block'
              }}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
              onDuration={handleDuration}
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
                
                // Add a small delay before seeking to ensure player is fully loaded
                setTimeout(() => {
                  if (currentTrack && currentTrack.startTime > 0 && playerRef.current) {
                    console.log(`Seeking to initial position on ready: ${currentTrack.startTime}s`);
                    playerRef.current.seekTo(currentTrack.startTime, 'seconds');
                    
                    // If video should be playing, force play state
                    if (currentTrack.isPlaying) {
                      setLocalIsPlaying(true);
                    }
                  }
                }, 500); // 500ms delay to ensure player is actually ready
              }}
              config={{
                playerVars: {
                  modestbranding: 1,
                  origin: typeof window !== 'undefined' ? window.location.origin : '',
                  autoplay: 1,
                  enablejsapi: 1,
                  showinfo: 0,
                  rel: 0,
                  iv_load_policy: 3, // Hide annotations
                  playsinline: 1, // Play inline on mobile
                  fs: 0, // Disable fullscreen button
                  controls: 0, // Disable controls
                  disablekb: 1, // Disable keyboard controls
                },
                embedOptions: {
                  // These can help with the loading spinner issue
                  controls: 0,
                  autoplay: 1,
                  showinfo: 0,
                },
                  // This helps avoid the loading spinner
                  onUnstarted: () => {
                    console.log('Player unstarted - handling automatically');
                    if (playerRef.current && localIsPlaying) {
                      try {
                        playerRef.current.getInternalPlayer().playVideo();
                      } catch (e) {
                        console.error('Error playing video in onUnstarted handler:', e);
                      }
                    }
                  }
                }
              }
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full w-full">
            <p className="text-white">No video playing</p>
          </div>
        )}
        
        {/* Video title overlay - now positioned above the controls */}
        {currentTrack && videoTitle && (
          <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 transition-opacity">
            <p className="text-sm truncate">{videoTitle}</p>
          </div>
        )}
      </div>
      
      {/* Controls - Fixed part at the bottom with proper background color */}
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
              onClick={localIsPlaying ? handlePause : handlePlay}
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