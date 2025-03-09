import React, { useState, useEffect, useRef, useContext } from 'react';
import { Box, Text, CloseButton, Button, Spinner } from "@chakra-ui/react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useAgoraContext } from '../providers/AgoraProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';

// Create a mock UserContext if the shared package is not available
const UserContext = React.createContext({ user: null });

const ScreenShareDisplay = ({ userNickname }) => {
  const { client, channel, screenTrack, isScreenSharing, toggleScreenShare } = useAgoraContext();
  const [remoteScreens, setRemoteScreens] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRefs = useRef({});
  const localScreenRef = useRef(null);
  const { user } = useContext(UserContext) || { user: null };
  const [userNicknames, setUserNicknames] = useState({});
  const localScreenTrackRef = useRef(screenTrack);
  
  // Update the ref when screenTrack changes
  useEffect(() => {
    localScreenTrackRef.current = screenTrack;
  }, [screenTrack]);
  
  // Check if client is connected
  useEffect(() => {
    if (!client || !channel) {
      setIsConnected(false);
      return;
    }
    
    // Set a timeout to stop showing loading state after 5 seconds
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    
    console.log("Setting up screen share display with existing client:", client);
    console.log("Current channel:", channel);
    
    // Check if client is connected
    const connectionState = client.connectionState;
    console.log("Current connection state:", connectionState);
    
    if (connectionState === 'CONNECTED') {
      setIsConnected(true);
      setIsLoading(false);
    } else {
      setIsConnected(false);
      
      // Listen for connection state change
      const handleConnectionStateChange = (state) => {
        console.log("Connection state changed:", state);
        if (state === 'CONNECTED') {
          setIsConnected(true);
          setIsLoading(false);
        } else {
          setIsConnected(false);
        }
      };
      
      client.on('connection-state-change', handleConnectionStateChange);
      
      // Clean up event listener
      return () => {
        client.off('connection-state-change', handleConnectionStateChange);
        clearTimeout(loadingTimer);
      };
    }
    
    return () => {
      clearTimeout(loadingTimer);
    };
  }, [client, channel]);
  
  // Fetch user nicknames for remote screens
  useEffect(() => {
    const fetchUserNicknames = async () => {
      const newNicknames = { ...userNicknames };
      let hasChanges = false;
      
      for (const screen of remoteScreens) {
        // Skip if we already have this nickname
        if (userNicknames[screen.uid]) continue;
        
        // First try to extract a name from the UID format
        let extractedName = null;
        let userId = screen.uid;
        
        if (typeof userId === 'string') {
          // Try to extract name from format "name-randomstring"
          if (userId.includes('-')) {
            extractedName = userId.split('-')[0];
            userId = userId.split('-')[1]; // Get the actual UID part
          }
          // Try to extract name from format "name_randomstring"
          else if (userId.includes('_')) {
            extractedName = userId.split('_')[0];
            userId = userId.split('_')[1]; // Get the actual UID part
          }
        }
        
        // If we have a valid userId, try to fetch the profile data
        if (userId) {
          try {
            console.log('Trying to fetch nickname for user ID:', userId);
            const profileData = await getUserProfileData(userId);
            
            if (profileData && profileData.Nickname) {
              console.log('Found nickname in Firebase for user ID:', userId, 'Nickname:', profileData.Nickname);
              newNicknames[screen.uid] = profileData.Nickname;
              hasChanges = true;
            } else if (extractedName) {
              // Use the extracted name if we couldn't get a nickname from Firebase
              console.log('Using extracted name for user ID:', userId, 'Name:', extractedName);
              newNicknames[screen.uid] = extractedName;
              hasChanges = true;
            } else {
              // Fallback to a generic name
              newNicknames[screen.uid] = "User";
              hasChanges = true;
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
            // Use the extracted name as fallback
            if (extractedName) {
              newNicknames[screen.uid] = extractedName;
              hasChanges = true;
            } else {
              newNicknames[screen.uid] = "User";
              hasChanges = true;
            }
          }
        } else if (extractedName) {
          // If we couldn't get a userId but have an extracted name, use that
          newNicknames[screen.uid] = extractedName;
          hasChanges = true;
        } else {
          // Last resort fallback
          newNicknames[screen.uid] = "User";
          hasChanges = true;
        }
      }
      
      // Update state if we found any new nicknames
      if (hasChanges) {
        setUserNicknames(newNicknames);
      }
    };
    
    if (remoteScreens.length > 0) {
      fetchUserNicknames();
    }
  }, [remoteScreens, userNicknames]);
  
  // Use the client from AgoraContext
  useEffect(() => {
    if (!client || !channel || !isConnected) return;
    
    console.log("Setting up screen share event handlers");
    
    // Set up event handlers for screen sharing
    const handleUserPublished = async (user, mediaType) => {
      console.log('User published:', user.uid, mediaType, user);
      
      if (mediaType === 'video') {
        console.log('Remote video track detected:', user.uid);
        
        try {
          // Subscribe to the remote video track
          await client.subscribe(user, mediaType);
          console.log('Subscribed to remote video track:', user.uid);
          
          // Add to remote screens list
          setRemoteScreens(prev => {
            if (!prev.some(screen => screen.uid === user.uid)) {
              return [...prev, user];
            }
            return prev;
          });
        } catch (error) {
          console.error('Error subscribing to remote video track:', error);
        }
      }
    };
    
    const handleUserUnpublished = (user, mediaType) => {
      console.log('User unpublished:', user.uid, mediaType);
      
      if (mediaType === 'video') {
        console.log('Remote video track unpublished:', user.uid);
        
        // Stop the track if it exists
        if (user.videoTrack) {
          try {
            user.videoTrack.stop();
          } catch (e) {
            console.error('Error stopping video track:', e);
          }
        }
        
        // Remove from remote screens list
        setRemoteScreens(prev => prev.filter(screen => screen.uid !== user.uid));
        
        // Make sure local screen share is still playing if it's active
        if (isScreenSharing && localScreenTrackRef.current && localScreenRef.current) {
          try {
            console.log('Ensuring local screen track is still playing after remote user unpublished');
            localScreenTrackRef.current.play(localScreenRef.current);
          } catch (error) {
            console.error('Error replaying local screen track:', error);
          }
        }
      }
    };
    
    const handleUserLeft = (user) => {
      console.log('User left:', user.uid);
      
      // Stop the track if it exists
      const screen = remoteScreens.find(s => s.uid === user.uid);
      if (screen && screen.videoTrack) {
        try {
          screen.videoTrack.stop();
        } catch (e) {
          console.error('Error stopping video track:', e);
        }
      }
      
      // Remove from remote screens list
      setRemoteScreens(prev => prev.filter(screen => screen.uid !== user.uid));
      
      // Make sure local screen share is still playing if it's active
      if (isScreenSharing && localScreenTrackRef.current && localScreenRef.current) {
        try {
          console.log('Ensuring local screen track is still playing after remote user left');
          localScreenTrackRef.current.play(localScreenRef.current);
        } catch (error) {
          console.error('Error replaying local screen track:', error);
        }
      }
    };
    
    // Add event listeners
    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);
    
    // Clean up event listeners
    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
    };
  }, [client, channel, isConnected, remoteScreens, isScreenSharing]);
  
  // Play videos when screens change
  useEffect(() => {
    console.log('Remote screens changed:', remoteScreens.length, remoteScreens);
    
    remoteScreens.forEach(screen => {
      if (screen.videoTrack) {
        try {
          console.log('Playing video track for:', screen.uid);
          
          // Play the video track
          screen.videoTrack.play(`video-container-${screen.uid}`);
        } catch (error) {
          console.error('Error playing video track:', error);
        }
      }
    });
    
    // Make sure local screen share is still playing if it's active
    if (isScreenSharing && localScreenTrackRef.current && localScreenRef.current) {
      try {
        console.log('Ensuring local screen track is still playing after remote screens changed');
        localScreenTrackRef.current.play(localScreenRef.current);
      } catch (error) {
        console.error('Error replaying local screen track:', error);
      }
    }
  }, [remoteScreens, isScreenSharing]);
  
  // Handle local screen share
  useEffect(() => {
    console.log('Local screen sharing state changed:', isScreenSharing, screenTrack);
    
    if (isScreenSharing && screenTrack && localScreenRef.current) {
      try {
        console.log('Playing local screen track');
        
        // Play the video track
        screenTrack.play(localScreenRef.current);
      } catch (error) {
        console.error('Error playing local screen track:', error);
      }
    }
  }, [isScreenSharing, screenTrack]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up remote screens
      remoteScreens.forEach(screen => {
        if (screen.videoTrack) {
          try {
            screen.videoTrack.stop();
          } catch (e) {
            console.error('Error stopping video track on unmount:', e);
          }
        }
      });
      
      // Clean up local screen
      if (screenTrack) {
        try {
          screenTrack.stop();
        } catch (e) {
          console.error('Error stopping local screen track on unmount:', e);
        }
      }
    };
  }, [remoteScreens, screenTrack]);
  
  // Handle closing a screen share
  const handleClose = (screenUid) => {
    console.log('Closing screen share for:', screenUid);
    
    const screen = remoteScreens.find(s => s.uid === screenUid);
    if (screen && screen.videoTrack) {
      try {
        // Stop the video track
        screen.videoTrack.stop();
      } catch (e) {
        console.error('Error stopping video track:', e);
      }
    }
    
    // Remove from remote screens list
    setRemoteScreens(prev => prev.filter(screen => screen.uid !== screenUid));
    
    // Make sure local screen share is still playing if it's active
    if (isScreenSharing && localScreenTrackRef.current && localScreenRef.current) {
      try {
        console.log('Ensuring local screen track is still playing after closing remote screen');
        localScreenTrackRef.current.play(localScreenRef.current);
      } catch (error) {
        console.error('Error replaying local screen track:', error);
      }
    }
  };
  
  // Handle stopping local screen share
  const handleStopLocalScreenShare = () => {
    console.log('Stopping local screen share');
    toggleScreenShare();
  };
  
  // Get display name for a user ID
  const getDisplayName = (uid) => {
    console.log('Getting display name for UID:', uid, 'type:', typeof uid);
    
    // If it's the local user
    if (isScreenSharing && user && (uid === user.uid || uid === client?.uid)) {
      return userNickname || "You";
    }
    
    // Check if we have a cached nickname for this user
    if (userNicknames[uid]) {
      return userNicknames[uid];
    }
    
    // Extract nickname from UID if available
    if (typeof uid === 'string') {
      // Try to extract name from format "name-randomstring"
      if (uid.includes('-')) {
        return uid.split('-')[0];
      }
      
      // Try to extract name from format "name_randomstring"
      if (uid.includes('_')) {
        return uid.split('_')[0];
      }
      
      // If UID is a string but doesn't contain separators, use it as is
      return uid;
    }
    
    // Default fallback
    return "User";
  };
  
  // If not connected, don't render anything
  if (!isConnected) {
    return null;
  }
  
  // If loading and no screens, don't render anything
  if (isLoading && remoteScreens.length === 0 && !isScreenSharing) {
    return null;
  }
  
  // If no screens to display, don't render anything
  if (remoteScreens.length === 0 && !isScreenSharing) {
    return null;
  }
  
  return (
    <Box 
      position="fixed" 
      top="70px"
      right="20px" 
      zIndex={10000}
      maxWidth="80vw"
      maxHeight="80vh"
      overflow="auto"
    >
      {/* Local screen share */}
      {isScreenSharing && screenTrack && (
        <Box 
          position="relative" 
          mb={4} 
          borderRadius="md" 
          overflow="hidden"
          boxShadow="xl"
          bg="black"
          width="640px"
          height="360px"
        >
          <Box 
            position="absolute" 
            top={2} 
            right={2} 
            zIndex={10}
          >
            <CloseButton 
              size="sm" 
              bg="rgba(0,0,0,0.5)" 
              color="white" 
              onClick={handleStopLocalScreenShare} 
            />
          </Box>
          <Box 
            ref={localScreenRef}
            width="100%" 
            height="100%"
            position="relative"
            id="local-screen-container"
          />
          <Box
            position="absolute"
            bottom={2}
            left={2}
            color="white"
            fontSize="sm"
            bg="rgba(0,0,0,0.5)"
            px={2}
            py={1}
            borderRadius="md"
            zIndex={5}
          >
            {userNickname ? `${userNickname}'s Screen` : "Your Screen"}
          </Box>
        </Box>
      )}
      
      {/* Remote screen shares */}
      {remoteScreens.map(screen => {
        // Get display name
        const displayName = userNicknames[screen.uid] || getDisplayName(screen.uid);
        
        return (
          <Box 
            key={screen.uid} 
            position="relative" 
            mb={4} 
            borderRadius="md" 
            overflow="hidden"
            boxShadow="xl"
            bg="black"
            width="640px"
            height="360px"
          >
            <Box 
              position="absolute" 
              top={2} 
              right={2} 
              zIndex={10}
            >
              <CloseButton 
                size="sm" 
                bg="rgba(0,0,0,0.5)" 
                color="white" 
                onClick={() => handleClose(screen.uid)} 
              />
            </Box>
            <Box 
              id={`video-container-${screen.uid}`}
              width="100%" 
              height="100%"
              position="relative"
            />
            <Box
              position="absolute"
              bottom={2}
              left={2}
              color="white"
              fontSize="sm"
              bg="rgba(0,0,0,0.5)"
              px={2}
              py={1}
              borderRadius="md"
              zIndex={5}
            >
              {`${displayName}'s Screen`}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ScreenShareDisplay; 