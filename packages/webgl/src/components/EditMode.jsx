import React, { useState, useEffect } from "react";
import { Box, Switch, Text } from "@chakra-ui/react";
import PropTypes from "prop-types";
import { useListenForUnityEvent } from "../hooks/unityEvents/core/useListenForUnityEvent";
import SpacesVideoEditModal from "./SpacesVideoEditModal"; // Modal component for editing
import { useUnityOnPlayVideo } from "../hooks/unityEvents"; // Hook for video play logic

const EditMode = ({ gameObjectName, onToggleEditMode }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoUrl, resetVideoUrl] = useUnityOnPlayVideo(isEditMode); // Pass `isEditMode` to hook

  // Function to toggle the edit mode state
  const handleToggleChange = () => {
    const newEditMode = !isEditMode;
    setIsEditMode(newEditMode);
    onToggleEditMode(newEditMode); // Notify parent of edit mode change
  };

  // Listen to Unity messages for clicks on game objects
  const listenToUnityMessage = useListenForUnityEvent();

  useEffect(() => {
    const handleGameObjectClick = (data) => {
      if (data.gameObjectName === gameObjectName) {
        if (isEditMode) {
          // If edit mode is on, open the edit modal
          setIsModalOpen(true);
        } else {
          // If edit mode is off, play the video
          if (videoUrl) resetVideoUrl(); // Reset any existing video URL
        }
      }
    };

    // Listen for "GameObjectClicked" events
    const unsubscribe = listenToUnityMessage("GameObjectClicked", handleGameObjectClick);
    
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isEditMode, gameObjectName, videoUrl, resetVideoUrl, listenToUnityMessage]);

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <Box position="absolute" top={4} right={4} zIndex={1000}>
      <Text fontSize="sm" fontWeight="bold" mb={2}>
        Edit Mode
      </Text>
      <Switch
        size="lg"
        colorScheme="teal"
        isChecked={isEditMode}
        onChange={handleToggleChange}
      />

      {/* Conditionally render SpacesVideoEditModal if in edit mode */}
      {isModalOpen && (
        <SpacesVideoEditModal gameObjectName={gameObjectName} onClose={closeModal} />
      )}
    </Box>
  );
};

EditMode.propTypes = {
  gameObjectName: PropTypes.string.isRequired,
  onToggleEditMode: PropTypes.func.isRequired,
};

export default EditMode;
