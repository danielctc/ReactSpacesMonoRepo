import React, { useState, useEffect } from 'react';
import { Text, useToast } from "@chakra-ui/react";

/**
 * Menu option component for toggling screen sharing
 */
const ScreenShareMenuOption = ({ onClose }) => {
  const toast = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Update screen sharing state based on window.agoraClient
  useEffect(() => {
    const checkScreenSharingState = () => {
      if (window.agoraClient) {
        setIsScreenSharing(!!window.agoraClient.isScreenSharing);
      }
    };
    
    // Check immediately
    checkScreenSharingState();
    
    // Set up interval to check periodically
    const intervalId = setInterval(checkScreenSharingState, 1000);
    
    // Listen for screen sharing events
    const handleScreenShareChange = () => {
      checkScreenSharingState();
    };
    
    window.addEventListener('ScreenShareToggled', handleScreenShareChange);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('ScreenShareToggled', handleScreenShareChange);
    };
  }, []);
  
  const handleScreenShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onClose) {
      onClose();
    }
    
    // Check if we have access to the Agora client
    if (!window.agoraClient || !window.agoraClient.client) {
      toast({
        title: 'Screen sharing not available',
        description: 'Voice chat must be connected to use screen sharing',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsJoining(true);
      
      // If not joined to voice chat, join automatically
      if (!window.agoraClient.isJoined) {
        console.log('ScreenShareMenuOption: Not joined to voice chat, joining automatically');
        
        // Dispatch an event to request joining the voice chat
        const joinEvent = new CustomEvent('JoinVoiceChat', { 
          detail: { callback: (success) => {
            if (!success) {
              console.error('ScreenShareMenuOption: Failed to join voice chat');
              toast({
                title: 'Connection failed',
                description: 'Could not connect to voice chat',
                status: 'error',
                duration: 3000,
                isClosable: true,
              });
              setIsJoining(false);
              return;
            }
            
            // If joined successfully, toggle screen share
            toggleScreenShare();
          }}
        });
        
        window.dispatchEvent(joinEvent);
      } else {
        // Already joined, toggle screen share directly
        toggleScreenShare();
      }
    } catch (error) {
      console.error('Error in screen share handler:', error);
      setIsJoining(false);
      
      toast({
        title: 'Screen sharing error',
        description: error.message || 'Failed to toggle screen sharing',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Helper function to toggle screen share
  const toggleScreenShare = async () => {
    try {
      // Dispatch an event to toggle screen sharing
      const toggleEvent = new CustomEvent('ToggleScreenShare', { 
        detail: { callback: (success, isNowSharing) => {
          setIsJoining(false);
          
          if (success) {
            setIsScreenSharing(isNowSharing);
            
            // Show toast based on result
            if (isNowSharing) {
              toast({
                title: 'Screen sharing started',
                status: 'success',
                duration: 3000,
                isClosable: true,
              });
            } else {
              toast({
                title: 'Screen sharing stopped',
                status: 'info',
                duration: 3000,
                isClosable: true,
              });
            }
          } else {
            toast({
              title: 'Screen sharing error',
              description: 'Failed to toggle screen sharing',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
        }}
      });
      
      window.dispatchEvent(toggleEvent);
    } catch (error) {
      console.error('Error toggling screen share:', error);
      setIsJoining(false);
      
      toast({
        title: 'Screen sharing error',
        description: error.message || 'Failed to toggle screen sharing',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Text 
      fontSize="sm" 
      cursor="pointer" 
      _hover={{ bg: "whiteAlpha.200" }} 
      p={1.5} 
      borderRadius="md"
      onClick={handleScreenShare}
      color={isScreenSharing ? "red.300" : "white"}
    >
      {isJoining ? 'Connecting...' : (isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen')}
    </Text>
  );
};

export default ScreenShareMenuOption; 