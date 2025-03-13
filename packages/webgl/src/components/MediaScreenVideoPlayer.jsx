import React, { useEffect } from 'react';
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

// Define iframe styles similar to VideoPlayer.jsx
const iframeStyles = {
  iframeContainer: {
    position: "relative",
    paddingBottom: "56.25%", // 16:9 aspect ratio
    height: 0,
    overflow: "hidden",
    width: "100%",
  },
  iframe: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: "none",
  },
};

const MediaScreenVideoPlayer = ({ videoUrl, videoTitle, mediaScreenId, isOpen, onClose }) => {
  const { fullscreenRef } = useFullscreenContext();
  const modalContentRef = React.useRef(null);
  
  // Use the Unity input manager hook to disable Unity input when modal is open
  // We're using a more targeted approach by passing the modal ID
  useUnityInputManager(isOpen, `video-modal-${mediaScreenId}`);
  
  // Focus the modal content when it opens
  useEffect(() => {
    if (isOpen && modalContentRef.current) {
      // Focus the modal content after a short delay to ensure it's rendered
      const timeoutId = setTimeout(() => {
        modalContentRef.current.focus();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (isOpen && videoUrl) {
      Logger.log(`MediaScreenVideoPlayer: Opening video player for URL: ${videoUrl}`);
    }
  }, [isOpen, videoUrl]);
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="lg" 
      isCentered
      portalProps={{ containerRef: fullscreenRef }}
      returnFocusOnClose={false}
      id={`video-modal-${mediaScreenId}`}
    >
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
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
        tabIndex={-1}
        className="video-modal-content"
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
          {!videoUrl ? (
            <Flex direction="column" align="center" justify="center" h="400px">
              <Spinner size="xl" mb={4} />
              <Text>Unable to load video</Text>
              <Text fontSize="sm" color="gray.400" mt={2}>
                No video URL provided
              </Text>
            </Flex>
          ) : (
            <Box style={iframeStyles.iframeContainer}>
              <iframe
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
  );
};

export default MediaScreenVideoPlayer; 