import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip, Box, Spinner, Avatar } from "@chakra-ui/react";
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import useVoiceChat from '../hooks/useVoiceChat';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Button component to toggle voice chat on/off
 */
const VoiceButton = ({ 
  size = "md", 
  tooltipPlacement = "top",
  defaultMuted = true,
  joinOnClick = true,
  className = 'voice-button'
}) => {
  const { 
    isVoiceEnabled, 
    toggleVoice, 
    isJoined, 
    joinChannel,
    channel,
    client,
    voiceDisabled
  } = useVoiceChat();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  // Listen for player instantiated event
  useEffect(() => {
    const handlePlayerInstantiated = () => {
      Logger.log("VoiceButton: Player instantiated, showing button");
      setIsPlayerReady(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    
    if (window.isPlayerInstantiated) {
      Logger.log("VoiceButton: Player was already instantiated");
      setIsPlayerReady(true);
    }

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);
  
  // Log state on mount and when it changes
  useEffect(() => {
    
  }, [isVoiceEnabled, isJoined, channel, client, isPlayerReady, voiceDisabled]);
  
  // Handle button click
  const handleClick = async () => {
    if (isLoading || voiceDisabled) return;
    
    setIsLoading(true);
    
    
    try {
      // Make sure we're joined to the channel
      if (!isJoined && joinOnClick) {
        try {
          
          await joinChannel();
          
        } catch (err) {
          // Ignore "already connected" errors
          if (err.message && err.message.includes("already in connecting/connected state")) {
            
          } else {
            console.error("VoiceButton: Error joining channel:", err);
          }
        }
      }
      
      // Toggle voice
      
      const newState = await toggleVoice();
      
      
    } catch (err) {
      console.error("VoiceButton: Error toggling voice:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get tooltip text
  const getTooltipText = () => {
    if (voiceDisabled) {
      return "Voice chat is disabled for this space";
    }
    
    if (!isPlayerReady) {
      return "Waiting for player to be ready...";
    }
    
    if (isLoading) {
      return "Processing...";
    }
    
    if (!isJoined) {
      return "Connecting to voice chat...";
    }
    
    return isVoiceEnabled ? "Turn microphone off" : "Turn microphone on";
  };
  
  // If player is not ready or voice is disabled, don't render the button
  if (!isPlayerReady || voiceDisabled) {
    return null;
  }
  
  return (
    <Tooltip 
      label={getTooltipText()} 
      placement={tooltipPlacement}
      hasArrow
    >
      <Box
        position="relative"
        cursor="pointer"
        onClick={handleClick}
      >
        <Avatar
          size={size}
          borderRadius="full"
          bg={isVoiceEnabled ? "green.500" : "red.500"}
          icon={isVoiceEnabled ? <FaMicrophone color="white" /> : <FaMicrophoneSlash color="white" />}
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          className={className}
          data-testid="voice-button"
        />
        
        {isLoading && (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="rgba(0, 0, 0, 0.6)"
            borderRadius="full"
          >
            <Spinner size="sm" color="white" />
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

export default VoiceButton; 