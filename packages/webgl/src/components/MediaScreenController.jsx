/**
 * MediaScreenController.jsx
 * 
 * Manages media screens in Unity application - handles image/video display and interactions.
 * Set DEBUG_MEDIA_SCREEN to true for detailed logging.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, Text, Modal, ModalOverlay, ModalCloseButton, ModalContent, ModalBody, 
  Portal, Image, Flex, useDisclosure
} from '@chakra-ui/react';
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
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';

// Configuration
const DEBUG_MEDIA_SCREEN = false;
const EDIT_MODE_REFRESH_INTERVAL = 5000;

// Utilities
const debugLog = (...args) => DEBUG_MEDIA_SCREEN && console.log(...args);

const cleanFirebaseUrl = (url) => {
  if (!url?.includes('firebasestorage.googleapis.com')) return url;
  try {
    const urlObj = new URL(url);
    const alt = urlObj.searchParams.get('alt');
    const token = urlObj.searchParams.get('token');
    urlObj.search = '';
    if (alt) urlObj.searchParams.set('alt', alt);
    if (token) urlObj.searchParams.set('token', token);
    return urlObj.toString();
  } catch (error) {
    console.error('Error cleaning Firebase URL:', error);
    return url;
  }
};

// Custom hook for image viewer modal
const useImageViewerModal = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentMediaType, setCurrentMediaType] = useState('image');
  const modalContentRef = useRef(null);
  
  useUnityInputManager(isOpen, 'image-viewer-modal');
  
  const preventPropagation = useCallback((e) => e.stopPropagation(), []);
  
  useEffect(() => {
    if (!isOpen || !modalContentRef.current) return;
    
    const modalElement = modalContentRef.current;
    const unityCanvas = document.getElementById('unity-canvas');
    const events = ['mousemove', 'mousedown', 'mouseup', 'wheel'];
    
    events.forEach(event => modalElement.addEventListener(event, preventPropagation));
    if (unityCanvas) unityCanvas.style.pointerEvents = 'none';
    
    return () => {
      events.forEach(event => modalElement.removeEventListener(event, preventPropagation));
      if (unityCanvas) unityCanvas.style.pointerEvents = 'auto';
    };
  }, [isOpen, preventPropagation]);
  
  const openImageViewer = (imageUrl, mediaType = 'image') => {
    const isActuallyImage = typeof imageUrl === 'string' && (
      imageUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || 
      (imageUrl.includes('firebasestorage') && !imageUrl.includes('video'))
    );
    
    setCurrentImageUrl(imageUrl);
    setCurrentMediaType(isActuallyImage ? 'image' : mediaType);
    onOpen();
  };
  
  const closeImageViewer = () => {
    onClose();
    setTimeout(() => {
      setCurrentImageUrl(null);
      setCurrentMediaType('image');
    }, 300);
  };
  
  return {
    isOpen, currentImageUrl, currentMediaType, openImageViewer, 
    closeImageViewer, modalContentRef, preventPropagation
  };
};

// Styles for Unity input management
const ImageViewerStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      body.unity-input-disabled #unity-container,
      body.unity-input-disabled #unity-canvas { pointer-events: none !important; }
      .image-viewer-modal-content,
      .chakra-modal__overlay { pointer-events: auto !important; }
    `
  }} />
);


// Custom hook for media screen state management
const useMediaScreenState = () => {
  const [mediaScreens, setMediaScreens] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState(null);
  const [unityReady, setUnityReady] = useState(false);
  
  const updateMediaScreen = useCallback((screenId, updates) => {
    setMediaScreens(prevScreens => {
      const exists = Array.isArray(prevScreens) && 
        prevScreens.some(screen => screen.mediaScreenId === screenId);
      
      if (exists) {
        return prevScreens.map(screen => 
          screen.mediaScreenId === screenId 
            ? { ...screen, ...updates, lastUpdated: new Date().toISOString() }
            : screen
        );
      } else {
        return [...(Array.isArray(prevScreens) ? prevScreens : []), {
          mediaScreenId: screenId,
          ...updates,
          firstDetected: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }];
      }
    });
  }, []);
  
  const getScreenData = useCallback((screenId) => {
    if (!Array.isArray(mediaScreens)) return null;
    return mediaScreens.find(s => s.mediaScreenId === screenId);
  }, [mediaScreens]);
  
  return {
    mediaScreens, setMediaScreens, isEditMode, setIsEditMode,
    selectedScreen, setSelectedScreen, unityReady, setUnityReady,
    updateMediaScreen, getScreenData
  };
};

const MediaScreenController = () => {
  const { spaceID } = useUnity();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const queueMessage = useSendUnityEvent();
  const { fullscreenRef } = useFullscreenContext();
  const listenToUnityMessage = useListenForUnityEvent();
  const { trackReactEvent } = useAnalytics(spaceID);
  
  const {
    mediaScreens, setMediaScreens, isEditMode, setIsEditMode,
    selectedScreen, setSelectedScreen, unityReady, setUnityReady,
    updateMediaScreen, getScreenData
  } = useMediaScreenState();

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

  // Unity ready state management
  useEffect(() => {
    if (window.isPlayerInstantiated) {
      setUnityReady(true);
      return;
    }
    
    const handlePlayerInstantiated = () => setUnityReady(true);
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    return () => window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
  }, [setUnityReady]);

  // Enhanced screen data retrieval with Firestore fallback
  const getLatestScreenData = useCallback(async (screenId) => {
    const screen = getScreenData(screenId);
    if (screen) {
      return {
        screen,
        imageUrl: screen.imageUrl,
        videoUrl: screen.videoUrl,
        mediaType: screen.mediaType || 'image',
        displayAsVideo: screen.displayAsVideo || false
      };
    }
    
    // Fallback to currentImageUrl if available
    if (currentImageUrl) {
      return {
        screen: { mediaScreenId: screenId },
        imageUrl: currentImageUrl,
        videoUrl: null,
        mediaType: 'image',
        displayAsVideo: false
      };
    }
    
    // Last resort: Fetch from Firestore
    if (spaceID && screenId) {
      try {
        const mediaScreen = await getMediaScreenImage(spaceID, screenId);
        if (mediaScreen) {
          updateMediaScreen(screenId, {
            ...mediaScreen,
            hasImage: !!mediaScreen.imageUrl,
            source: 'firestore-fetch'
          });
          return {
            screen: mediaScreen,
            imageUrl: mediaScreen.imageUrl,
            videoUrl: mediaScreen.videoUrl,
            mediaType: mediaScreen.mediaType || 'image',
            displayAsVideo: mediaScreen.displayAsVideo || false
          };
        }
      } catch (error) {
        console.error(`Error fetching media screen data for ${screenId}:`, error);
      }
    }
    
    return null;
  }, [getScreenData, currentImageUrl, spaceID, updateMediaScreen]);
  
  // Simplified click handler
  const processMediaScreenClick = useCallback(async (screenId) => {
    setSelectedScreen(screenId);
    
    if (isEditMode) {
      onOpen();
      return;
    }
    
    // Prevent duplicate video opens
    if (isVideoModalOpen && currentVideoMediaScreenId === screenId) return;
    
    const screenData = await getLatestScreenData(screenId);
    if (!screenData) return;
    
    // Handle video display
    if (screenData.displayAsVideo && screenData.videoUrl) {
      queueMessage("PlayMediaScreenVideo", { 
        mediaScreenId: screenId,
        videoUrl: screenData.videoUrl
      });
    } 
    // Handle image display
    else if (screenData.imageUrl) {
      const cleanedImageUrl = cleanFirebaseUrl(screenData.imageUrl);
      openImageViewer(cleanedImageUrl, screenData.mediaType || 'image');
    }
  }, [isEditMode, onOpen, isVideoModalOpen, currentVideoMediaScreenId, 
      getLatestScreenData, queueMessage, openImageViewer]);

  // Fetch media screen images from Firestore
  useEffect(() => {
    if (!unityReady || !spaceID) return;
    
    const fetchMediaScreenImages = async () => {
      try {
        const images = await getMediaScreenImagesFromFirestore(spaceID);
        const imageMap = {};
        images.forEach(image => {
          if (image.id && image.imageUrl) imageMap[image.id] = image.imageUrl;
        });
        
        setMediaScreens(prevScreens => 
          prevScreens.map(screen => ({
            ...screen,
            hasImage: !!imageMap[screen.mediaScreenId],
            imageUrl: imageMap[screen.mediaScreenId],
            mediaType: screen.mediaType || 'image'
          }))
        );
      } catch (error) {
        console.error('Error fetching media screen images:', error);
      }
    };
    
    fetchMediaScreenImages();
    
    if (isEditMode) {
      const intervalId = setInterval(fetchMediaScreenImages, EDIT_MODE_REFRESH_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [spaceID, isEditMode, unityReady, setMediaScreens]);

  // Simplified image change handler
  const handleImageChange = useCallback((changeData) => {
    const { mediaScreenId, type, imageUrl, mediaType } = changeData;
    
    if (type === 'upload') {
      updateMediaScreen(mediaScreenId, {
        hasImage: true,
        imageUrl,
        mediaType: mediaType || 'image'
      });
    } else if (type === 'delete') {
      // Remove screen with delayed cleanup
      setTimeout(() => {
        setMediaScreens(prevScreens => 
          prevScreens.filter(screen => screen.mediaScreenId !== mediaScreenId)
        );
      }, 100);
    }
  }, [updateMediaScreen, setMediaScreens]);

  // Edit mode listener
  useEffect(() => {
    const handleEditModeChange = (event) => {
      const isEnabled = event.detail.enabled;
      setIsEditMode(isEnabled);
      queueMessage("SetMediaScreenEditMode", { 
        enabled: isEnabled, 
        showUploadIcon: isEnabled 
      });
    };

    window.addEventListener('editModeChanged', handleEditModeChange);
    return () => window.removeEventListener('editModeChanged', handleEditModeChange);
  }, [queueMessage, setIsEditMode]);

  // Unity-JavaScript bridge functions
  useEffect(() => {
    window.JsSendMediaScreenClick = (jsonData) => {
      try {
        const data = JSON.parse(jsonData);
        window.dispatchEvent(new CustomEvent('MediaScreenClick', {
          detail: JSON.stringify(data)
        }));
      } catch (error) {
        console.error("Error processing MediaScreenClick data:", error);
      }
    };
    
    window.handleMediaScreenClick = (mediaScreenId) => {
      processMediaScreenClick(mediaScreenId);
    };
    
    window.TestJavaScriptFromUnity = (message) => {
      console.log("Unity called JavaScript:", message);
    };
    
    return () => {
      delete window.JsSendMediaScreenClick;
      delete window.handleMediaScreenClick;
      delete window.TestJavaScriptFromUnity;
    };
  }, [processMediaScreenClick]);

  // Consolidated Unity event handling
  useEffect(() => {
    const handleRegisterMediaScreen = (event) => {
      try {
        const data = JSON.parse(event.detail);
        updateMediaScreen(data.mediaScreenId, { ...data, source: 'event' });
        
        if (isEditMode) {
          queueMessage("SetMediaScreenEditMode", { 
            mediaScreenId: data.mediaScreenId,
            enabled: true, 
            showUploadIcon: true 
          });
        }
        
        // Handle video display preference
        if (spaceID && data.mediaScreenId) {
          getMediaScreenImage(spaceID, data.mediaScreenId)
            .then(mediaScreen => {
              if (mediaScreen?.displayAsVideo && mediaScreen?.videoUrl) {
                queueMessage("SetMediaScreenImage", { 
                  mediaScreenId: data.mediaScreenId, 
                  imageUrl: null,
                  displayAsVideo: true 
                });
              }
            })
            .catch(error => console.error(`Error fetching media screen data:`, error));
        }
      } catch (error) {
        console.error('Error handling MediaScreen registration:', error);
      }
    };

    const handleMediaScreenClick = (event) => {
      try {
        let mediaScreenId;
        if (typeof event === 'string') {
          mediaScreenId = event;
        } else {
          const data = JSON.parse(event.detail);
          mediaScreenId = data.mediaScreenId;
        }
        processMediaScreenClick(mediaScreenId);
      } catch (error) {
        console.error('Error handling MediaScreen click:', error);
      }
    };

    const handleReactUnityEvent = (event) => {
      const { eventName, eventData } = event.detail || {};
      
      switch (eventName) {
        case 'RegisterMediaScreen':
          handleRegisterMediaScreen({ detail: eventData });
          break;
        case 'MediaScreenClick':
          handleMediaScreenClick({ detail: eventData });
          break;
        case 'SetMediaScreenImage':
          try {
            const data = JSON.parse(eventData);
            if (data.mediaScreenId) {
              updateMediaScreen(data.mediaScreenId, {
                imageUrl: data.imageUrl,
                hasImage: !!data.imageUrl,
                displayAsVideo: data.displayAsVideo || false,
                source: 'set-media-screen-image'
              });
            }
          } catch (error) {
            console.error('Error handling SetMediaScreenImage event:', error);
          }
          break;
      }
    };

    const events = [
      ['RegisterMediaScreen', handleRegisterMediaScreen],
      ['MediaScreenClick', handleMediaScreenClick],
      ['reactUnityEvent', handleReactUnityEvent]
    ];
    
    events.forEach(([event, handler]) => 
      window.addEventListener(event, handler)
    );
    
    return () => {
      events.forEach(([event, handler]) => 
        window.removeEventListener(event, handler)
      );
    };
  }, [isEditMode, queueMessage, spaceID, updateMediaScreen, processMediaScreenClick]);



  // Video modal management
  useEffect(() => {
    if (videoUrl) {
      onVideoModalOpen();
      trackReactEvent(ANALYTICS_EVENT_TYPES.REACT.VIDEO_CLICK, {
        mediaScreenId: currentVideoMediaScreenId,
        videoUrl,
        videoTitle,
        source: 'media_screen_controller',
        trigger: 'video_modal_open'
      });
    }
  }, [videoUrl, onVideoModalOpen, trackReactEvent, currentVideoMediaScreenId, videoTitle]);
  
  const handleVideoModalClose = useCallback(() => {
    resetVideoUrl();
    onVideoModalClose();
  }, [resetVideoUrl, onVideoModalClose]);

  // Direct Unity message listeners
  useEffect(() => {
    const handleRegisterMediaScreenDirect = (data) => {
      if (!data?.mediaScreenId) return;
      
      updateMediaScreen(data.mediaScreenId, { 
        ...data, 
        source: 'direct-event' 
      });
      
      if (isEditMode) {
        queueMessage("SetMediaScreenEditMode", { 
          mediaScreenId: data.mediaScreenId,
          enabled: true, 
          showUploadIcon: true 
        });
      }
    };

    const unsubscribeRegister = listenToUnityMessage("RegisterMediaScreen", handleRegisterMediaScreenDirect);
    const unsubscribeClick = listenToUnityMessage("MediaScreenClick", (data) => {
      if (data?.mediaScreenId) processMediaScreenClick(data.mediaScreenId);
    });
    
    return () => {
      unsubscribeRegister();
      unsubscribeClick();
    };
  }, [listenToUnityMessage, isEditMode, queueMessage, updateMediaScreen, processMediaScreenClick]);


  // Handle video screen clicks in edit mode
  useEffect(() => {
    if (isEditMode && currentVideoMediaScreenId) {
      setSelectedScreen(currentVideoMediaScreenId);
      onOpen();
      resetVideoUrl();
    }
  }, [isEditMode, currentVideoMediaScreenId, onOpen, resetVideoUrl, setSelectedScreen]);

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