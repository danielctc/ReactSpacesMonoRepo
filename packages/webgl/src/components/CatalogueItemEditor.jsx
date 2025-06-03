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
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

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

const CatalogueItemEditor = ({ isOpen, onClose, item, spaceId, style }) => {
  if (!isOpen || !item) return null;
  
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });
  const sendUnityEvent = useSendUnityEvent();
  const toast = useToast();

  // Update state when item changes
  useEffect(() => {
    if (item) {
      setPosition(item.position || { x: 0, y: 0, z: 0 });
      setRotation(item.rotation || { x: 0, y: 0, z: 0 });
      setScale(item.scale || { x: 1, y: 1, z: 1 });
    }
  }, [item]);

  // Send live update to Unity on any change
  useEffect(() => {
    sendUnityEvent('UpdateCatalogueItem', {
      hotspotId: item.hotspotId,
      position,
      rotation,
      scale
    });
  }, [position, rotation, scale, item.hotspotId, sendUnityEvent]);

  // Debounced save to Firebase on any change
  useDebouncedCallback(() => {
    const itemRef = doc(db, 'spaces', spaceId, 'catalogue', item.hotspotId);
    updateDoc(itemRef, {
      position,
      rotation,
      scale,
      updatedAt: Date.now()
    });
  }, 300, [position, rotation, scale, spaceId, item.hotspotId]);

  const handleDelete = async () => {
    try {
      sendUnityEvent('DeleteCatalogueItem', {
        hotspotId: item.hotspotId
      });
      const itemRef = doc(db, 'spaces', spaceId, 'catalogue', item.hotspotId);
      await updateDoc(itemRef, { deleted: true });
      
      toast({
        title: "Item Deleted",
        description: "The item has been removed.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Delete Error",
        description: "Failed to delete item. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      position="absolute"
      top="72px"
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
      <Box fontWeight="bold" fontSize="lg" mb={2}>Edit Catalogue Item</Box>
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
            Delete Item
          </Button>
        </HStack>
        <Button mt={2} variant="ghost" colorScheme="whiteAlpha" onClick={onClose}>
          Close
        </Button>
      </VStack>
    </Box>
  );
};

export default CatalogueItemEditor; 