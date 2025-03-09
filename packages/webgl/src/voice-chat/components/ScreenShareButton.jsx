import React, { useState, useEffect } from 'react';
import { Button, Icon, useToast } from '@chakra-ui/react';
import { FaDesktop } from 'react-icons/fa';
import useVoiceChat from '../hooks/useVoiceChat';

/**
 * Button component for toggling screen sharing
 */
const ScreenShareButton = ({ size = 'md', ...props }) => {
  const { 
    isScreenSharing, 
    toggleScreenShare, 
    isJoined,
    joinChannel
  } = useVoiceChat();
  
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const toast = useToast();

  // Listen for player instantiated event
  useEffect(() => {
    const handlePlayerInstantiated = () => {
      console.log('ScreenShareButton: Player instantiated');
      setIsPlayerReady(true);
    };

    // Check if player is already instantiated
    if (window.isPlayerInstantiated) {
      console.log('ScreenShareButton: Player already instantiated');
      setIsPlayerReady(true);
    }

    // Listen for future instantiations
    window.addEventListener('PlayerInstantiated', handlePlayerInstantiated);

    return () => {
      window.removeEventListener('PlayerInstantiated', handlePlayerInstantiated);
    };
  }, []);

  const handleScreenShare = async () => {
    try {
      // Check if joined to voice chat
      if (!isJoined) {
        toast({
          title: 'Not connected to voice chat',
          description: 'You need to join voice chat before sharing your screen',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Toggle screen sharing
      const result = await toggleScreenShare();
      
      // Show toast based on result
      if (result) {
        toast({
          title: 'Screen sharing started',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else if (isScreenSharing) {
        toast({
          title: 'Screen sharing stopped',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      
      // If the error is because the client is already connected, try again
      if (error.message && (
        error.message.includes("already in connecting/connected state") ||
        error.message.includes("INVALID_OPERATION")
      )) {
        console.log("ScreenShareButton: Client already connected, trying again");
        try {
          const result = await toggleScreenShare();
          
          // Show toast based on result
          if (result) {
            toast({
              title: 'Screen sharing started',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          } else if (isScreenSharing) {
            toast({
              title: 'Screen sharing stopped',
              status: 'info',
              duration: 3000,
              isClosable: true,
            });
          }
        } catch (retryError) {
          console.error('Error toggling screen share on retry:', retryError);
          toast({
            title: 'Screen sharing error',
            description: retryError.message || 'Failed to toggle screen sharing',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        toast({
          title: 'Screen sharing error',
          description: error.message || 'Failed to toggle screen sharing',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  // Don't render if player is not ready
  if (!isPlayerReady) {
    return null;
  }

  return (
    <Button
      onClick={handleScreenShare}
      colorScheme={isScreenSharing ? 'red' : 'blue'}
      size={size}
      leftIcon={<Icon as={FaDesktop} />}
      isLoading={isJoining}
      loadingText="Connecting..."
      {...props}
    >
      {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
    </Button>
  );
};

export default ScreenShareButton; 