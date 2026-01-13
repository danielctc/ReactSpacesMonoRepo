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
  Input,
  Select,
  Switch,
  useToast
} from '@chakra-ui/react';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
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

const VideoCanvasEditor = ({ isOpen, onClose, item, spaceId, style }) => {
  if (!isOpen || !item) return null;

  // Transform state
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState({ x: 1, y: 1, z: 1 });

  // Video-specific state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState('youtube');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(true);

  const sendUnityEvent = useSendUnityEvent();
  const toast = useToast();

  // Update state when item changes
  useEffect(() => {
    if (item) {
      setPosition(item.position || { x: 0, y: 0, z: 0 });
      setRotation(item.rotation || { x: 0, y: 0, z: 0 });
      setScale(item.scale || { x: 1, y: 1, z: 1 });
      setVideoUrl(item.videoUrl || '');
      setVideoType(item.videoType || 'youtube');
      setAspectRatio(item.aspectRatio || '16:9');
      setAutoplay(item.autoplay || false);
      setLoop(item.loop || false);
      setMuted(item.muted !== undefined ? item.muted : true);
    }
  }, [item]);

  // Send live update to Unity on transform change
  useEffect(() => {
    sendUnityEvent('UpdateVideoCanvas', {
      canvasId: item.canvasId,
      position,
      rotation,
      scale,
      videoUrl,
      videoType,
      aspectRatio,
      autoplay,
      loop,
      muted
    });
  }, [position, rotation, scale, videoUrl, videoType, aspectRatio, autoplay, loop, muted, item.canvasId, sendUnityEvent]);

  // Debounced save to Firebase on any change
  useDebouncedCallback(() => {
    const itemRef = doc(db, 'spaces', spaceId, 'catalogue', item.canvasId);
    updateDoc(itemRef, {
      position,
      rotation,
      scale,
      videoUrl,
      videoType,
      aspectRatio,
      autoplay,
      loop,
      muted,
      updatedAt: Date.now()
    });
  }, 300, [position, rotation, scale, videoUrl, videoType, aspectRatio, autoplay, loop, muted, spaceId, item.canvasId]);

  const handleDelete = async () => {
    try {
      sendUnityEvent('DeleteVideoCanvas', {
        canvasId: item.canvasId
      });
      const itemRef = doc(db, 'spaces', spaceId, 'catalogue', item.canvasId);
      await deleteDoc(itemRef);

      toast({
        title: "Video Canvas Deleted",
        description: "The video canvas has been removed.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Delete Error",
        description: "Failed to delete video canvas. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Auto-detect video type from URL
  const detectVideoType = (url) => {
    if (!url) return 'direct';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('.m3u8')) return 'hls';
    return 'direct';
  };

  const handleVideoUrlChange = (e) => {
    const url = e.target.value;
    setVideoUrl(url);
    setVideoType(detectVideoType(url));
  };

  return (
    <Box
      position="absolute"
      top="72px"
      right="24px"
      zIndex={2000}
      minW="360px"
      maxW="400px"
      bg="rgba(255,255,255,0.15)"
      boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.18)"
      borderRadius="2xl"
      p={6}
      border="1px solid rgba(255,255,255,0.2)"
      style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', ...style }}
      color="gray.900"
    >
      <Box fontWeight="bold" fontSize="lg" mb={4}>Edit Video Canvas</Box>
      <VStack spacing={4} align="stretch">
        {/* Video URL */}
        <FormControl>
          <FormLabel>Video URL</FormLabel>
          <Input
            value={videoUrl}
            onChange={handleVideoUrlChange}
            placeholder="YouTube, Vimeo, or direct video URL"
            bg="white"
            size="sm"
          />
        </FormControl>

        {/* Video Type and Aspect Ratio */}
        <HStack spacing={4}>
          <FormControl>
            <FormLabel>Type</FormLabel>
            <Select value={videoType} onChange={(e) => setVideoType(e.target.value)} bg="white" size="sm">
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="direct">Direct</option>
              <option value="hls">HLS Stream</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Aspect Ratio</FormLabel>
            <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} bg="white" size="sm">
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
              <option value="9:16">9:16 (Vertical)</option>
            </Select>
          </FormControl>
        </HStack>

        {/* Playback Options */}
        <HStack spacing={6}>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0" fontSize="sm">Autoplay</FormLabel>
            <Switch isChecked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0" fontSize="sm">Loop</FormLabel>
            <Switch isChecked={loop} onChange={(e) => setLoop(e.target.checked)} />
          </FormControl>
          <FormControl display="flex" alignItems="center">
            <FormLabel mb="0" fontSize="sm">Muted</FormLabel>
            <Switch isChecked={muted} onChange={(e) => setMuted(e.target.checked)} />
          </FormControl>
        </HStack>

        {/* Position */}
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

        {/* Rotation */}
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

        {/* Scale */}
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

        {/* Actions */}
        <HStack spacing={4} width="100%" justify="flex-end">
          <Button colorScheme="red" onClick={handleDelete} variant="outline" size="sm">
            Delete Canvas
          </Button>
        </HStack>
        <Button mt={2} variant="ghost" colorScheme="whiteAlpha" onClick={onClose}>
          Close
        </Button>
      </VStack>
    </Box>
  );
};

export default VideoCanvasEditor;
