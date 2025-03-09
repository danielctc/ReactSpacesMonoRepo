import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Input, Text, VStack, Heading, Alert, AlertIcon, Code, Divider } from '@chakra-ui/react';
import VoiceChatTest from '../components/VoiceChatTest';

const VoiceChatTestPage = () => {
  const [userId, setUserId] = useState('');
  const [spaceId, setSpaceId] = useState('test');
  const [showTest, setShowTest] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  
  // Generate a random user ID if none is provided
  useEffect(() => {
    if (!userId) {
      const randomId = Math.random().toString(36).substring(2, 15);
      setUserId(randomId);
    }
  }, [userId]);
  
  // Setup console.log override in a separate useEffect
  useEffect(() => {
    // Store original console methods
    const originalConsoleLog = console.log;
    
    // Override console.log
    console.log = (...args) => {
      // Call original first
      originalConsoleLog(...args);
      
      // Then update our debug info
      const logString = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Use a callback to avoid issues with stale state
      setDebugInfo(prev => [...prev, logString].slice(-20));
    };
    
    // Restore on cleanup
    return () => {
      console.log = originalConsoleLog;
    };
  }, []);
  
  const handleStartTest = useCallback(() => {
    setShowTest(true);
    setDebugInfo([]);
  }, []);
  
  return (
    <Box p={8} maxW="800px" mx="auto">
      <Heading mb={6}>Agora Voice Chat Test</Heading>
      
      <Alert status="info" mb={4}>
        <AlertIcon />
        <Text>
          This test page helps you verify Agora voice chat functionality. 
          If you're having issues, check the debug information at the bottom.
        </Text>
      </Alert>
      
      <VStack spacing={4} align="stretch" mb={8}>
        <Box>
          <Text mb={2}>User ID:</Text>
          <Input 
            value={userId} 
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID or leave for random"
          />
        </Box>
        
        <Box>
          <Text mb={2}>Space ID:</Text>
          <Input 
            value={spaceId} 
            onChange={(e) => setSpaceId(e.target.value)}
            placeholder="Enter space ID"
          />
        </Box>
        
        <Button colorScheme="blue" onClick={handleStartTest}>
          Start Voice Chat Test
        </Button>
      </VStack>
      
      {showTest && (
        <Box>
          <VoiceChatTest userId={userId} spaceId={spaceId} />
          
          <Box mt={8} p={4} bg="gray.100" borderRadius="md">
            <Heading size="md" mb={4}>Instructions</Heading>
            <Text>1. Click the microphone button to toggle your microphone.</Text>
            <Text>2. Open this page in another browser or device with a different User ID to test communication.</Text>
            <Text>3. Make sure both instances use the same Space ID to join the same channel.</Text>
            <Text>4. Check browser console for any errors.</Text>
            <Text mt={4} fontWeight="bold">Note: You may need to allow microphone access in your browser.</Text>
          </Box>
          
          <Box mt={8}>
            <Heading size="md" mb={4}>Debug Information</Heading>
            <Box 
              p={4} 
              bg="gray.800" 
              color="green.300" 
              borderRadius="md" 
              fontFamily="monospace"
              fontSize="sm"
              maxH="300px"
              overflowY="auto"
            >
              {debugInfo.length > 0 ? (
                debugInfo.map((log, i) => (
                  <Text key={i}>{log}</Text>
                ))
              ) : (
                <Text>No debug information available yet.</Text>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default VoiceChatTestPage; 