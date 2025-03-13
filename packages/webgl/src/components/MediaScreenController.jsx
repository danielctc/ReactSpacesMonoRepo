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

// Add a custom hook to manage the image viewer modal
const useImageViewerModal = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentMediaType, setCurrentMediaType] = useState('image');
  
  // Use the Unity input manager hook to disable Unity input when modal is open
  useUnityInputManager(isOpen, 'image-viewer-modal');
  
  const openImageViewer = (imageUrl, mediaType = 'image') => {
    console.log(`Opening image viewer with URL: ${imageUrl} and media type: ${mediaType}`);
    setCurrentImageUrl(imageUrl);
    setCurrentMediaType(mediaType);
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
    closeImageViewer
  };
};

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
      
      console.log(`Cleaned Firebase URL from ${url} to ${urlObj.toString()}`);
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

  // Use the custom hook for image viewer modal
  const {
    isOpen: isViewerOpen,
    currentImageUrl,
    currentMediaType,
    openImageViewer,
    closeImageViewer: onViewerClose
  } = useImageViewerModal();
  
  // Add video player hook
  const [videoUrl, videoTitle, currentVideoMediaScreenId, resetVideoUrl, isVideoProcessing] = useMediaScreenVideoPlayer(isEditMode);
  
  // Add video modal disclosure
  const { isOpen: isVideoModalOpen, onOpen: onVideoModalOpen, onClose: onVideoModalClose } = useDisclosure();
  
  // Initialize thumbnail generation
  useMediaScreenThumbnails();
  
  // Initialize media screen images
  useUnityMediaScreenImages();

  // Helper function to get the latest screen data
  const getLatestScreenData = useCallback((screenId) => {
    console.log("Getting latest screen data for:", screenId, "mediaScreens:", mediaScreens);
    
    // Ensure mediaScreens is an array before using find
    if (Array.isArray(mediaScreens) && mediaScreens.length > 0) {
      // Find the screen in our current state
      const screen = mediaScreens.find(s => s.mediaScreenId === screenId);
      if (screen) {
        const imageUrl = screen.imageUrl;
        const videoUrl = screen.videoUrl;
        
        console.log("Found screen in mediaScreens:", screen);
        
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
      console.log("Using currentImageUrl as fallback:", currentImageUrl);
      
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
      console.log(`Attempting to fetch media screen data for ${screenId} from Firestore`);
      
      // Return a placeholder and trigger an async fetch
      getMediaScreenImage(spaceID, screenId)
        .then(mediaScreen => {
          if (mediaScreen) {
            console.log(`Retrieved media screen data for ${screenId} from Firestore:`, mediaScreen);
            
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
    console.log(`Processing click on screen: ${screenId}`);
    
    // Set this as the selected screen
    setSelectedScreen(screenId);
    
    // Open the appropriate modal based on edit mode
    if (isEditMode) {
      console.log("Opening upload modal (edit mode)");
      onOpen(); // Open upload modal in edit mode
    } else {
      // Get the latest screen data
      const screenData = getLatestScreenData(screenId);
      console.log("Screen data for click:", screenData);
      
      if (screenData) {
        console.log("Screen data details:", {
          mediaScreenId: screenId,
          imageUrl: screenData.imageUrl,
          videoUrl: screenData.videoUrl,
          mediaType: screenData.mediaType,
          displayAsVideo: screenData.displayAsVideo
        });
        
        // Check if we're trying to open the same video that's already playing
        const isSameVideoScreen = isVideoModalOpen && currentVideoMediaScreenId === screenId;
        if (isSameVideoScreen) {
          console.log("This video is already playing, ignoring click");
          return;
        }
        
        // Check if this media screen should be displayed as a video
        if (screenData.displayAsVideo && screenData.videoUrl) {
          console.log(`Opening video player for: ${screenData.videoUrl}`);
          
          // Send the event to Unity to trigger the hook
          // The hook will handle setting currentVideoMediaScreenId
          queueMessage("PlayMediaScreenVideo", { 
            mediaScreenId: screenId,
            // Include the videoUrl directly to avoid needing to fetch it again
            videoUrl: screenData.videoUrl
          });
        } else if (screenData.imageUrl) {
          console.log(`Opening viewer modal with ${screenData.mediaType}: ${screenData.imageUrl}`);
          // Clean the URL to avoid CORS issues
          const cleanedImageUrl = cleanFirebaseUrl(screenData.imageUrl);
          openImageViewer(cleanedImageUrl, screenData.mediaType || 'image');
        } else {
          // If we don't have image data, try to fetch it directly from Firestore
          console.log("No media found in state, attempting to fetch from Firestore");
          
          if (spaceID) {
            getMediaScreenImage(spaceID, screenId)
              .then(mediaScreen => {
                if (mediaScreen) {
                  console.log(`Retrieved media screen data for ${screenId} from Firestore:`, mediaScreen);
                  
                  // Now that we have the data, determine what to display
                  if (mediaScreen.displayAsVideo && mediaScreen.videoUrl) {
                    console.log(`Opening video player for: ${mediaScreen.videoUrl}`);
                    queueMessage("PlayMediaScreenVideo", { 
                      mediaScreenId: screenId,
                      videoUrl: mediaScreen.videoUrl
                    });
                  } else if (mediaScreen.imageUrl) {
                    console.log(`Opening viewer modal with image: ${mediaScreen.imageUrl}`);
                    // Clean the URL to avoid CORS issues
                    const cleanedImageUrl = cleanFirebaseUrl(mediaScreen.imageUrl);
                    openImageViewer(cleanedImageUrl, mediaScreen.mediaType || 'image');
                  } else {
                    console.log("No media found for screen in Firestore:", screenId);
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
                  console.log("No media found for screen in Firestore:", screenId);
                }
              })
              .catch(error => {
                console.error(`Error fetching media screen data for ${screenId}:`, error);
              });
          }
        }
      } else {
        console.log("No media found for screen in state, attempting to fetch from Firestore");
        
        // Try to fetch the data directly from Firestore
        if (spaceID) {
          getMediaScreenImage(spaceID, screenId)
            .then(mediaScreen => {
              if (mediaScreen) {
                console.log(`Retrieved media screen data for ${screenId} from Firestore:`, mediaScreen);
                
                // Now that we have the data, determine what to display
                if (mediaScreen.displayAsVideo && mediaScreen.videoUrl) {
                  console.log(`Opening video player for: ${mediaScreen.videoUrl}`);
                  queueMessage("PlayMediaScreenVideo", { 
                    mediaScreenId: screenId,
                    videoUrl: mediaScreen.videoUrl
                  });
                } else if (mediaScreen.imageUrl) {
                  console.log(`Opening viewer modal with image: ${mediaScreen.imageUrl}`);
                  // Clean the URL to avoid CORS issues
                  const cleanedImageUrl = cleanFirebaseUrl(mediaScreen.imageUrl);
                  openImageViewer(cleanedImageUrl, mediaScreen.mediaType || 'image');
                } else {
                  console.log("No media found for screen in Firestore:", screenId);
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
                console.log("No media found for screen in Firestore:", screenId);
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
  }, [spaceID]);

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
        console.log("MediaScreenController: Edit mode enabled, checking for Unity integration");
        
        // Check if Unity functions exist
        if (window.dispatchReactUnityEvent) {
          console.log("MediaScreenController: dispatchReactUnityEvent is available");
        } else {
          console.log("MediaScreenController: dispatchReactUnityEvent is NOT available");
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
    // Add a console.log interceptor to catch Unity logs
    const originalConsoleLog = console.log;
    console.log = function() {
      // Check if this is a MediaScreen registration log
      if (arguments[0] && typeof arguments[0] === 'string') {
        const logMessage = Array.from(arguments).join(' ');
        
        // Check for MediaScreen registration logs
        if (logMessage.includes('Registering MediaScreen with ID') || 
            logMessage.includes('RegisterMediaScreen')) {
          
          // Try to extract the screen ID from the log
          const idMatch = logMessage.match(/MediaScreen with ID:?\s*([^\s,]+)/i);
          if (idMatch && idMatch[1]) {
            const screenId = idMatch[1];
            console.log(`MediaScreenController: Detected screen ID from console: ${screenId}`);
            
            // Add this screen to our state
            setMediaScreens(prevScreens => {
              const exists = prevScreens.some(screen => screen.mediaScreenId === screenId);
              if (exists) return prevScreens;
              
              return [...prevScreens, {
                mediaScreenId: screenId,
                source: 'console-log',
                firstDetected: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              }];
            });
          }
        }
        
        // Check for MediaScreen click logs
        if (logMessage.includes('MediaScreen clicked:') || 
            logMessage.includes('Sending MediaScreen click with ID')) {
          
          // Try to extract the screen ID from the log
          const idMatch = logMessage.match(/MediaScreen clicked:?\s*([^\s,]+)/i) || 
                          logMessage.match(/click with ID:?\s*([^\s,]+)/i);
          
          if (idMatch && idMatch[1]) {
            const screenId = idMatch[1];
            console.log(`MediaScreenController: Detected click from console for screen ID: ${screenId}`);
            
            // Process the click
            processMediaScreenClick(screenId);
          }
        }
      }
      
      // Call the original console.log
      return originalConsoleLog.apply(console, arguments);
    };

    const handleRegisterMediaScreen = (event) => {
      try {
        const data = JSON.parse(event.detail);
        Logger.log(`MediaScreen registered: ${data.mediaScreenId}`);
        console.log(`MediaScreen registered from Unity:`, data);
        
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
              console.log(`Media screen data for ${mediaScreenId}:`, mediaScreen);
              
              // If this screen should display as video, send a null imageUrl to Unity
              // This prevents the image from briefly showing before switching to video mode
              if (mediaScreen.displayAsVideo && mediaScreen.videoUrl) {
                console.log(`Media screen ${mediaScreenId} should display as video, sending null imageUrl`);
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
        console.log("MediaScreenClick event received:", event);
        
        let mediaScreenId;
        
        if (typeof event === 'string') {
          // Direct call with screenId
          mediaScreenId = event;
          console.log("MediaScreenClick: Direct call with ID:", mediaScreenId);
        } else {
          // Event from Unity
          console.log("MediaScreenClick: Event from Unity:", event);
          console.log("MediaScreenClick: Event detail:", event.detail);
          
          try {
            const data = JSON.parse(event.detail);
            mediaScreenId = data.mediaScreenId;
            console.log("MediaScreenClick: Parsed mediaScreenId:", mediaScreenId);
          } catch (parseError) {
            console.error("MediaScreenClick: Error parsing event detail:", parseError);
            // Try to handle the case where detail might not be a JSON string
            if (event.detail && event.detail.mediaScreenId) {
              mediaScreenId = event.detail.mediaScreenId;
              console.log("MediaScreenClick: Using direct mediaScreenId from detail:", mediaScreenId);
            } else {
              throw new Error("Could not extract mediaScreenId from event");
            }
          }
        }
        
        Logger.log(`MediaScreen clicked: ${mediaScreenId}`);
        console.log(`MediaScreen clicked:`, mediaScreenId);
        
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
            console.log("SetMediaScreenImage event received:", data);
            
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
      // Restore original console.log
      console.log = originalConsoleLog;
      
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
        console.log("Direct MediaScreenClick event received:", event);
        
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
        
        console.log(`Direct handler: Processing click for media screen ${mediaScreenId}`);
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
    console.log(`Simulating click on screen: ${screenId}`);
    if (window.handleMediaScreenClick) {
      window.handleMediaScreenClick(screenId);
    }
  };

  // Update the video modal when videoUrl changes
  useEffect(() => {
    console.log("Video URL changed:", videoUrl);
    if (videoUrl) {
      console.log("Opening video modal with URL:", videoUrl);
      onVideoModalOpen();
    }
  }, [videoUrl, onVideoModalOpen]);
  
  // Handle video modal close
  const handleVideoModalClose = () => {
    console.log("Closing video modal and resetting URL");
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
      <Portal containerRef={fullscreenRef}>
        <Modal 
          isOpen={isViewerOpen} 
          onClose={onViewerClose} 
          size="lg" 
          isCentered
          portalProps={{ containerRef: fullscreenRef }}
          id="image-viewer-modal"
        >
          <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
          <ModalContent
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
            <ModalBody p={0} width="100%">
              {currentImageUrl ? (
                <Box 
                  position="relative"
                  width="100%"
                  height="100%"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
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
                    />
                  ) : (
                    <Box width="100%" textAlign="center">
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
                <Flex direction="column" align="center" justify="center" h="400px">
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