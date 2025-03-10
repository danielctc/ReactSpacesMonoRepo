import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Text, 
  VStack, 
  HStack, 
  Badge, 
  Progress, 
  Divider,
  Heading,
  List,
  ListItem,
  Avatar
} from '@chakra-ui/react';
import { useAgoraContext } from '@disruptive-spaces/webgl/src/voice-chat/providers/AgoraProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';

/**
 * Debug panel for voice chat that shows user information from Firebase
 */
const VoiceChatDebugPanel = () => {
  const { 
    isVoiceEnabled, 
    isJoined, 
    users, 
    error, 
    isLoading,
    channel,
    getVolumeLevel
  } = useAgoraContext();
  
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [speakerProfiles, setSpeakerProfiles] = useState({});
  
  // Update volume level periodically
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isVoiceEnabled) {
        setVolumeLevel(getVolumeLevel() * 100); // Convert to percentage
      } else {
        setVolumeLevel(0);
      }
    }, 100);
    
    return () => clearInterval(intervalId);
  }, [isVoiceEnabled, getVolumeLevel]);
  
  // Fetch user profiles from Firebase when users change
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const profiles = {};
      
      for (const user of users) {
        try {
          // Try to get user profile from Firebase
          const profile = await getUserProfileData(user.uid);
          profiles[user.uid] = profile;
        } catch (err) {
          console.error(`Error fetching profile for user ${user.uid}:`, err);
          profiles[user.uid] = { Nickname: `User ${user.uid.slice(0, 6)}...` };
        }
      }
      
      setSpeakerProfiles(profiles);
    };
    
    if (users.length > 0) {
      fetchUserProfiles();
    }
  }, [users]);
  
  // Get connection status badge
  const getStatusBadge = () => {
    if (isLoading) return <Badge colorScheme="yellow">Loading</Badge>;
    if (error) return <Badge colorScheme="red">Error</Badge>;
    if (!isJoined) return <Badge colorScheme="orange">Disconnected</Badge>;
    return <Badge colorScheme="green">Connected</Badge>;
  };
  
  // Get microphone status badge
  const getMicBadge = () => {
    if (isLoading) return <Badge colorScheme="yellow">Initializing</Badge>;
    if (!isJoined) return <Badge colorScheme="gray">Unavailable</Badge>;
    if (isVoiceEnabled) return <Badge colorScheme="green">Enabled</Badge>;
    return <Badge colorScheme="red">Muted</Badge>;
  };
  
  return (
    <Box 
      p={4} 
      bg="gray.800" 
      color="white" 
      borderRadius="md" 
      boxShadow="lg"
      width="100%"
    >
      <VStack align="stretch" spacing={4}>
        <Heading size="md">Voice Chat Debug</Heading>
        
        <Divider />
        
        <HStack justify="space-between">
          <Text>Status:</Text>
          {getStatusBadge()}
        </HStack>
        
        <HStack justify="space-between">
          <Text>Microphone:</Text>
          {getMicBadge()}
        </HStack>
        
        <HStack justify="space-between">
          <Text>Channel:</Text>
          <Text fontWeight="bold">{channel || 'Not set'}</Text>
        </HStack>
        
        {error && (
          <Text color="red.300" fontSize="sm">Error: {error}</Text>
        )}
        
        {isVoiceEnabled && (
          <Box>
            <Text mb={1}>Volume Level:</Text>
            <Progress 
              value={volumeLevel} 
              colorScheme="green" 
              size="sm" 
              borderRadius="md"
              hasStripe={volumeLevel > 20}
              isAnimated={volumeLevel > 20}
            />
          </Box>
        )}
        
        <Divider />
        
        <Box>
          <Heading size="sm" mb={2}>Active Speakers ({users.length})</Heading>
          {users.length === 0 ? (
            <Text fontSize="sm" color="gray.400">No active speakers</Text>
          ) : (
            <List spacing={2}>
              {users.map(user => {
                const profile = speakerProfiles[user.uid] || {};
                const nickname = profile.Nickname || `User ${user.uid.slice(0, 6)}...`;
                const avatarUrl = profile.rpmURL ? 
                  profile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") 
                  : null;
                
                return (
                  <ListItem key={user.uid}>
                    <HStack>
                      <Avatar size="sm" name={nickname} src={avatarUrl} />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold">{nickname}</Text>
                        <Text fontSize="xs" color="gray.400">ID: {user.uid}</Text>
                      </VStack>
                      <Badge 
                        colorScheme={user.audioTrack?.isPlaying ? "green" : "gray"}
                        ml="auto"
                      >
                        {user.audioTrack?.isPlaying ? "Speaking" : "Silent"}
                      </Badge>
                    </HStack>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default VoiceChatDebugPanel; 