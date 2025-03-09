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
  AlertIcon
} from "@chakra-ui/react";
import AgoraRTC from 'agora-rtc-sdk-ng';

// Create a simple version of the AudioSettings component that doesn't rely on the hook
const AudioSettings = () => {
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState('');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [microphoneVolume, setMicrophoneVolume] = useState(100);
  const [speakerVolume, setSpeakerVolume] = useState(100);
  const [isEchoEnabled, setIsEchoEnabled] = useState(true);
  const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(false);
  
  // Fetch available audio devices
  useEffect(() => {
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
  }, []);
  
  // Simulate volume level for demonstration
  useEffect(() => {
    const interval = setInterval(() => {
      if (micEnabled) {
        // Generate random volume level for demonstration
        setVolumeLevel(Math.random() * 50);
      } else {
        setVolumeLevel(0);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [micEnabled]);
  
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
    <VStack spacing={6} align="stretch">
      {/* Microphone selection */}
      <FormControl>
        <FormLabel>Microphone 
          <Badge ml={2} colorScheme={micEnabled ? "green" : "red"}>
            {micEnabled ? "Enabled" : "Muted"}
          </Badge>
        </FormLabel>
        <Select 
          value={selectedMicrophoneId} 
          onChange={handleMicrophoneChange}
          bg="gray.700"
          borderColor="gray.600"
          _hover={{ borderColor: "gray.500" }}
        >
          {audioDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
            </option>
          ))}
          {audioDevices.length === 0 && (
            <option value="">No microphones found</option>
          )}
        </Select>
      </FormControl>
      
      {/* Microphone volume level indicator */}
      <Box>
        <Text mb={2}>Microphone Level</Text>
        <Progress 
          value={volumeLevel} 
          colorScheme="green" 
          size="sm" 
          borderRadius="md"
          hasStripe={volumeLevel > 20}
          isAnimated={volumeLevel > 20}
        />
      </Box>
      
      {/* Microphone volume control */}
      <FormControl>
        <FormLabel>Microphone Volume: {microphoneVolume}%</FormLabel>
        <Slider 
          value={microphoneVolume} 
          onChange={handleMicrophoneVolumeChange}
          min={0}
          max={100}
          step={1}
          colorScheme="blue"
        >
          <SliderTrack bg="gray.700">
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb boxSize={6} />
        </Slider>
      </FormControl>
      
      {/* Speaker volume control */}
      <FormControl>
        <FormLabel>Speaker Volume: {speakerVolume}%</FormLabel>
        <Slider 
          value={speakerVolume} 
          onChange={handleSpeakerVolumeChange}
          min={0}
          max={100}
          step={1}
          colorScheme="blue"
        >
          <SliderTrack bg="gray.700">
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb boxSize={6} />
        </Slider>
      </FormControl>
      
      {/* Mute/Unmute toggle */}
      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0">Microphone Enabled</FormLabel>
        <Switch 
          isChecked={micEnabled} 
          onChange={toggleMicrophone}
          colorScheme="green"
          size="lg"
        />
      </FormControl>
      
      {/* Echo cancellation toggle */}
      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0">Echo Cancellation</FormLabel>
        <Switch 
          isChecked={isEchoEnabled} 
          onChange={() => setIsEchoEnabled(!isEchoEnabled)}
          colorScheme="green"
          size="lg"
        />
      </FormControl>
      
      {/* Noise suppression toggle */}
      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0">Noise Suppression</FormLabel>
        <Switch 
          isChecked={isNoiseSuppressionEnabled} 
          onChange={() => setIsNoiseSuppressionEnabled(!isNoiseSuppressionEnabled)}
          colorScheme="green"
          size="lg"
        />
      </FormControl>
      
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        Note: These settings will be applied when you join a voice chat.
      </Alert>
    </VStack>
  );
};

function SpacesSettingsModal({ open, onClose, containerRef }) {
  return (
    <Portal containerRef={containerRef}>
      <Modal isOpen={open} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent bg="gray.900" color="white" borderRadius="lg">
          <ModalHeader>Settings</ModalHeader>

          {/* Custom close button */}
          <ModalCloseButton
            size="lg"
            bg="gray.700"
            color="white"
            borderRadius="full"
            _hover={{ bg: "gray.600" }}
            _focus={{ boxShadow: "none" }}
          />

          <ModalBody>
            {/* Tab structure for different settings */}
            <Tabs variant="enclosed">
              <TabList mb={4}>
                <Tab _selected={{ color: 'white', borderBottom: '2px solid white' }}>Audio</Tab>
                <Tab _selected={{ color: 'white', borderBottom: '2px solid white' }}>Graphics</Tab>
              </TabList>
              <TabPanels>
                <TabPanel>
                  {/* Audio settings content */}
                  <Box p={4} bg="gray.800" borderRadius="md">
                    <AudioSettings />
                  </Box>
                </TabPanel>
                <TabPanel>
                  {/* Graphics settings content */}
                  <Box p={4} bg="gray.800" borderRadius="md">
                    Graphics settings content goes here.
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Portal>
  );
}

export default SpacesSettingsModal;
