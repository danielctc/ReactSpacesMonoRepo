import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * PersistentBackground - A component that ensures the background (image or video) stays visible
 * until the player is instantiated, regardless of Unity's loading state.
 */
const PersistentBackground = ({ backgroundUrl = null, videoBackgroundUrl = null, containerRef }) => {
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState(backgroundUrl);
  const [currentVideoBackgroundUrl, setCurrentVideoBackgroundUrl] = useState(videoBackgroundUrl);
  const bgElementRef = useRef(null);
  const overlayElementRef = useRef(null);
  const videoElementRef = useRef(null);
  const didSetupRef = useRef(false);
  const loadAttemptedRef = useRef(false);

  // Setup background based on props, prioritizing video if available
  useEffect(() => {
    if (didSetupRef.current || loadAttemptedRef.current) return;
    loadAttemptedRef.current = true;
    
    console.log(`🎬 PersistentBackground: Initializing with props - videoUrl: ${videoBackgroundUrl}, imageUrl: ${backgroundUrl}`);
    
    // If video URL is provided directly in props, use it
    if (videoBackgroundUrl) {
      console.log(`🎬 PersistentBackground: Using provided video URL: ${videoBackgroundUrl}`);
      setupVideoBackground(videoBackgroundUrl);
      didSetupRef.current = true;
      return;
    }
    
    // If no video but image is available, use image
    if (backgroundUrl) {
      console.log(`🎬 PersistentBackground: No video available, using image: ${backgroundUrl}`);
      setupImageBackground(backgroundUrl);
      didSetupRef.current = true;
      return;
    }
    
    // If neither is available in props, try to get from URL
    tryLoadFromSpaceId();
  }, [backgroundUrl, videoBackgroundUrl]);
  
  // Listen for video background updates from other components
  useEffect(() => {
    const handleVideoBackgroundUpdate = (event) => {
      const { videoBackgroundUrl } = event.detail;
      console.log(`🎬 PersistentBackground: Received video background update event: ${videoBackgroundUrl}`);
      
      if (videoBackgroundUrl && !didSetupRef.current) {
        setupVideoBackground(videoBackgroundUrl);
        didSetupRef.current = true;
      }
    };
    
    window.addEventListener('SpaceVideoBackgroundUpdated', handleVideoBackgroundUpdate);
    
    return () => {
      window.removeEventListener('SpaceVideoBackgroundUpdated', handleVideoBackgroundUpdate);
    };
  }, []);

  // Function to try loading background from space ID in URL
  const tryLoadFromSpaceId = () => {
    const path = window.location.pathname;
    const matches = path.match(/\/space\/([^\/]+)/);
    
    if (!matches || !matches[1]) {
      console.warn("🎬 PersistentBackground: Couldn't extract space ID from URL");
      return;
    }
    
    const spaceID = matches[1];
    console.log(`🎬 PersistentBackground: Found space ID: ${spaceID}`);
    
    // Fetch the space data to check for background
    getSpaceItem(spaceID)
      .then(spaceData => {
        console.log(`🎬 PersistentBackground: Retrieved space data for ${spaceID}:`, 
          spaceData ? 'success' : 'null');
        
        if (spaceData && spaceData.videoBackgroundUrl) {
          // Video found! Set it up first
          console.log(`🎬 PersistentBackground: VIDEO FOUND: ${spaceData.videoBackgroundUrl}`);
          setupVideoBackground(spaceData.videoBackgroundUrl);
          didSetupRef.current = true;
        } else if (spaceData && (spaceData.backgroundUrl || spaceData.backgroundGsUrl)) {
          // No video, fall back to image
          const bgUrl = spaceData.backgroundUrl || spaceData.backgroundGsUrl;
          console.log(`🎬 PersistentBackground: No video available, using image backdrop: ${bgUrl}`);
          setupImageBackground(bgUrl);
          didSetupRef.current = true;
        }
      })
      .catch(error => {
        console.error("🎬 PersistentBackground: Error fetching space data:", error);
      });
  };

  // Function to set up the video background
  const setupVideoBackground = (videoUrl) => {
    if (!containerRef || !containerRef.current) return;
    
    console.log(`🎬 PersistentBackground: Setting up video background: ${videoUrl}`);
    
    // Clear any existing background elements
    clearBackgroundElements();
    
    // Create video element
    const videoElement = document.createElement('video');
    videoElementRef.current = videoElement;
    
    // Set attributes for best compatibility
    videoElement.autoplay = true;
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    videoElement.setAttribute('preload', 'auto');
    videoElement.src = videoUrl;
    
    // Style the video
    Object.assign(videoElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      zIndex: '20',
      transition: 'opacity 1.5s ease-in-out',
      pointerEvents: 'none',
    });
    
    // Add to DOM
    containerRef.current.appendChild(videoElement);
    
    // Create overlay
    setupOverlay();
    
    // Try to play video using multiple strategies
    videoElement.load();
    
    try {
      // Attempt 1: Standard play
      videoElement.play()
        .then(() => console.log('🎬 VIDEO PLAYING SUCCESSFULLY'))
        .catch(err => {
          console.warn('🎬 First video play attempt failed:', err);
          
          // Attempt 2: On user interaction
          const playVideo = () => {
            videoElement.play()
              .then(() => console.log('🎬 Video started after user interaction'))
              .catch(e => console.error('🎬 Video still failed to play:', e));
          };
          
          window.addEventListener('click', playVideo, { once: true });
          window.addEventListener('touchstart', playVideo, { once: true });
          
          // Attempt 3: Try playing again after a delay
          setTimeout(() => {
            videoElement.play()
              .then(() => console.log('🎬 Video started after timeout'))
              .catch(e => console.error('🎬 Video still failed to play after timeout:', e));
          }, 1000);
        });
    } catch (error) {
      console.error('🎬 Error attempting to play video:', error);
    }
  };

  // Function to set up the image background
  const setupImageBackground = (imageUrl) => {
    if (!containerRef || !containerRef.current || !imageUrl) return;
    
    console.log(`🎬 PersistentBackground: Setting up image background: ${imageUrl}`);
    
    // Create image background
    const bgElement = document.createElement('div');
    bgElementRef.current = bgElement;
    
    // Style the background
    Object.assign(bgElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundImage: `url('${imageUrl}')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      zIndex: '19',
      transition: 'opacity 1.5s ease-in-out',
      pointerEvents: 'none',
    });
    
    // Add to DOM
    containerRef.current.appendChild(bgElement);
    
    // Create overlay
    setupOverlay();
  };

  // Function to set up the overlay
  const setupOverlay = () => {
    if (!containerRef || !containerRef.current) return;
    
    const overlayElement = document.createElement('div');
    overlayElementRef.current = overlayElement;
    
    // Style the overlay
    Object.assign(overlayElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      zIndex: '21',
      transition: 'opacity 1.5s ease-in-out',
      pointerEvents: 'none',
    });
    
    // Add to DOM
    containerRef.current.appendChild(overlayElement);
  };

  // Clear all background elements
  const clearBackgroundElements = () => {
    if (!containerRef || !containerRef.current) return;
    
    // Remove image background if exists
    if (bgElementRef.current && containerRef.current.contains(bgElementRef.current)) {
      containerRef.current.removeChild(bgElementRef.current);
      bgElementRef.current = null;
    }
    
    // Remove video if exists
    if (videoElementRef.current && containerRef.current.contains(videoElementRef.current)) {
      videoElementRef.current.pause();
      videoElementRef.current.src = '';
      videoElementRef.current.load();
      containerRef.current.removeChild(videoElementRef.current);
      videoElementRef.current = null;
    }
    
    // Remove overlay if exists
    if (overlayElementRef.current && containerRef.current.contains(overlayElementRef.current)) {
      containerRef.current.removeChild(overlayElementRef.current);
      overlayElementRef.current = null;
    }
  };

  // Listen for player instantiation to remove background
  useEffect(() => {
    if (!containerRef || !containerRef.current) return;
    
    // Function to handle player instantiation
    const handlePlayerInstantiated = () => {
      console.log("🎬 PersistentBackground: Player instantiated, removing background");
      setIsPlayerInstantiated(true);
      
      // Fade out elements
      if (bgElementRef.current) bgElementRef.current.style.opacity = '0';
      if (videoElementRef.current) videoElementRef.current.style.opacity = '0';
      if (overlayElementRef.current) overlayElementRef.current.style.opacity = '0';
      
      // Remove after transition
      setTimeout(() => {
        clearBackgroundElements();
      }, 1500);
    };
    
    // Check if player is already instantiated
    if (window.isPlayerInstantiated) {
      console.log("🎬 PersistentBackground: Player was already instantiated");
      handlePlayerInstantiated();
      return;
    }
    
    // Subscribe to player instantiated events
    eventBus.subscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    
    // Failsafe removal
    const timeoutId = setTimeout(() => {
      console.log("🎬 PersistentBackground: Timeout reached, removing background");
      handlePlayerInstantiated();
    }, 30000);
    
    return () => {
      // Clean up event listeners
      eventBus.unsubscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
      clearTimeout(timeoutId);
      
      // Clean up elements
      clearBackgroundElements();
    };
  }, [containerRef]);

  // This component doesn't render anything visible
  return null;
};

PersistentBackground.propTypes = {
  backgroundUrl: PropTypes.string,
  videoBackgroundUrl: PropTypes.string,
  containerRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element)
  })
};

export default PersistentBackground; 