import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalCloseButton,
  ModalContent,
  ModalBody,
  Box,
  Text,
  Flex,
  Spinner
} from '@chakra-ui/react';
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnityInputManager } from '../hooks/useUnityInputManager';

// Define iframe styles
const iframeStyles = {
  iframeContainer: {
    position: "relative",
    paddingBottom: "56.25%", // 16:9 aspect ratio
    height: 0,
    overflow: "hidden",
    width: "100%",
    pointerEvents: "auto !important", // Ensure pointer events work
  },
  iframe: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: "none",
    pointerEvents: "auto !important", // Ensure pointer events work
    zIndex: 10000, // High z-index to ensure it's on top
  },
};

// Simple CSS to disable Unity input when modal is open
const VideoModalStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
        /* Disable pointer events on Unity elements when modal is open */
        body.unity-input-disabled #unity-container,
        body.unity-input-disabled #unity-canvas {
          pointer-events: none !important;
        }
        
        /* Make sure the modal is above Unity */
        .chakra-modal__overlay {
          z-index: 1001 !important;
          pointer-events: auto !important;
        }
        
        .chakra-modal__content {
          z-index: 1002 !important;
          pointer-events: auto !important;
        }
        
        /* Make sure the iframe is visible and interactive */
        .video-iframe {
          z-index: 1003 !important;
          pointer-events: auto !important;
        }
        
        /* Make sure the close button is accessible */
        .chakra-modal__close-btn {
          z-index: 1004 !important;
        }
        
        /* Ensure the iframe container allows clicks */
        .iframe-container {
          pointer-events: auto !important;
        }
        
        /* Remove the full-screen blocker */
      `
    }}
  />
);

const MediaScreenVideoPlayer = ({ videoUrl, videoTitle, mediaScreenId, isOpen, onClose }) => {
  const { fullscreenRef } = useFullscreenContext();
  
  // Use the Unity input manager hook to disable Unity input when modal is open
  useUnityInputManager(isOpen, `video-modal-${mediaScreenId}`);
  
  // Add event listeners to capture mouse events at the modal level
  useEffect(() => {
    if (isOpen) {
      // Create a function to block all mouse events
      const blockAllMouseEvents = (e) => {
        // Only block events on the overlay, not on the modal content
        // Check if the event target is the overlay itself
        const isOverlay = e.target.classList && 
                          e.target.classList.contains('chakra-modal__overlay');
        
        // If it's the overlay, block the event
        if (isOverlay) {
          e.stopPropagation();
          e.preventDefault();
        }
      };
      
      // Add global event listeners
      document.addEventListener('mousemove', blockAllMouseEvents, true);
      document.addEventListener('mousedown', blockAllMouseEvents, true);
      document.addEventListener('mouseup', blockAllMouseEvents, true);
      document.addEventListener('click', blockAllMouseEvents, true);
      document.addEventListener('wheel', blockAllMouseEvents, true);
      
      // Find the Unity canvas element and disable pointer events
      const unityCanvas = document.getElementById('unity-canvas');
      const unityContainer = document.getElementById('unity-container');
      
      if (unityCanvas) {
        unityCanvas.style.pointerEvents = 'none';
      }
      
      if (unityContainer) {
        unityContainer.style.pointerEvents = 'none';
      }
      
      // Add a class to the body to indicate that Unity input is disabled
      document.body.classList.add('unity-input-disabled');
      
      // Directly disable Unity input if available
      if (window.unityInstance) {
        try {
          window.unityInstance.SendMessage('WebGLInputManager', 'Disable');
          window.unityInstance.SendMessage('CameraController', 'DisableInput', 'VideoModal');
        } catch (e) {
          console.error('Error disabling Unity input:', e);
        }
      }
      
      // Clean up event listeners
      return () => {
        document.removeEventListener('mousemove', blockAllMouseEvents, true);
        document.removeEventListener('mousedown', blockAllMouseEvents, true);
        document.removeEventListener('mouseup', blockAllMouseEvents, true);
        document.removeEventListener('click', blockAllMouseEvents, true);
        document.removeEventListener('wheel', blockAllMouseEvents, true);
        
        // Re-enable pointer events on the Unity canvas
        if (unityCanvas) {
          unityCanvas.style.pointerEvents = 'auto';
        }
        
        if (unityContainer) {
          unityContainer.style.pointerEvents = 'auto';
        }
        
        // Remove the class from the body
        document.body.classList.remove('unity-input-disabled');
        
        // Re-enable Unity input
        if (window.unityInstance) {
          try {
            window.unityInstance.SendMessage('WebGLInputManager', 'Enable');
            window.unityInstance.SendMessage('CameraController', 'EnableInput', 'VideoModal');
          } catch (e) {
            console.error('Error re-enabling Unity input:', e);
          }
        }
      };
    }
  }, [isOpen]);
  
  return (
    <>
      <VideoModalStyles />
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="xl" 
        isCentered
        portalProps={{ containerRef: fullscreenRef }}
        closeOnOverlayClick={true}
        closeOnEsc={true}
        id={`video-modal-${mediaScreenId}`}
      >
        <ModalOverlay 
          bg="rgba(0, 0, 0, 0.8)" 
          onClick={(e) => {
            // Only close if clicking directly on the overlay
            if (e.target === e.currentTarget) {
              onClose();
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          onMouseMove={(e) => {
            // Only block if it's directly on the overlay
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          onMouseDown={(e) => {
            // Only block if it's directly on the overlay
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          onMouseUp={(e) => {
            // Only block if it's directly on the overlay
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          onWheel={(e) => {
            // Only block if it's directly on the overlay
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          style={{ pointerEvents: 'auto' }}
        />
        <ModalContent
          bg="gray.900"
          color="white"
          borderRadius="lg"
          overflow="hidden"
          maxWidth="80vw"
          maxHeight="80vh"
          className="video-modal-content"
        >
          <ModalCloseButton 
            size="lg"
            bg="gray.700"
            color="white"
            borderRadius="full"
            zIndex="10004"
            _hover={{ bg: "gray.600" }}
            position="absolute"
            top="10px"
            right="10px"
          />
          <ModalBody 
            p={0} 
            width="100%"
          >
            {!videoUrl ? (
              <Flex direction="column" align="center" justify="center" h="400px">
                <Spinner size="xl" mb={4} />
                <Text>Unable to load video</Text>
                <Text fontSize="sm" color="gray.400" mt={2}>
                  No video URL provided
                </Text>
              </Flex>
            ) : (
              <Box 
                className="iframe-container" 
                style={iframeStyles.iframeContainer}
              >
                <iframe
                  className="video-iframe"
                  src={videoUrl}
                  style={iframeStyles.iframe}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title={videoTitle || "Video Player"}
                ></iframe>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default MediaScreenVideoPlayer; 