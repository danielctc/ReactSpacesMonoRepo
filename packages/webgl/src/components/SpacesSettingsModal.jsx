import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Box,
  Portal,
  FormControl,
  FormLabel,
  Select,
  Text,
  Progress,
  VStack,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  Badge,
  Alert,
  AlertIcon,
  Button,
  Divider
} from "@chakra-ui/react";
import AgoraRTC from 'agora-rtc-sdk-ng';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';

// Voice Chat Settings Modal Component
const VoiceChatSettingsModal = ({ isOpen, onClose, containerRef }) => {
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [microphoneVolume, setMicrophoneVolume] = useState(100);
  const [speakerVolume, setSpeakerVolume] = useState(100);
  const [isEchoEnabled, setIsEchoEnabled] = useState(true);
  const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [mediaStream, setMediaStream] = useState(null);
  
  // Fetch available audio devices
  useEffect(() => {
    if (!isOpen) return; // Only run when modal is actually open
    
    const getDevices = async () => {
      try {
        // Get permission to access media devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get list of audio input devices
        const devices = await AgoraRTC.getMicrophones();
        setAudioDevices(devices);
        
        // Set the first device as selected if available
        if (devices.length > 0) {
          setSelectedMicrophoneId(devices[0].deviceId);
        }
      } catch (error) {
        console.error('Error getting audio devices:', error);
      }
    };
    
    getDevices();
  }, [isOpen]);
  
  // Real-time audio level monitoring
  useEffect(() => {
    if (!isOpen || !micEnabled) {
      setVolumeLevel(0);
      return;
    }

    let animationFrame;
    
    const setupAudioAnalysis = async () => {
      try {
        // Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            deviceId: selectedMicrophoneId ? { exact: selectedMicrophoneId } : undefined 
          } 
        });
        setMediaStream(stream);

        // Create audio context and analyser
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const analyserNode = context.createAnalyser();
        const source = context.createMediaStreamSource(stream);
        
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.8;
        source.connect(analyserNode);
        
        setAudioContext(context);
        setAnalyser(analyserNode);

        // Start monitoring audio levels
        const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
        
        const updateLevel = () => {
          analyserNode.getByteFrequencyData(dataArray);
          
          // Calculate RMS (Root Mean Square) for better sensitivity
          const rms = Math.sqrt(dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length);
          
          // Amplify the signal and apply microphone volume multiplier
          // Using a logarithmic scale for more natural audio level representation
          const amplified = Math.min(rms * 3, 255); // 3x amplification
          const normalizedLevel = (amplified / 255) * 100 * (microphoneVolume / 100);
          
          setVolumeLevel(Math.min(normalizedLevel, 100));
          
          if (micEnabled && isOpen) {
            animationFrame = requestAnimationFrame(updateLevel);
          }
        };
        
        updateLevel();
        
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
        setVolumeLevel(0);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
      }
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
      }
      setAnalyser(null);
      setVolumeLevel(0);
    };
  }, [micEnabled, isOpen, selectedMicrophoneId, microphoneVolume]);
  
  // Handle microphone device change
  const handleMicrophoneChange = (e) => {
    const deviceId = e.target.value;
    setSelectedMicrophoneId(deviceId);
    console.log('Microphone changed to:', deviceId);
  };
  
  // Handle microphone volume change
  const handleMicrophoneVolumeChange = (value) => {
    setMicrophoneVolume(value);
    console.log('Microphone volume set to:', value);
  };
  
  // Handle speaker volume change
  const handleSpeakerVolumeChange = (value) => {
    setSpeakerVolume(value);
    console.log('Speaker volume set to:', value);
  };
  
  // Toggle microphone
  const toggleMicrophone = () => {
    setMicEnabled(!micEnabled);
  };
  
  return (
    <Portal containerRef={containerRef}>
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(8px)" />
        <ModalContent bg="#1a1a1a" color="white" borderRadius="xl" border="1px solid #333" maxW="500px">
          <ModalHeader fontSize="md" fontWeight="600" pb={1} pt={3} px={4} color="white">
            Voice Chat Settings
          </ModalHeader>
          <ModalCloseButton
            color="white"
            bg="rgba(255,255,255,0.1)"
            _hover={{ color: "gray.400", bg: "transparent" }}
            borderRadius="full"
            size="sm"
            top={2}
            right={3}
          />
          <ModalBody px={4} py={3}>
            <VStack spacing={4} align="stretch">
              {/* Microphone selection */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="500" color="white" mb={2}>
                  Microphone 
                  <Badge ml={2} bg={micEnabled ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"} color={micEnabled ? "#22c55e" : "#ef4444"} fontSize="xs" px={2} py={1} borderRadius="full">
                    {micEnabled ? "Enabled" : "Muted"}
                  </Badge>
                </FormLabel>
                <Select 
                  value={selectedMicrophoneId} 
                  onChange={handleMicrophoneChange}
                  bg="rgba(255,255,255,0.05)"
                  borderColor="rgba(255,255,255,0.15)"
                  _hover={{ borderColor: "rgba(255,255,255,0.3)" }}
                  _focus={{ borderColor: "rgba(255,255,255,0.5)", boxShadow: "0 0 0 1px rgba(255,255,255,0.3)" }}
                  borderRadius="lg"
                  size="sm"
                  fontSize="xs"
                >
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId} style={{ backgroundColor: '#1a1a1a', color: 'white' }}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                  {audioDevices.length === 0 && (
                    <option value="" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>No microphones found</option>
                  )}
                </Select>
              </FormControl>
              
              {/* Microphone volume level indicator */}
              <Box>
                <Text fontSize="sm" fontWeight="500" color="white" mb={2}>Microphone Level</Text>
                <Progress 
                  value={volumeLevel} 
                  colorScheme="green" 
                  size="sm" 
                  borderRadius="full"
                  bg="rgba(255,255,255,0.1)"
                  hasStripe={volumeLevel > 20}
                  isAnimated={volumeLevel > 20}
                  sx={{
                    '& > div': {
                      backgroundColor: '#22c55e !important'
                    }
                  }}
                />
              </Box>
              
              {/* Microphone volume control */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="500" color="white" mb={2}>Microphone Volume: {microphoneVolume}%</FormLabel>
                <Slider 
                  value={microphoneVolume} 
                  onChange={handleMicrophoneVolumeChange}
                  min={0}
                  max={100}
                  step={1}
                  colorScheme="gray"
                >
                  <SliderTrack bg="rgba(255,255,255,0.1)" h="6px" borderRadius="full">
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={4} />
                </Slider>
              </FormControl>
              
              {/* Speaker volume control */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="500" color="white" mb={2}>Speaker Volume: {speakerVolume}%</FormLabel>
                <Slider 
                  value={speakerVolume} 
                  onChange={handleSpeakerVolumeChange}
                  min={0}
                  max={100}
                  step={1}
                  colorScheme="gray"
                >
                  <SliderTrack bg="rgba(255,255,255,0.1)" h="6px" borderRadius="full">
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={4} />
                </Slider>
              </FormControl>
              
              {/* Mute/Unmute toggle */}
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb="0" fontSize="sm" fontWeight="500" color="white">Microphone Enabled</FormLabel>
                <Switch 
                  isChecked={micEnabled} 
                  onChange={toggleMicrophone}
                  colorScheme="gray"
                  size="md"
                />
              </FormControl>
              
              {/* Echo cancellation toggle */}
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb="0" fontSize="sm" fontWeight="500" color="white">Echo Cancellation</FormLabel>
                <Switch 
                  isChecked={isEchoEnabled} 
                  onChange={() => setIsEchoEnabled(!isEchoEnabled)}
                  colorScheme="gray"
                  size="md"
                />
              </FormControl>
              
              {/* Noise suppression toggle */}
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel mb="0" fontSize="sm" fontWeight="500" color="white">Noise Suppression</FormLabel>
                <Switch 
                  isChecked={isNoiseSuppressionEnabled} 
                  onChange={() => setIsNoiseSuppressionEnabled(!isNoiseSuppressionEnabled)}
                  colorScheme="gray"
                  size="md"
                />
              </FormControl>
              
              <Box 
                mt={2} 
                p={3} 
                bg="rgba(255,255,255,0.05)" 
                borderRadius="lg" 
                border="1px solid rgba(255,255,255,0.1)"
              >
                <Text fontSize="xs" color="gray.400">
                  Note: These settings will be applied when you join a voice chat.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Portal>
  );
};

function SpacesSettingsModal({ open, onClose, containerRef }) {
  const [isVoiceChatSettingsOpen, setIsVoiceChatSettingsOpen] = useState(false);
  const [masterVolume, setMasterVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(100);
  const [sfxVolume, setSfxVolume] = useState(100);
  
  const sendUnityEvent = useSendUnityEvent();

  const openVoiceChatSettings = () => {
    setIsVoiceChatSettingsOpen(true);
  };

  const closeVoiceChatSettings = () => {
    setIsVoiceChatSettingsOpen(false);
  };

  // Handle master volume change
  const handleMasterVolumeChange = (value) => {
    setMasterVolume(value);
    sendUnityEvent("SetMasterVolume", { volume: value / 100 }); // Send 0-1 range to Unity
  };

  // Handle music volume change
  const handleMusicVolumeChange = (value) => {
    setMusicVolume(value);
    sendUnityEvent("SetMusicVolume", { volume: value / 100 }); // Send 0-1 range to Unity
  };

  // Handle SFX volume change
  const handleSfxVolumeChange = (value) => {
    setSfxVolume(value);
    sendUnityEvent("SetSFXVolume", { volume: value / 100 }); // Send 0-1 range to Unity
  };

  if (!open) return null;

  return (
    <>
      {/* Blur Overlay for the rest of the screen */}
      <Portal containerRef={containerRef}>
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          backdropFilter="blur(2px)"
          bg="rgba(0, 0, 0, 0.3)"
          zIndex="999"
          opacity={open ? 1 : 0}
          visibility={open ? "visible" : "hidden"}
          transition="opacity 0.3s ease-in-out, visibility 0.3s ease-in-out"
          pointerEvents={open ? "auto" : "none"}
          onClick={onClose}
        />
      </Portal>
      
      {/* Settings Side Panel */}
      <Portal containerRef={containerRef}>
        <Box
          position="absolute"
          top="0"
          right="0"
          bottom="0"
          width="35%"
          minWidth="600px"
          bg="rgba(26, 32, 44, 0.95)"
          backdropFilter="blur(10px)"
          borderLeft="1px solid rgba(255, 255, 255, 0.1)"
          zIndex="1000"
          color="white"
          overflowY="auto"
          transform={open ? "translateX(0)" : "translateX(100%)"}
          transition="transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          maxHeight="100vh"
        >
          {/* Header */}
          <Box
            p={4}
            borderBottom="1px solid rgba(255, 255, 255, 0.1)"
            position="sticky"
            top="0"
            bg="rgba(26, 32, 44, 0.95)"
            backdropFilter="blur(10px)"
            zIndex="1001"
          >
            <HStack justify="space-between" align="center">
              <Text fontSize="xl" fontWeight="bold">Settings</Text>
              <Button
                variant="ghost"
                size="xs"
                onClick={onClose}
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                aria-label="Close settings"
                minW="auto"
                h="auto"
                p={1}
              >
                ✕
              </Button>
            </HStack>
          </Box>

          {/* Content */}
          <Box p={4}>
            {/* Tab structure for different settings */}
            <Tabs variant="unstyled" colorScheme="blue">
              <TabList mb={4} bg="rgba(255, 255, 255, 0.1)" borderRadius="md" p={0.5}>
                <Tab 
                  _selected={{ 
                    bg: "blue.500", 
                    color: "white",
                    borderRadius: "sm"
                  }}
                  color="whiteAlpha.700"
                  _hover={{ color: "white" }}
                  flex="1"
                  fontWeight="medium"
                  fontSize="sm"
                  py={2}
                  px={3}
                >
                  Audio & Video
                </Tab>
                <Tab 
                  _selected={{ 
                    bg: "blue.500", 
                    color: "white",
                    borderRadius: "sm"
                  }}
                  color="whiteAlpha.700"
                  _hover={{ color: "white" }}
                  flex="1"
                  fontWeight="medium"
                  fontSize="sm"
                  py={2}
                  px={3}
                >
                  Graphics
                </Tab>
              </TabList>
              
              <TabPanels>
                <TabPanel p={0}>
                  {/* Audio settings content */}
                  <VStack spacing={6} align="stretch">
                    {/* Audio Section */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" mb={4} color="white">Audio</Text>
                      <VStack spacing={3} align="stretch">
                        {/* Master Volume */}
                        <HStack justify="space-between" align="center">
                          <Text fontSize="sm" color="white" minW="120px">Master Volume</Text>
                          <HStack spacing={3} flex="1" justify="flex-end">
                            <Text fontSize="sm" color="whiteAlpha.800" minW="50px" textAlign="right">{masterVolume}%</Text>
                            <Box width="180px">
                              <Slider 
                                value={masterVolume} 
                                onChange={handleMasterVolumeChange}
                                min={0}
                                max={100}
                                step={1}
                                colorScheme="blue"
                                size="sm"
                              >
                                <SliderTrack bg="whiteAlpha.300" h="4px">
                                  <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb boxSize={4} />
                              </Slider>
                            </Box>
                          </HStack>
                        </HStack>
                        
                        {/* Music Volume */}
                        <HStack justify="space-between" align="center">
                          <Text fontSize="sm" color="white" minW="120px">Music Volume</Text>
                          <HStack spacing={3} flex="1" justify="flex-end">
                            <Text fontSize="sm" color="whiteAlpha.800" minW="50px" textAlign="right">{musicVolume}%</Text>
                            <Box width="180px">
                              <Slider 
                                value={musicVolume} 
                                onChange={handleMusicVolumeChange}
                                min={0}
                                max={100}
                                step={1}
                                colorScheme="green"
                                size="sm"
                              >
                                <SliderTrack bg="whiteAlpha.300" h="4px">
                                  <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb boxSize={4} />
                              </Slider>
                            </Box>
                          </HStack>
                        </HStack>
                        
                        {/* Sound Effects Volume */}
                        <HStack justify="space-between" align="center">
                          <Text fontSize="sm" color="white" minW="120px">Sound Effects Volume</Text>
                          <HStack spacing={3} flex="1" justify="flex-end">
                            <Text fontSize="sm" color="whiteAlpha.800" minW="50px" textAlign="right">{sfxVolume}%</Text>
                            <Box width="180px">
                              <Slider 
                                value={sfxVolume} 
                                onChange={handleSfxVolumeChange}
                                min={0}
                                max={100}
                                step={1}
                                colorScheme="orange"
                                size="sm"
                              >
                                <SliderTrack bg="whiteAlpha.300" h="4px">
                                  <SliderFilledTrack />
                                </SliderTrack>
                                <SliderThumb boxSize={4} />
                              </Slider>
                            </Box>
                          </HStack>
                        </HStack>
                      </VStack>
                    </Box>
                    
                    {/* Voice Chat Section */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" mb={4} color="white">Voice Chat</Text>
                      <HStack justify="space-between" align="center">
                        <Text fontSize="sm" color="white">Microphone</Text>
                        <Button
                          onClick={openVoiceChatSettings}
                          variant="outline"
                          size="sm"
                          colorScheme="gray"
                          borderColor="whiteAlpha.400"
                          color="white"
                          _hover={{ bg: "whiteAlpha.200" }}
                          rightIcon={<Box as="span">›</Box>}
                          px={4}
                        >
                        </Button>
                      </HStack>
                    </Box>
                  </VStack>
                </TabPanel>
                
                <TabPanel p={0}>
                  {/* Graphics settings content */}
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="md" fontWeight="semibold">Graphics Settings</Text>
                    <Box
                      p={4}
                      bg="whiteAlpha.100"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                    >
                      <Text color="whiteAlpha.700" fontSize="sm">
                        Graphics settings will be available here.
                      </Text>
                    </Box>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </Box>
      </Portal>
      
      {/* Voice Chat Settings Modal - Only render when open */}
      {isVoiceChatSettingsOpen && (
        <VoiceChatSettingsModal 
          isOpen={isVoiceChatSettingsOpen} 
          onClose={closeVoiceChatSettings}
          containerRef={containerRef}
        />
      )}
    </>
  );
}

export default SpacesSettingsModal;
