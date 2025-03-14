/**
 * MediaScreenController.jsx
 * 
 * This component manages media screens in the Unity application, handling interactions
 * between React and Unity for displaying images and videos on media screens.
 * 
 * NOTE: This component has extensive debug logging that is disabled by default.
 * If you're experiencing issues with media screens or seeing excessive console logs,
 * you can enable debug logging by setting DEBUG_MEDIA_SCREEN to true below.
 * 
 * When debug logging is enabled, this component will output detailed information about:
 * - Media screen registrations
 * - Click events
 * - Image/video loading
 * - State changes
 * 
 * This can help diagnose issues with media screens not displaying correctly.
 */

// Debug flag - set to true to enable detailed logging for this component
const DEBUG_MEDIA_SCREEN = false; // Set to true to enable debug logging

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Text,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  useDisclosure,
  Icon,
  Modal,
  ModalOverlay,
  ModalCloseButton,
  ModalContent,
  ModalBody,
  Portal,
  Image,
  Flex
} from '@chakra-ui/react';
import { FiImage, FiCheck } from 'react-icons/fi';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import MediaScreenUploadModal from './MediaScreenUploadModal';
import { getMediaScreenImagesFromFirestore, getMediaScreenImage } from '@disruptive-spaces/shared/firebase/mediaScreenFirestore';
import { useUnity } from '../providers/UnityProvider';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { useMediaScreenVideoPlayer } from '../hooks/unityEvents/useMediaScreenVideoPlayer';
import { useMediaScreenThumbnails } from '../hooks/unityEvents/useMediaScreenThumbnails';
import { useUnityMediaScreenImages } from '../hooks/unityEvents/useUnityMediaScreenImages';
import MediaScreenVideoPlayer from './MediaScreenVideoPlayer';
import { useUnityInputManager } from '../hooks/useUnityInputManager';
import { useListenForUnityEvent } from '../hooks/unityEvents/core/useListenForUnityEvent';

// Helper function for conditional logging
const debugLog = (...args) => {
  if (DEBUG_MEDIA_SCREEN) {
    console.log(...args);
  }
};

// Add a custom hook to manage the image viewer modal
const useImageViewerModal = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentMediaType, setCurrentMediaType] = useState('image');
  const modalContentRef = useRef(null);
  
  // Use the Unity input manager hook to disable Unity input when modal is open
  useUnityInputManager(isOpen, 'image-viewer-modal');
  
  // Prevent mouse events from reaching the Unity canvas
  const preventPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);
  
  // Add event listeners to capture mouse events at the modal level
  useEffect(() => {
    if (isOpen && modalContentRef.current) {
      const modalElement = modalContentRef.current;
      
      // Add event listeners to prevent mouse events from reaching Unity
      modalElement.addEventListener('mousemove', preventPropagation);
      modalElement.addEventListener('mousedown', preventPropagation);
      modalElement.addEventListener('mouseup', preventPropagation);
      modalElement.addEventListener('wheel', preventPropagation);
      
      // Find the Unity canvas element and disable pointer events
      const unityCanvas = document.getElementById('unity-canvas');
      if (unityCanvas) {
        unityCanvas.style.pointerEvents = 'none';
      }
      
      // Clean up event listeners
      return () => {
        modalElement.removeEventListener('mousemove', preventPropagation);
        modalElement.removeEventListener('mousedown', preventPropagation);
        modalElement.removeEventListener('mouseup', preventPropagation);
        modalElement.removeEventListener('wheel', preventPropagation);
        
        // Re-enable pointer events on the Unity canvas
        if (unityCanvas) {
          unityCanvas.style.pointerEvents = 'auto';
        }
      };
    }
  }, [isOpen, preventPropagation]);
  
  const openImageViewer = (imageUrl, mediaType = 'image') => {
    debugLog(`Opening image viewer with URL: ${imageUrl} and media type: ${mediaType}`);
    console.log(`[DEBUG] Opening image viewer with URL: ${imageUrl} and original media type: ${mediaType}`);
    
    // Determine if this is actually an image URL by checking the extension or content
    const isActuallyImage = typeof imageUrl === 'string' && (
      imageUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || 
      imageUrl.includes('firebasestorage') && !imageUrl.includes('video')
    );
    
    // Always use 'image' type if it's clearly an image URL, regardless of what was passed
    const effectiveMediaType = isActuallyImage ? 'image' : mediaType;
    console.log(`[DEBUG] Detected URL as ${isActuallyImage ? 'image' : 'non-image'}, using media type: ${effectiveMediaType}`);
    
    setCurrentImageUrl(imageUrl);
    setCurrentMediaType(effectiveMediaType);
    onOpen();
  };
  
  const closeImageViewer = () => {
    onClose();
    // Reset state after a delay to ensure smooth transition
    setTimeout(() => {
      setCurrentImageUrl(null);
      setCurrentMediaType('image');
    }, 300);
  };
  
  return {
    isOpen,
    currentImageUrl,
    currentMediaType,
    openImageViewer,
    closeImageViewer,
    modalContentRef,
    preventPropagation
  };
};

// Add a style tag to prevent pointer events when the image modal is open
const ImageViewerStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
        body.unity-input-disabled #unity-container,
        body.unity-input-disabled #unity-canvas {
          pointer-events: none !important;
        }
        
        .image-viewer-modal-content {
          pointer-events: auto !important;
        }
        
        .chakra-modal__overlay {
          pointer-events: auto !important;
        }
      `
    }}
  />
);

// Helper function to clean Firebase Storage URLs to avoid CORS issues
const cleanFirebaseUrl = (url) => {
  if (!url) return null;
  
  try {
    // Check if it's a Firebase Storage URL
    if (url.includes('firebasestorage.googleapis.com')) {
      // Parse the URL
      const urlObj = new URL(url);
      
      // Keep only essential parameters (alt=media and token)
      const alt = urlObj.searchParams.get('alt');
      const token = urlObj.searchParams.get('token');
      
      // Clear all parameters
      urlObj.search = '';
      
      // Add back only the essential ones
      if (alt) urlObj.searchParams.set('alt', alt);
      if (token) urlObj.searchParams.set('token', token);
      
      debugLog(`Cleaned Firebase URL from ${url} to ${urlObj.toString()}`);
      return urlObj.toString();
    }
    return url;
  } catch (error) {
    console.error('Error cleaning Firebase URL:', error);
    return url;
  }
};

const MediaScreenController = () => {
  const { spaceID } = useUnity();
  const [isEditMode, setIsEditMode] = useState(false);
  const [mediaScreens, setMediaScreens] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [screenImages, setScreenImages] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const reactUnityEventHandlerRef = useRef(null);
  const queueMessage = useSendUnityEvent();
  const { fullscreenRef } = useFullscreenContext();
  const listenToUnityMessage = useListenForUnityEvent();
  const [unityReady, setUnityReady] = useState(false);

  // Use the custom hook for image viewer modal
  const {
    isOpen: isViewerOpen,
    currentImageUrl,
    currentMediaType,
    openImageViewer,
    closeImageViewer: onViewerClose,
    modalContentRef,
    preventPropagation
  } = useImageViewerModal();
  
  // Add video player hook
  const [videoUrl, videoTitle, currentVideoMediaScreenId, resetVideoUrl, isVideoProcessing] = useMediaScreenVideoPlayer(isEditMode);
  
  // Add video modal disclosure
  const { isOpen: isVideoModalOpen, onOpen: onVideoModalOpen, onClose: onVideoModalClose } = useDisclosure();
  
  // Initialize thumbnail generation
  useMediaScreenThumbnails();
  
  // Initialize media screen images
  useUnityMediaScreenImages();

  // Add Unity ready state listener
  useEffect(() => {
    // Check if Unity is already ready via window flag
    if (window.isPlayerInstantiated) {
      debugLog("MediaScreenController: Unity already ready (via window flag)");
      setUnityReady(true);
      return;
    }

    // Otherwise, listen for the PlayerInstantiated event
    const handlePlayerInstantiated = () => {
      debugLog("MediaScreenController: Unity is now ready (PlayerInstantiated event)");
      setUnityReady(true);
    };

    // Add event listener
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    // Cleanup
    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Helper function to get the latest screen data
  const getLatestScreenData = useCallback((screenId) => {
    debugLog("Getting latest screen data for:", screenId, "mediaScreens:", mediaScreens);
    
    // Ensure mediaScreens is an array before using find
    if (Array.isArray(mediaScreens) && mediaScreens.length > 0) {
      // Find the screen in our current state
      const screen = mediaScreens.find(s => s.mediaScreenId === screenId);
      if (screen) {
        const imageUrl = screen.imageUrl;
        const videoUrl = screen.videoUrl;
        
        debugLog("Found screen in mediaScreens:", screen);
        
        return { 
          screen, 
          imageUrl,
          videoUrl,
          mediaType: screen.mediaType || 'image', // Default to image if not specified
          displayAsVideo: screen.displayAsVideo || false // Include displayAsVideo flag
        };
      }
    } else {
      console.warn("mediaScreens is not an array or is empty:", mediaScreens);
    }
    
    // If not found in mediaScreens, check currentImageUrl
    if (currentImageUrl) {
      debugLog("Using currentImageUrl as fallback:", currentImageUrl);
      
      // Try to find additional metadata in the mediaScreens array if it exists
      let screenMetadata = null;
      if (Array.isArray(mediaScreens)) {
        screenMetadata = mediaScreens.find(s => s.mediaScreenId === screenId);
      }
      
      return { 
        screen: screenMetadata || { mediaScreenId: screenId }, 
        imageUrl: currentImageUrl,
        videoUrl: null,
        mediaType: screenMetadata?.mediaType || 'image', // Default to image for backward compatibility
        displayAsVideo: screenMetadata?.displayAsVideo || false // Include displayAsVideo flag
      };
    }
    
    // Last resort: Try to fetch the media screen data directly from Firestore
    if (spaceID && screenId) {
      debugLog(`Attempting to fetch media screen data for ${screenId} from Firestore`);
      
      // Return a placeholder and trigger an async fetch
      getMediaScreenImage(spaceID, screenId)
        .then(mediaScreen => {
          if (mediaScreen) {
            debugLog(`Retrieved media screen data for ${screenId} from Firestore:`, mediaScreen);
            
            // Update the mediaScreens state with this data
            setMediaScreens(prevScreens => {
              // Check if the screen already exists
              const exists = Array.isArray(prevScreens) && 
                prevScreens.some(screen => screen.mediaScreenId === screenId);
              
              if (exists) {
                return prevScreens.map(screen => 
                  screen.mediaScreenId === screenId ? {
                    ...screen,
                    imageUrl: mediaScreen.imageUrl,
                    videoUrl: mediaScreen.videoUrl,
                    mediaType: mediaScreen.mediaType || 'image',
                    displayAsVideo: mediaScreen.displayAsVideo || false,
                    hasImage: !!mediaScreen.imageUrl,
                    source: 'firestore-fetch',
                    lastUpdated: new Date().toISOString()
                  } : screen
                );
              } else {
                return [...(Array.isArray(prevScreens) ? prevScreens : []), {
                  mediaScreenId: screenId,
                  imageUrl: mediaScreen.imageUrl,
                  videoUrl: mediaScreen.videoUrl,
                  mediaType: mediaScreen.mediaType || 'image',
                  displayAsVideo: mediaScreen.displayAsVideo || false,
                  hasImage: !!mediaScreen.imageUrl,
                  source: 'firestore-fetch',
                  firstDetected: new Date().toISOString(),
                  lastUpdated: new Date().toISOString()
                }];
              }
            });
          }
        })
        .catch(error => {
          console.error(`Error fetching media screen data for ${screenId}:`, error);
        });
    }
    
    console.warn("No screen data found for:", screenId);
    return null;
  }, [mediaScreens, currentImageUrl, spaceID, setMediaScreens]);
  
  // Function to handle media screen clicks - defined outside of useEffect
  const processMediaScreenClick = useCallback((screenId) => {
    console.log(`[DEBUG] Processing click on screen: ${screenId}, isEditMode: ${isEditMode}`);
    debugLog(`Processing click on screen: ${screenId}`);
    
    // Set this as the selected screen
    setSelectedScreen(screenId);
    
    // Open the appropriate modal based on edit mode
    if (isEditMode) {
      console.log(`[DEBUG] Opening upload modal for screen: ${screenId} in edit mode`);
      debugLog("Opening upload modal (edit mode)");
      onOpen(); // Open upload modal in edit mode
    } else {
      // Get the latest screen data
      const screenData = getLatestScreenData(screenId);
      debugLog("Screen data for click:", screenData);
      
      if (screenData) {
        console.log(`[DEBUG] Screen data for ${screenId}:`, screenData);
        debugLog("Screen data details:", {
          mediaScreenId: screenId,
          imageUrl: screenData.imageUrl,
          videoUrl: screenData.videoUrl,
          mediaType: screenData.mediaType,
          displayAsVideo: screenData.displayAsVideo
        });
        
        // Check if we're trying to open the same video that's already playing
        const isSameVideoScreen = isVideoModalOpen && currentVideoMediaScreenId === screenId;
        if (isSameVideoScreen) {
          debugLog("This video is already playing, ignoring click");
          return;
        }
        
        // Check if this media screen should be displayed as a video
        if (screenData.displayAsVideo && screenData.videoUrl) {
          debugLog(`Opening video player for: ${screenData.videoUrl}`);
          
          // Send the event to Unity to trigger the hook
          // The hook will handle setting currentVideoMediaScreenId
          queueMessage("PlayMediaScreenVideo", { 
            mediaScreenId: screenId,
            // Include the videoUrl directly to avoid needing to fetch it again
            videoUrl: screenData.videoUrl
          });
        } else if (screenData.imageUrl) {
          debugLog(`Opening viewer modal with ${screenData.mediaType}: ${screenData.imageUrl}`);
          // Clean the URL to avoid CORS issues
          const cleanedImageUrl = cleanFirebaseUrl(screenData.imageUrl);
          openImageViewer(cleanedImageUrl, screenData.mediaType || 'image');
        } else {
          // If we don't have image data, try to fetch it directly from Firestore
          debugLog("No media found in state, attempting to fetch from Firestore");
          
          if (spaceID) {
            getMediaScreenImage(spaceID, screenId)
              .then(mediaScreen => {
                if (mediaScreen) {
                  debugLog(`Retrieved media screen data for ${screenId} from Firestore:`, mediaScreen);
                  
                  // Now that we have the data, determine what to display
                  if (mediaScreen.displayAsVideo && mediaScreen.videoUrl) {
                    debugLog(`Opening video player for: ${mediaScreen.videoUrl}`);
                    queueMessage("PlayMediaScreenVideo", { 
                      mediaScreenId: screenId,
                      videoUrl: mediaScreen.videoUrl
                    });
                  } else if (mediaScreen.imageUrl) {
                    debugLog(`Opening viewer modal with image: ${mediaScreen.imageUrl}`);
                    // Clean the URL to avoid CORS issues
                    const cleanedImageUrl = cleanFirebaseUrl(mediaScreen.imageUrl);
                    openImageViewer(cleanedImageUrl, mediaScreen.mediaType || 'image');
                  } else {
                    debugLog("No media found for screen in Firestore:", screenId);
                  }
                  
                  // Update our state with this data for future use
                  setMediaScreens(prevScreens => {
                    const exists = Array.isArray(prevScreens) && 
                      prevScreens.some(screen => screen.mediaScreenId === screenId);
                    
                    if (exists) {
                      return prevScreens.map(screen => 
                        screen.mediaScreenId === screenId ? {
                          ...screen,
                          ...mediaScreen,
                          mediaScreenId: screenId,
                          source: 'firestore-click',
                          lastUpdated: new Date().toISOString()
                        } : screen
                      );
                    } else {
                      return [...(Array.isArray(prevScreens) ? prevScreens : []), {
                        ...mediaScreen,
                        mediaScreenId: screenId,
                        source: 'firestore-click',
                        firstDetected: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                      }];
                    }
                  });
                } else {
                  debugLog("No media found for screen in Firestore:", screenId);
                }
              })
              .catch(error => {
                console.error(`Error fetching media screen data for ${screenId}:`, error);
              });
          }
        }
      } else {
        debugLog("No media found for screen in state, attempting to fetch from Firestore");
        
        // Try to fetch the data directly from Firestore
        if (spaceID) {
          getMediaScreenImage(spaceID, screenId)
            .then(mediaScreen => {
              if (mediaScreen) {
                debugLog(`Retrieved media screen data for ${screenId} from Firestore:`, mediaScreen);
                
                // Now that we have the data, determine what to display
                if (mediaScreen.displayAsVideo && mediaScreen.videoUrl) {
                  debugLog(`Opening video player for: ${mediaScreen.videoUrl}`);
                  queueMessage("PlayMediaScreenVideo", { 
                    mediaScreenId: screenId,
                    videoUrl: mediaScreen.videoUrl
                  });
                } else if (mediaScreen.imageUrl) {
                  debugLog(`Opening viewer modal with image: ${mediaScreen.imageUrl}`);
                  // Clean the URL to avoid CORS issues
                  const cleanedImageUrl = cleanFirebaseUrl(mediaScreen.imageUrl);
                  openImageViewer(cleanedImageUrl, mediaScreen.mediaType || 'image');
                } else {
                  debugLog("No media found for screen in Firestore:", screenId);
                }
                
                // Update our state with this data for future use
                setMediaScreens(prevScreens => {
                  const exists = Array.isArray(prevScreens) && 
                    prevScreens.some(screen => screen.mediaScreenId === screenId);
                  
                  if (exists) {
                    return prevScreens.map(screen => 
                      screen.mediaScreenId === screenId ? {
                        ...screen,
                        ...mediaScreen,
                        mediaScreenId: screenId,
                        source: 'firestore-click',
                        lastUpdated: new Date().toISOString()
                      } : screen
                    );
                  } else {
                    return [...(Array.isArray(prevScreens) ? prevScreens : []), {
                      ...mediaScreen,
                      mediaScreenId: screenId,
                      source: 'firestore-click',
                      firstDetected: new Date().toISOString(),
                      lastUpdated: new Date().toISOString()
                    }];
                  }
                });
              } else {
                debugLog("No media found for screen in Firestore:", screenId);
              }
            })
            .catch(error => {
              console.error(`Error fetching media screen data for ${screenId}:`, error);
            });
        }
      }
    }
  }, [isEditMode, onOpen, getLatestScreenData, isVideoModalOpen, currentVideoMediaScreenId, queueMessage, openImageViewer, spaceID]);

  // Fetch media screen images from Firestore
  useEffect(() => {
    // Only proceed if Unity is ready
    if (!unityReady) {
      debugLog("MediaScreenController: Waiting for Unity to be ready before fetching media screen images");
      return;
    }

    debugLog("MediaScreenController: Unity is ready, now fetching media screen images");
    
    const fetchMediaScreenImages = async () => {
      if (!spaceID) return;
      
      try {
        const images = await getMediaScreenImagesFromFirestore(spaceID);
        const imageMap = {};
        
        images.forEach(image => {
          if (image.id && image.imageUrl) {
            imageMap[image.id] = image.imageUrl;
          }
        });
        
        setMediaScreens(prevScreens => {
          return prevScreens.map(screen => {
            const hasImage = !!imageMap[screen.mediaScreenId];
            const imageUrl = imageMap[screen.mediaScreenId];
            const mediaType = screen.mediaType || 'image'; // Default to image if not specified
            
            return {
              ...screen,
              hasImage,
              imageUrl,
              mediaType
            };
          });
        });
      } catch (error) {
        console.error('Error fetching media screen images:', error);
      }
    };
    
    // Always fetch images regardless of edit mode
    fetchMediaScreenImages();
    
    // Set up a refresh interval if in edit mode
    let intervalId = null;
    if (isEditMode) {
      intervalId = setInterval(fetchMediaScreenImages, 5000); // Refresh every 5 seconds in edit mode
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [spaceID, isEditMode, refreshTrigger, unityReady]);

  // Handle image changes from the upload modal
  const handleImageChange = (changeData) => {
    // Update the mediaScreens state immediately
    setMediaScreens(prevScreens => {
      return prevScreens.map(screen => {
        if (screen.mediaScreenId === changeData.mediaScreenId) {
          if (changeData.type === 'upload') {
            return {
              ...screen,
              hasImage: true,
              imageUrl: changeData.imageUrl,
              mediaType: changeData.mediaType || 'image'
            };
          } else if (changeData.type === 'delete') {
            return {
              ...screen,
              hasImage: false,
              imageUrl: null,
              mediaType: null
            };
          }
        }
        return screen;
      });
    });
    
    // For deletions, force an immediate refresh
    if (changeData.type === 'delete') {
      // Force a refresh immediately
      setTimeout(() => {
        setMediaScreens(prevScreens => {
          return prevScreens.filter(screen => screen.mediaScreenId !== changeData.mediaScreenId);
        });
      }, 100);
      
      // And another refresh after a delay to ensure Firestore has updated
      setTimeout(() => {
        setMediaScreens(prevScreens => {
          return prevScreens.filter(screen => screen.mediaScreenId !== changeData.mediaScreenId);
        });
      }, 1500);
    } else {
      // For uploads, a single delayed refresh is sufficient
      setTimeout(() => {
        setMediaScreens(prevScreens => {
          // Check if the screen already exists in the array
          const screenExists = prevScreens.some(screen => screen.mediaScreenId === changeData.mediaScreenId);
          
          if (screenExists) {
            // Update the existing screen
            return prevScreens.map(screen => {
              if (screen.mediaScreenId === changeData.mediaScreenId) {
                return {
                  ...screen,
                  imageUrl: changeData.imageUrl,
                  hasImage: true,
                  mediaType: changeData.mediaType || 'image'
                };
              }
              return screen;
            });
          } else {
            // Add a new screen
            return [...prevScreens, {
              mediaScreenId: changeData.mediaScreenId,
              imageUrl: changeData.imageUrl,
              hasImage: true,
              mediaType: changeData.mediaType || 'image',
              source: 'delayed-update',
              firstDetected: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }];
          }
        });
      }, 1000);
    }
  };

  // Listen for Edit Mode changes
  useEffect(() => {
    const handleEditModeChange = (event) => {
      const isEnabled = event.detail.enabled;
      setIsEditMode(isEnabled);
      
      // When edit mode is enabled, log some debug info
      if (isEnabled) {
        debugLog("MediaScreenController: Edit mode enabled, checking for Unity integration");
        
        // Check if Unity functions exist
        if (window.dispatchReactUnityEvent) {
          debugLog("MediaScreenController: dispatchReactUnityEvent is available");
        } else {
          debugLog("MediaScreenController: dispatchReactUnityEvent is NOT available");
        }
        
        // Tell Unity to show upload icons on media screens
        queueMessage("SetMediaScreenEditMode", { enabled: true, showUploadIcon: true });
      } else {
        // Tell Unity to hide upload icons when edit mode is disabled
        queueMessage("SetMediaScreenEditMode", { enabled: false, showUploadIcon: false });
      }
    };

    window.addEventListener('editModeChanged', handleEditModeChange);
    return () => {
      window.removeEventListener('editModeChanged', handleEditModeChange);
    };
  }, [queueMessage]);

  // Add the JavaScript function to the window object
  useEffect(() => {
    // Define the function to receive click events from Unity
    window.JsSendMediaScreenClick = function(jsonData) {
      console.log("Unity: MediaScreenClick received with data:", jsonData);
      
      try {
        const data = JSON.parse(jsonData);
        
        // Create and dispatch a custom event
        const event = new CustomEvent('MediaScreenClick', {
          detail: JSON.stringify(data)
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error("Error processing MediaScreenClick data:", error);
      }
    };
    
    // Add a direct handler function that can be called from Unity
    window.handleMediaScreenClick = function(mediaScreenId) {
      console.log("Direct call to handleMediaScreenClick with ID:", mediaScreenId);
      processMediaScreenClick(mediaScreenId);
    };
    
    // Add a debug function to test if Unity can call JavaScript functions
    window.TestJavaScriptFromUnity = function(message) {
      console.log("Unity called TestJavaScriptFromUnity with:", message);
      alert("Unity called JavaScript: " + message);
    };
    
    return () => {
      // Clean up
      delete window.JsSendMediaScreenClick;
      delete window.handleMediaScreenClick;
      delete window.TestJavaScriptFromUnity;
    };
  }, [processMediaScreenClick]);

  // Listen for MediaScreen registrations from Unity
  useEffect(() => {
    // REMOVE the console.log interceptor that was causing all logs to be processed
    // Instead, use direct event listeners for the specific events we care about

    const handleRegisterMediaScreen = (event) => {
      try {
        const data = JSON.parse(event.detail);
        Logger.log(`MediaScreen registered: ${data.mediaScreenId}`);
        debugLog(`MediaScreen registered from Unity:`, data);
        
        setMediaScreens(prevScreens => {
          // Check if screen already exists
          const exists = prevScreens.some(screen => screen.mediaScreenId === data.mediaScreenId);
          if (exists) {
            return prevScreens.map(screen => 
              screen.mediaScreenId === data.mediaScreenId ? { 
                ...screen, 
                ...data,
                source: 'event',
                lastUpdated: new Date().toISOString()
              } : screen
            );
          } else {
            return [...prevScreens, {
              ...data,
              source: 'event',
              firstDetected: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }];
          }
        });
        
        // If we're in edit mode, tell this newly registered media screen to show the upload icon
        if (isEditMode) {
          // Send edit mode status to the newly registered media screen
          queueMessage("SetMediaScreenEditMode", { 
            mediaScreenId: data.mediaScreenId,
            enabled: true, 
            showUploadIcon: true 
          });
        }
        
        // Check if this media screen has content and if it should display as video
        const mediaScreenId = data.mediaScreenId;
        if (mediaScreenId) {
          // Get the media screen data from Firestore to check its display mode
          getMediaScreenImage(spaceID, mediaScreenId).then(mediaScreen => {
            if (mediaScreen) {
              debugLog(`Media screen data for ${mediaScreenId}:`, mediaScreen);
              
              // If this screen should display as video, send a null imageUrl to Unity
              // This prevents the image from briefly showing before switching to video mode
              if (mediaScreen.displayAsVideo && mediaScreen.videoUrl) {
                debugLog(`Media screen ${mediaScreenId} should display as video, sending null imageUrl`);
                queueMessage("SetMediaScreenImage", { 
                  mediaScreenId: mediaScreenId, 
                  imageUrl: null,
                  displayAsVideo: true 
                });
              }
            }
          }).catch(error => {
            console.error(`Error fetching media screen data for ${mediaScreenId}:`, error);
          });
        }
      } catch (error) {
        console.error('Error handling MediaScreen registration:', error);
      }
    };

    // Handle screen click events from Unity
    const handleMediaScreenClick = (event) => {
      try {
        debugLog("MediaScreenClick event received:", event);
        
        let mediaScreenId;
        
        if (typeof event === 'string') {
          // Direct call with screenId
          mediaScreenId = event;
          debugLog("MediaScreenClick: Direct call with ID:", mediaScreenId);
        } else {
          // Event from Unity
          debugLog("MediaScreenClick: Event from Unity:", event);
          debugLog("MediaScreenClick: Event detail:", event.detail);
          
          try {
            const data = JSON.parse(event.detail);
            mediaScreenId = data.mediaScreenId;
            debugLog("MediaScreenClick: Parsed mediaScreenId:", mediaScreenId);
          } catch (parseError) {
            console.error("MediaScreenClick: Error parsing event detail:", parseError);
            // Try to handle the case where detail might not be a JSON string
            if (event.detail && event.detail.mediaScreenId) {
              mediaScreenId = event.detail.mediaScreenId;
              debugLog("MediaScreenClick: Using direct mediaScreenId from detail:", mediaScreenId);
            } else {
              throw new Error("Could not extract mediaScreenId from event");
            }
          }
        }
        
        Logger.log(`MediaScreen clicked: ${mediaScreenId}`);
        debugLog(`MediaScreen clicked:`, mediaScreenId);
        
        // Process the click
        processMediaScreenClick(mediaScreenId);
      } catch (error) {
        console.error('Error handling MediaScreen click:', error);
      }
    };

    // Create a handler function for reactUnityEvent
    const handleReactUnityEvent = (event) => {
      if (event.detail && event.detail.eventName === 'RegisterMediaScreen') {
        handleRegisterMediaScreen({ detail: event.detail.eventData });
      } else if (event.detail && event.detail.eventName === 'MediaScreenClick') {
        handleMediaScreenClick({ detail: event.detail.eventData });
      } else if (event.detail && event.detail.eventName === 'SetMediaScreenImage') {
        try {
          const data = JSON.parse(event.detail.eventData);
          if (data.mediaScreenId) {
            debugLog("SetMediaScreenImage event received:", data);
            
            // Update mediaScreens state properly as an array
            setMediaScreens(prevScreens => {
              // Check if the screen already exists
              const screenExists = Array.isArray(prevScreens) && 
                prevScreens.some(screen => screen.mediaScreenId === data.mediaScreenId);
              
              if (screenExists) {
                // Update the existing screen
                return prevScreens.map(screen => {
                  if (screen.mediaScreenId === data.mediaScreenId) {
                    return {
                      ...screen,
                      imageUrl: data.imageUrl,
                      hasImage: !!data.imageUrl,
                      displayAsVideo: data.displayAsVideo || false,
                      lastUpdated: new Date().toISOString()
                    };
                  }
                  return screen;
                });
              } else {
                // Add a new screen
                return [...(Array.isArray(prevScreens) ? prevScreens : []), {
                  mediaScreenId: data.mediaScreenId,
                  imageUrl: data.imageUrl,
                  hasImage: !!data.imageUrl,
                  displayAsVideo: data.displayAsVideo || false,
                  source: 'set-media-screen-image',
                  firstDetected: new Date().toISOString(),
                  lastUpdated: new Date().toISOString()
                }];
              }
            });
          }
        } catch (error) {
          console.error('Error handling SetMediaScreenImage event:', error);
        }
      }
    };

    // Listen for Unity events with different event names
    window.addEventListener('RegisterMediaScreen', handleRegisterMediaScreen);
    window.addEventListener('MediaScreenClick', handleMediaScreenClick);
    window.addEventListener('reactUnityEvent', handleReactUnityEvent);
    
    return () => {
      // Remove event listeners
      window.removeEventListener('RegisterMediaScreen', handleRegisterMediaScreen);
      window.removeEventListener('MediaScreenClick', handleMediaScreenClick);
      window.removeEventListener('reactUnityEvent', handleReactUnityEvent);
    };
  }, [isEditMode, onOpen, queueMessage, mediaScreens, isViewerOpen, isVideoModalOpen, openImageViewer, processMediaScreenClick, spaceID]);

  // Add a direct event handler for MediaScreenClick
  useEffect(() => {
    // Define a direct handler for MediaScreenClick events
    const handleDirectMediaScreenClick = (event) => {
      try {
        debugLog("Direct MediaScreenClick event received:", event);
        
        // Extract the mediaScreenId from the event
        let mediaScreenId;
        if (event.detail) {
          try {
            const data = JSON.parse(event.detail);
            mediaScreenId = data.mediaScreenId;
          } catch (error) {
            console.error("Error parsing MediaScreenClick event detail:", error);
            return;
          }
        }
        
        if (!mediaScreenId) {
          console.error("No mediaScreenId found in MediaScreenClick event");
          return;
        }
        
        debugLog(`Direct handler: Processing click for media screen ${mediaScreenId}`);
        processMediaScreenClick(mediaScreenId);
      } catch (error) {
        console.error("Error in direct MediaScreenClick handler:", error);
      }
    };
    
    // Add the event listener
    window.addEventListener('MediaScreenClick', handleDirectMediaScreenClick);
    
    // Clean up
    return () => {
      window.removeEventListener('MediaScreenClick', handleDirectMediaScreenClick);
    };
  }, [processMediaScreenClick]);

  // Simulate a click for testing
  const simulateClick = (screenId) => {
    debugLog(`Simulating click on screen: ${screenId}`);
    if (window.handleMediaScreenClick) {
      window.handleMediaScreenClick(screenId);
    }
  };

  // Update the video modal when videoUrl changes
  useEffect(() => {
    debugLog("Video URL changed:", videoUrl);
    if (videoUrl) {
      debugLog("Opening video modal with URL:", videoUrl);
      onVideoModalOpen();
    }
  }, [videoUrl, onVideoModalOpen]);
  
  // Handle video modal close
  const handleVideoModalClose = () => {
    debugLog("Closing video modal and resetting URL");
    resetVideoUrl();
    onVideoModalClose();
  };

  // Add a direct listener for RegisterMediaScreen events from Unity
  useEffect(() => {
    const handleRegisterMediaScreenDirect = (data) => {
      try {
        Logger.log(`Direct RegisterMediaScreen event received with data:`, data);
        
        if (!data || !data.mediaScreenId) {
          Logger.warn("RegisterMediaScreen event received with invalid data");
          return;
        }
        
        const mediaScreenId = data.mediaScreenId;
        Logger.log(`Media screen registered directly: ${mediaScreenId}`);
        
        setMediaScreens(prevScreens => {
          // Check if screen already exists
          const exists = prevScreens.some(screen => screen.mediaScreenId === mediaScreenId);
          if (exists) {
            return prevScreens.map(screen => 
              screen.mediaScreenId === mediaScreenId ? { 
                ...screen, 
                ...data,
                source: 'direct-event',
                lastUpdated: new Date().toISOString()
              } : screen
            );
          } else {
            return [...prevScreens, {
              ...data,
              source: 'direct-event',
              firstDetected: new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }];
          }
        });
        
        // If we're in edit mode, tell this newly registered media screen to show the upload icon
        if (isEditMode) {
          // Send edit mode status to the newly registered media screen
          queueMessage("SetMediaScreenEditMode", { 
            mediaScreenId: mediaScreenId,
            enabled: true, 
            showUploadIcon: true 
          });
        }
      } catch (error) {
        console.error('Error handling direct RegisterMediaScreen event:', error);
      }
    };

    // Register the direct listener for RegisterMediaScreen events
    const unsubscribe = listenToUnityMessage("RegisterMediaScreen", handleRegisterMediaScreenDirect);
    
    return () => {
      unsubscribe();
    };
  }, [listenToUnityMessage, isEditMode, queueMessage]);

  // Add a direct listener for MediaScreenClick events from Unity
  useEffect(() => {
    const handleMediaScreenClickDirect = (data) => {
      try {
        Logger.log(`Direct MediaScreenClick event received with data:`, data);
        
        if (!data || !data.mediaScreenId) {
          Logger.warn("MediaScreenClick event received with invalid data");
          return;
        }
        
        const mediaScreenId = data.mediaScreenId;
        Logger.log(`Media screen clicked directly: ${mediaScreenId}`);
        
        // Process the click using our existing function
        processMediaScreenClick(mediaScreenId);
      } catch (error) {
        console.error('Error handling direct MediaScreenClick event:', error);
      }
    };

    // Register the direct listener for MediaScreenClick events
    const unsubscribe = listenToUnityMessage("MediaScreenClick", handleMediaScreenClickDirect);
    
    return () => {
      unsubscribe();
    };
  }, [listenToUnityMessage, processMediaScreenClick]);

  // Add a useEffect to watch for changes to currentVideoMediaScreenId in edit mode
  useEffect(() => {
    // Only run this effect when in edit mode
    if (isEditMode && currentVideoMediaScreenId) {
      console.log(`[DEBUG] Detected currentVideoMediaScreenId change in edit mode: ${currentVideoMediaScreenId}`);
      
      // Set the selected screen and open the upload modal
      setSelectedScreen(currentVideoMediaScreenId);
      onOpen();
      
      // Reset the currentVideoMediaScreenId to prevent reopening the modal
      // when toggling edit mode off and on again
      resetVideoUrl();
    }
  }, [isEditMode, currentVideoMediaScreenId, onOpen, resetVideoUrl]);

  return (
    <>
      {/* Upload Modal (for edit mode) */}
      <MediaScreenUploadModal 
        isOpen={isOpen} 
        onClose={onClose} 
        mediaScreenId={selectedScreen}
        onImageChange={handleImageChange}
      />
      
      {/* Media Viewer Modal (for view mode) */}
      <ImageViewerStyles />
      <Portal containerRef={fullscreenRef}>
        <Modal 
          isOpen={isViewerOpen} 
          onClose={onViewerClose} 
          size="lg" 
          isCentered
          portalProps={{ containerRef: fullscreenRef }}
          id="image-viewer-modal"
          blockScrollOnMount={true}
        >
          <ModalOverlay 
            bg="rgba(0, 0, 0, 0.8)" 
            onClick={preventPropagation}
            onMouseMove={preventPropagation}
            onMouseDown={preventPropagation}
            onMouseUp={preventPropagation}
            onWheel={preventPropagation}
          />
          <ModalContent
            ref={modalContentRef}
            bg="gray.900"
            color="white"
            borderRadius="lg"
            overflow="hidden"
            maxWidth="80vw"
            maxHeight="80vh"
            display="flex"
            justifyContent="center"
            alignItems="center"
            position="relative"
            zIndex="10000"
            className="image-viewer-modal-content"
            onClick={preventPropagation}
            onMouseMove={preventPropagation}
            onMouseDown={preventPropagation}
            onMouseUp={preventPropagation}
            onWheel={preventPropagation}
          >
            <ModalCloseButton
              size="lg"
              bg="gray.700"
              color="white"
              borderRadius="full"
              zIndex="modal"
              _hover={{ bg: "gray.600" }}
              _focus={{ boxShadow: "none" }}
              position="absolute"
              top="10px"
              right="10px"
            />
            <ModalBody 
              p={0} 
              width="100%"
              onClick={preventPropagation}
              onMouseMove={preventPropagation}
              onMouseDown={preventPropagation}
              onMouseUp={preventPropagation}
              onWheel={preventPropagation}
            >
              {currentImageUrl ? (
                <Box 
                  position="relative"
                  width="100%"
                  height="100%"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  onClick={preventPropagation}
                  onMouseMove={preventPropagation}
                  onMouseDown={preventPropagation}
                  onMouseUp={preventPropagation}
                  onWheel={preventPropagation}
                >
                  {currentMediaType === 'image' ? (
                    <Image
                      src={currentImageUrl}
                      maxWidth="100%"
                      maxHeight="80vh"
                      objectFit="contain"
                      alt="Media Screen Image"
                      onLoad={() => console.log("Image loaded successfully:", currentImageUrl)}
                      onError={(e) => console.error("Error loading image:", e, currentImageUrl)}
                      onClick={preventPropagation}
                    />
                  ) : (
                    <Box 
                      width="100%" 
                      textAlign="center"
                      onClick={preventPropagation}
                      onMouseMove={preventPropagation}
                      onMouseDown={preventPropagation}
                      onMouseUp={preventPropagation}
                      onWheel={preventPropagation}
                    >
                      <Text mb={4} fontSize="lg">Video URL:</Text>
                      <Text 
                        p={3} 
                        bg="gray.800" 
                        borderRadius="md" 
                        fontSize="sm" 
                        wordBreak="break-all"
                        maxWidth="100%"
                      >
                        {currentImageUrl}
                      </Text>
                      <Text mt={4} fontSize="sm" color="gray.400">
                        Video playback will be implemented in a future update
                      </Text>
                    </Box>
                  )}
                </Box>
              ) : (
                <Flex 
                  direction="column" 
                  align="center" 
                  justify="center" 
                  h="400px"
                  onClick={preventPropagation}
                  onMouseMove={preventPropagation}
                  onMouseDown={preventPropagation}
                  onMouseUp={preventPropagation}
                  onWheel={preventPropagation}
                >
                  <Text>No image available</Text>
                </Flex>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Portal>
      
      {/* Video Player Modal */}
      <MediaScreenVideoPlayer
        videoUrl={videoUrl}
        videoTitle={videoTitle}
        mediaScreenId={currentVideoMediaScreenId}
        isOpen={isVideoModalOpen}
        onClose={handleVideoModalClose}
      />
    </>
  );
};

export default MediaScreenController; 