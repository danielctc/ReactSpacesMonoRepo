import { useAgoraContext } from '../providers/AgoraProvider';
import { useEffect, useRef, useCallback, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

/**
 * Hook to access voice chat functionality
 * @returns {Object} Voice chat methods and state
 */
const useVoiceChat = () => {
  const {
    client,
    isVoiceEnabled: contextIsVoiceEnabled,
    isJoined,
    users,
    error,
    microphoneTrack,
    isReady,
    channel,
    appId,
    toggleVoice,
    joinChannel,
    leaveChannel,
    createMicrophoneTrack,
    isScreenSharing: contextIsScreenSharing,
    screenTrack: contextScreenTrack,
    toggleScreenShare: contextToggleScreenShare
  } = useAgoraContext();

  // Use local state to track voice enabled status with fallback to window.agoraClient
  const [localVoiceEnabled, setLocalVoiceEnabled] = useState(
    contextIsVoiceEnabled !== undefined ? contextIsVoiceEnabled : 
    (window.agoraClient?.isVoiceEnabled || false)
  );
  
  // Use local state to track screen sharing status
  const [localScreenSharing, setLocalScreenSharing] = useState(
    contextIsScreenSharing !== undefined ? contextIsScreenSharing : 
    (window.agoraClient?.isScreenSharing || false)
  );
  
  const [isLoading, setIsLoading] = useState(true);

  // Update local state when context state changes
  useEffect(() => {
    if (contextIsVoiceEnabled !== undefined) {
      setLocalVoiceEnabled(contextIsVoiceEnabled);
    } else if (window.agoraClient?.isVoiceEnabled !== undefined) {
      setLocalVoiceEnabled(window.agoraClient.isVoiceEnabled);
    } else if (microphoneTrack) {
      setLocalVoiceEnabled(!microphoneTrack.muted);
    }
  }, [contextIsVoiceEnabled, microphoneTrack]);
  
  // Update local screen sharing state when context state changes
  useEffect(() => {
    if (contextIsScreenSharing !== undefined) {
      setLocalScreenSharing(contextIsScreenSharing);
    } else if (window.agoraClient?.isScreenSharing !== undefined) {
      setLocalScreenSharing(window.agoraClient.isScreenSharing);
    }
  }, [contextIsScreenSharing]);

  // Use ref to avoid render loops
  const contextRef = useRef({ 
    isVoiceEnabled: localVoiceEnabled,
    isScreenSharing: localScreenSharing,
    isJoined, 
    users, 
    error, 
    isReady,
    channel,
    appId
  });
  
  // Update ref values
  useEffect(() => {
    contextRef.current = { 
      isVoiceEnabled: localVoiceEnabled,
      isScreenSharing: localScreenSharing,
      isJoined, 
      users, 
      error, 
      isReady,
      channel,
      appId
    };
  }, [localVoiceEnabled, localScreenSharing, isJoined, users, error, isReady, channel, appId]);

  // Set a timeout to stop showing loading state after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Update loading state based on isReady
  useEffect(() => {
    if (isReady) {
      setIsLoading(false);
    }
  }, [isReady]);

  // Log the context for debugging (in useEffect to avoid render issues)
  useEffect(() => {
    console.log("useVoiceChat context:", { 
      contextIsVoiceEnabled, 
      localVoiceEnabled,
      contextIsScreenSharing,
      localScreenSharing,
      isJoined, 
      users: users.length, 
      error, 
      isReady,
      channel,
      appId,
      hasMicrophoneTrack: !!microphoneTrack,
      trackMuted: microphoneTrack?.muted,
      hasScreenTrack: !!contextScreenTrack
    });
  }, [
    contextIsVoiceEnabled, 
    localVoiceEnabled, 
    contextIsScreenSharing,
    localScreenSharing,
    isJoined, 
    users, 
    error, 
    isReady, 
    channel, 
    appId, 
    microphoneTrack,
    contextScreenTrack
  ]);

  // Custom toggleVoice function that updates local state
  const handleToggleVoice = async () => {
    try {
      console.log("useVoiceChat: Toggling voice from:", localVoiceEnabled);
      const newState = await toggleVoice();
      console.log("useVoiceChat: Toggle result:", newState);
      
      // Update local state if newState is defined
      if (newState !== undefined) {
        setLocalVoiceEnabled(newState);
      } else {
        // If newState is undefined, toggle the local state
        const newLocalState = !localVoiceEnabled;
        setLocalVoiceEnabled(newLocalState);
        
        // Update window.agoraClient
        if (window.agoraClient) {
          window.agoraClient.isVoiceEnabled = newLocalState;
        }
      }
      
      return newState !== undefined ? newState : !localVoiceEnabled;
    } catch (error) {
      console.error("useVoiceChat: Error toggling voice:", error);
      return localVoiceEnabled;
    }
  };
  
  // Custom toggleScreenShare function that updates local state
  const handleToggleScreenShare = async () => {
    try {
      console.log("useVoiceChat: Toggling screen share from:", localScreenSharing);
      const newState = await contextToggleScreenShare();
      console.log("useVoiceChat: Screen share toggle result:", newState);
      
      // Update local state if newState is defined
      if (newState !== undefined) {
        setLocalScreenSharing(newState);
      } else {
        // If newState is undefined, toggle the local state
        const newLocalState = !localScreenSharing;
        setLocalScreenSharing(newLocalState);
        
        // Update window.agoraClient
        if (window.agoraClient) {
          window.agoraClient.isScreenSharing = newLocalState;
        }
      }
      
      return newState !== undefined ? newState : !localScreenSharing;
    } catch (error) {
      console.error("useVoiceChat: Error toggling screen share:", error);
      return localScreenSharing;
    }
  };

  /**
   * Mute the microphone
   */
  const mute = async () => {
    if (localVoiceEnabled && microphoneTrack) {
      await handleToggleVoice();
    }
  };

  /**
   * Unmute the microphone
   */
  const unmute = async () => {
    if (!localVoiceEnabled && microphoneTrack) {
      await handleToggleVoice();
    }
  };

  /**
   * Check if a specific user is speaking
   * @param {string} uid User ID to check
   * @returns {boolean} True if the user is speaking
   */
  const isUserSpeaking = (uid) => {
    return users.some(user => user.uid === uid && user.audioTrack?.isPlaying);
  };

  /**
   * Get the volume level of the local microphone
   * @returns {number} Volume level (0-1)
   */
  const getVolumeLevel = useCallback(() => {
    if (!microphoneTrack || !localVoiceEnabled) return 0;
    
    try {
      return microphoneTrack.getVolumeLevel();
    } catch (err) {
      console.error("Error getting volume level:", err);
      return 0;
    }
  }, [microphoneTrack, localVoiceEnabled]);
  
  /**
   * Change the microphone device
   * @param {string} deviceId The ID of the microphone device to use
   * @returns {Promise<void>}
   */
  const setMicrophoneDevice = async (deviceId) => {
    try {
      if (!deviceId) {
        console.error('No device ID provided');
        return;
      }
      
      // Check if we have a valid client and are joined to a channel
      if (!client || !isJoined) {
        console.error('Client not initialized or not joined to a channel');
        return;
      }
      
      // If we have an existing microphone track, close it
      if (microphoneTrack) {
        // If voice is enabled, unpublish the track first
        if (localVoiceEnabled) {
          await client.unpublish(microphoneTrack);
        }
        
        // Close the track
        await microphoneTrack.close();
      }
      
      // Create a new microphone track with the specified device
      const newMicrophoneTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: deviceId,
        encoderConfig: "music_standard"
      });
      
      // If createMicrophoneTrack is available, use it to update the track in the context
      if (createMicrophoneTrack) {
        await createMicrophoneTrack(newMicrophoneTrack);
      }
      
      // If voice is enabled, publish the new track
      if (localVoiceEnabled) {
        await client.publish(newMicrophoneTrack);
      }
      
      console.log('Microphone device changed successfully');
    } catch (error) {
      console.error('Error changing microphone device:', error);
      throw error;
    }
  };

  return {
    isVoiceEnabled: localVoiceEnabled,
    isScreenSharing: localScreenSharing,
    isJoined,
    users,
    error,
    toggleVoice: handleToggleVoice,
    toggleScreenShare: handleToggleScreenShare,
    mute,
    unmute,
    isUserSpeaking,
    getVolumeLevel,
    microphoneTrack,
    screenTrack: contextScreenTrack,
    isLoading,
    channel,
    appId,
    joinChannel,
    leaveChannel,
    client,
    setMicrophoneDevice
  };
};

export default useVoiceChat; 