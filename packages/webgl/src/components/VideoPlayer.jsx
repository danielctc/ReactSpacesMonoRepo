import React, { useEffect } from "react";
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

  useEffect(() => {
    Logger.log("VideoPlayer: Current video URL:", currentVideoUrl);
    if (currentVideoUrl) {
      Logger.log("VideoPlayer: Opening modal for video URL:", currentVideoUrl);
      onOpen();
    }
  }, [currentVideoUrl, onOpen]);

  const handleClose = () => {
    Logger.log("VideoPlayer: Closing modal");
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
