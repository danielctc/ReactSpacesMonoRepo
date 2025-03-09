import React, { useEffect, useRef } from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { AgoraProvider, VoiceButton, useVoiceChat } from '@disruptive-spaces/voice-chat';

// Component to display voice chat status
const VoiceChatStatus = () => {
  const { 
    isVoiceEnabled, 
    isJoined, 
    users, 
    error, 
    isLoading,
    channel
  } = useVoiceChat();
  
  // Use ref to avoid render loops
  const contextRef = useRef({ isVoiceEnabled, isJoined, users, error, isLoading, channel });
  
  // Update ref values
  useEffect(() => {
    contextRef.current = { isVoiceEnabled, isJoined, users, error, isLoading, channel };
  }, [isVoiceEnabled, isJoined, users, error, isLoading, channel]);

  // Log the context values for debugging (in useEffect to avoid render issues)
  useEffect(() => {
    console.log("VoiceChatStatus context:", { 
      isVoiceEnabled, 
      isJoined, 
      users, 
      error, 
      isLoading,
      channel
    });
  }, [isVoiceEnabled, isJoined, users, error, isLoading, channel]);

  return (
    <VStack align="start" spacing={2} mt={4}>
      <Text>Channel: {channel || 'Not set'}</Text>
      <Text>Status: {isLoading ? 'Loading...' : isJoined ? 'Connected' : 'Disconnected'}</Text>
      <Text>Microphone: {isVoiceEnabled ? 'Enabled' : 'Disabled'}</Text>
      <Text>Active Speakers: {users.length}</Text>
      {error && <Text color="red.500">Error: {error}</Text>}
      {users.length > 0 && (
        <Box>
          <Text fontWeight="bold">Users:</Text>
          {users.map(user => (
            <Text key={user.uid}>User {user.uid}</Text>
          ))}
        </Box>
      )}
    </VStack>
  );
};

// Main test component
const VoiceChatTest = ({ userId, spaceId = 'test' }) => {
  // Create a specific channel name for testing
  const channelName = `space-${spaceId}-voice`;
  
  // Use ref for props to avoid render loops
  const propsRef = useRef({ userId, spaceId, channelName });
  
  // Update ref values
  useEffect(() => {
    propsRef.current = { userId, spaceId, channelName };
  }, [userId, spaceId, channelName]);
  
  // Log the props for debugging (in useEffect to avoid render issues)
  useEffect(() => {
    console.log("VoiceChatTest props:", { userId, spaceId, channelName });
  }, [userId, spaceId, channelName]);
  
  return (
    <Box p={4} bg="gray.100" borderRadius="md">
      <Text fontSize="xl" fontWeight="bold">Voice Chat Test</Text>
      <Text>User ID: {userId}</Text>
      
      <AgoraProvider
        appId="c03736094e2841b5af904d33dee9f095"
        channel={channelName}
        uid={userId}
        enabled={true}
        // Uncomment and add a token if needed
        // token="your-temporary-token"
      >
        <Box display="flex" alignItems="center" gap={4} mt={2}>
          <VoiceButton size="md" />
          <Text>Click to toggle microphone</Text>
        </Box>
        
        <VoiceChatStatus />
      </AgoraProvider>
    </Box>
  );
};

export default VoiceChatTest; 