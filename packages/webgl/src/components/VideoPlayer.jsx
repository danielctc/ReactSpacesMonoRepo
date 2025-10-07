import React, { useEffect, useContext } from "react";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import {
  Modal,
  ModalOverlay,
  ModalCloseButton,
  ModalContent,
  ModalBody,
  useDisclosure,
  Box,
  Portal
} from "@chakra-ui/react";
import { useUnityOnPlayVideo } from "../hooks/unityEvents";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from '../providers/UnityProvider';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

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

function VideoPlayer() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { fullscreenRef } = useFullscreenContext();
  const [currentVideoUrl, resetVideoUrl] = useUnityOnPlayVideo(false); // Ensure edit mode is off for play
  const { user } = useContext(UserContext);
  const { spaceID } = useUnity();
  
  // Analytics tracking
  const { trackReactEvent, isReady } = useAnalytics(spaceID, {
    enableDebugLogs: true
  });

  useEffect(() => {
    Logger.log("VideoPlayer: Current video URL:", currentVideoUrl);
    if (currentVideoUrl) {
      Logger.log("VideoPlayer: Opening modal for video URL:", currentVideoUrl);
      onOpen();
      
      // Track video click event when modal opens
      if (isReady && user) {
        trackReactEvent(ANALYTICS_EVENT_TYPES.REACT.VIDEO_CLICK, {
          category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
          action: 'video_player_open',
          videoUrl: currentVideoUrl,
          context: 'video_player_modal',
          spaceId: spaceID,
          timestamp: new Date().toISOString()
        });
        
        Logger.log("🎯 Analytics: Video click event tracked for modal open:", currentVideoUrl);
      }
    }
  }, [currentVideoUrl, onOpen, trackReactEvent, isReady, user, spaceID]);

  const handleClose = () => {
    Logger.log("VideoPlayer: Closing modal");
    
    // Track video close event
    if (isReady && user && currentVideoUrl) {
      trackReactEvent(ANALYTICS_EVENT_TYPES.REACT.VIDEO_CLOSE, {
        category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
        action: 'video_player_close',
        videoUrl: currentVideoUrl,
        context: 'video_player_modal',
        spaceId: spaceID,
        timestamp: new Date().toISOString()
      });
      
      Logger.log("🎯 Analytics: Video close event tracked for modal close:", currentVideoUrl);
    }
    
    resetVideoUrl();
    onClose();
  };

  return (
    <Portal containerRef={fullscreenRef}>
      <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        size="lg" 
        isCentered
        portalProps={{ containerRef: fullscreenRef }}
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
          zIndex="modal"
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
            {currentVideoUrl && (
              <Box style={iframeStyles.iframeContainer}>
                <iframe
                  src={currentVideoUrl}
                  style={iframeStyles.iframe}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title="Video Player"
                ></iframe>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Portal>
  );
}

export default VideoPlayer;
