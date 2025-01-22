import React, { useState, useEffect } from 'react';
import { Box, Button, Modal, ModalOverlay, ModalContent, ModalBody, useDisclosure } from "@chakra-ui/react";
import { useUnityOnPlayVideo } from "../hooks/unityEvents";
import SpacesVideoEditModal from "./SpacesVideoEditModal";
import { useSendUnityEvent } from "../hooks/unityEvents/core/useSendUnityEvent"; // Send event to Unity
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const TestModalTrigger = ({ gameObjectName }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [videoUrl, resetVideoUrl] = useUnityOnPlayVideo(isEditMode); // Fetch video URL based on mode
  const sendUnityEvent = useSendUnityEvent(); // Get the function to send events to Unity
  const { isOpen, onOpen, onClose } = useDisclosure(); // For quick test modal

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // Open the appropriate modal based on mode
  const handleOpenModal = () => {
    if (isEditMode) {
      setIsEditModalOpen(true); // Open edit modal if in edit mode
    } else {
      Logger.log("TestModalTrigger: Sending PlayVideo event to Unity for", gameObjectName);
      sendUnityEvent("PlayVideo", { gameObjectName }); // Send the PlayVideo event
      if (videoUrl) {
        onOpen(); // Open the test modal if video URL exists
      }
    }
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  // Effect to open modal if videoUrl is received
  useEffect(() => {
    if (videoUrl) {
      Logger.log("TestModalTrigger: Video URL received:", videoUrl);
      onOpen();
    }
  }, [videoUrl, onOpen]);

  return (
    <Box position="absolute" top={4} right={4} zIndex={1000}>
      <Button onClick={toggleEditMode} colorScheme={isEditMode ? "teal" : "blue"} mb={4}>
        {isEditMode ? "Switch to Play Mode" : "Switch to Edit Mode"}
      </Button>

      <Button onClick={handleOpenModal} colorScheme="purple">
        Open Modal for TV2
      </Button>

      {/* Conditionally render SpacesVideoEditModal if in edit mode */}
      {isEditModalOpen && (
        <SpacesVideoEditModal gameObjectName={gameObjectName} onClose={handleCloseEditModal} />
      )}

      {/* Quick test modal for displaying video */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent bg="gray.900" color="white" borderRadius="lg" overflow="hidden">
          <ModalBody p={0}>
            {videoUrl && (
              <Box style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={videoUrl}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title="Test Video Player"
                ></iframe>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TestModalTrigger;
