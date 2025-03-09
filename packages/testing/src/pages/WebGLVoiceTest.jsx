import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Input, 
  FormControl, 
  FormLabel, 
  VStack, 
  Heading, 
  Text,
  Flex,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { AgoraProvider, VoiceButton } from '@disruptive-spaces/voice-chat';
import VoiceChatDebugPanel from '../components/VoiceChatDebugPanel';
import { UserProvider } from '@disruptive-spaces/shared/providers/UserProvider';

/**
 * Test page for WebGL voice chat
 */
const WebGLVoiceTest = () => {
  const [userId, setUserId] = useState('');
  const [spaceId, setSpaceId] = useState('test');
  const [isConnected, setIsConnected] = useState(false);
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  
  const handleConnect = () => {
    if (!userId || !spaceId) return;
    setIsConnected(true);
  };
  
  const handleDisconnect = () => {
    setIsConnected(false);
  };
  
  return (
    <Box minH="100vh" bg={bgColor} py={8}>
      <Box maxW="1000px" mx="auto" px={4}>
        <Heading mb={6}>WebGL Voice Chat Test</Heading>
        
        {!isConnected ? (
          <Box bg={cardBgColor} p={6} borderRadius="md" boxShadow="md">
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>User ID</FormLabel>
                <Input 
                  value={userId} 
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your user ID"
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  This should be a valid Firebase user ID
                </Text>
              </FormControl>
              
              <FormControl>
                <FormLabel>Space ID</FormLabel>
                <Input 
                  value={spaceId} 
                  onChange={(e) => setSpaceId(e.target.value)}
                  placeholder="Enter space ID"
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  This will be used to create the voice channel name
                </Text>
              </FormControl>
              
              <Button 
                colorScheme="blue" 
                onClick={handleConnect}
                isDisabled={!userId || !spaceId}
              >
                Connect
              </Button>
            </VStack>
          </Box>
        ) : (
          <UserProvider overrideUserId={userId}>
            <Box bg={cardBgColor} p={6} borderRadius="md" boxShadow="md">
              <VStack spacing={6} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="md">Voice Chat</Heading>
                  <Button colorScheme="red" size="sm" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </Flex>
                
                <Divider />
                
                <Flex align="center" gap={4}>
                  <Text>User ID: {userId}</Text>
                  <Text>Space: {spaceId}</Text>
                  <Text>Channel: space-{spaceId}-voice</Text>
                </Flex>
                
                <AgoraProvider
                  appId="130dccf9b3554bda87f8cf577f91c8c4"
                  channel={`space-${spaceId}-voice`}
                  uid={userId}
                  enabled={true}
                >
                  <Flex gap={4} align="center" mb={4}>
                    <VoiceButton size="lg" />
                    <Text>Click to toggle microphone</Text>
                  </Flex>
                  
                  <VoiceChatDebugPanel />
                </AgoraProvider>
              </VStack>
            </Box>
          </UserProvider>
        )}
      </Box>
    </Box>
  );
};

export default WebGLVoiceTest; 