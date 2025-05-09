import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  VStack,
  HStack,
  useToast
} from '@chakra-ui/react';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { updatePortal } from '@disruptive-spaces/shared/firebase/portalsFirestore';

// Debounce utility
function useDebouncedCallback(callback, delay, deps) {
  const handler = useRef();
  useEffect(() => {
    if (handler.current) clearTimeout(handler.current);
    handler.current = setTimeout(callback, delay);
    return () => clearTimeout(handler.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const PortalEditor = ({ isOpen, onClose, portal, spaceId, style }) => {
  if (!isOpen || !portal) return null;
  
  const [position, setPosition] = useState({ x: 0, y: 1.5, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
  const sendUnityEvent = useSendUnityEvent();
  const toast = useToast();

  // Update state when portal changes
  useEffect(() => {
    if (portal) {
      setPosition(portal.position || { x: 0, y: 1.5, z: 0 });
      setRotation(portal.rotation || { x: 0, y: 0, z: 0 });
      setScale(portal.scale || { x: 1, y: 1, z: 1 });
    }
  }, [portal]);

  // Send live update to Unity on any change
  useEffect(() => {
    sendUnityEvent('UpdatePortalTransform', {
      portalId: portal.portalId,
      position,
      rotation,
      scale
    });
  }, [position, rotation, scale, portal.portalId, sendUnityEvent]);

  // Debounced save to Firebase on any change
  useDebouncedCallback(() => {
    const updatedPortalData = {
      ...portal,
      position,
      rotation,
      scale
    };
    updatePortal(spaceId, portal.portalId, updatedPortalData);
  }, 300, [position, rotation, scale, spaceId, portal.portalId]);

  const handleDelete = async () => {
    try {
      sendUnityEvent('DeletePortal', {
        portalId: portal.portalId
      });
      const success = await updatePortal(spaceId, portal.portalId, null);
      if (success) {
        toast({
          title: "Portal Deleted",
          description: "The portal has been removed.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onClose();
      } else {
        throw new Error("Failed to delete portal from Firebase");
      }
    } catch (error) {
      toast({
        title: "Delete Error",
        description: "Failed to delete portal. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      position="absolute"
      top="72px" // adjust as needed to sit below ProfileButton
      right="24px"
      zIndex={2000}
      minW="340px"
      maxW="360px"
      bg="rgba(255,255,255,0.15)"
      boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.18)"
      borderRadius="2xl"
      p={6}
      border="1px solid rgba(255,255,255,0.2)"
      style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', ...style }}
      color="gray.900"
    >
      <Box fontWeight="bold" fontSize="lg" mb={2}>Edit Portal</Box>
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel>Position</FormLabel>
          <HStack>
            <NumberInput value={position.x} onChange={(_, value) => setPosition(prev => ({ ...prev, x: value }))} step={0.1} precision={2}>
              <NumberInputField placeholder="X" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
            <NumberInput value={position.y} onChange={(_, value) => setPosition(prev => ({ ...prev, y: value }))} step={0.1} precision={2}>
              <NumberInputField placeholder="Y" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
            <NumberInput value={position.z} onChange={(_, value) => setPosition(prev => ({ ...prev, z: value }))} step={0.1} precision={2}>
              <NumberInputField placeholder="Z" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
          </HStack>
        </FormControl>
        <FormControl>
          <FormLabel>Rotation</FormLabel>
          <HStack>
            <NumberInput value={rotation.x} onChange={(_, value) => setRotation(prev => ({ ...prev, x: value }))} step={1}>
              <NumberInputField placeholder="X" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
            <NumberInput value={rotation.y} onChange={(_, value) => setRotation(prev => ({ ...prev, y: value }))} step={1}>
              <NumberInputField placeholder="Y" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
            <NumberInput value={rotation.z} onChange={(_, value) => setRotation(prev => ({ ...prev, z: value }))} step={1}>
              <NumberInputField placeholder="Z" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
          </HStack>
        </FormControl>
        <FormControl>
          <FormLabel>Scale</FormLabel>
          <HStack>
            <NumberInput value={scale.x} onChange={(_, value) => setScale(prev => ({ ...prev, x: value }))} step={0.1} precision={2} min={0.1}>
              <NumberInputField placeholder="X" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
            <NumberInput value={scale.y} onChange={(_, value) => setScale(prev => ({ ...prev, y: value }))} step={0.1} precision={2} min={0.1}>
              <NumberInputField placeholder="Y" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
            <NumberInput value={scale.z} onChange={(_, value) => setScale(prev => ({ ...prev, z: value }))} step={0.1} precision={2} min={0.1}>
              <NumberInputField placeholder="Z" />
              <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
            </NumberInput>
          </HStack>
        </FormControl>
        <HStack spacing={4} width="100%" justify="flex-end">
          <Button colorScheme="red" onClick={handleDelete} variant="outline">
            Delete Portal
          </Button>
        </HStack>
        <Button mt={2} variant="ghost" colorScheme="whiteAlpha" onClick={onClose}>
          Close
        </Button>
      </VStack>
    </Box>
  );
};

export default PortalEditor; 