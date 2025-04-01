import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AgoraRTC from "agora-rtc-sdk-ng";
import PropTypes from 'prop-types';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { useToast } from '@chakra-ui/react';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

// Get Agora App ID from environment variable
const DEFAULT_AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || "";

// Create a static client instance to be shared across all AgoraProvider instances
const staticClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
let staticClientInitialized = false;
let staticClientChannel = null;
let staticClientConnecting = false;

export const AgoraContext = createContext(null);

/**
 * Provider component for Agora voice chat functionality
 */
export const AgoraProvider = ({ 
  children, 
  appId = DEFAULT_AGORA_APP_ID,
  channel = null,
  token = null,
  uid = null,
  enabled = true,
  startMuted = true,
  onClientReady = () => {}
}) => {
  // State
  const [isJoined, setIsJoined] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [microphoneTrack, setMicrophoneTrack] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrack, setScreenTrack] = useState(null);
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  
  const toast = useToast();
  
  // Refs
  const clientRef = useRef(staticClient);
  const propsRef = useRef({ appId, channel, uid, enabled });
  const initializingRef = useRef(false);
  const joinedChannelRef = useRef(null);
  const microphoneTrackRef = useRef(null);
  
  // Update ref values
  useEffect(() => {
    propsRef.current = { appId, channel, uid, enabled };
  }, [appId, channel, uid, enabled]);
  
  // Update current channel
  useEffect(() => {
    setCurrentChannel(channel);
  }, [channel]);
  
  // Monitor connection state changes
  useEffect(() => {
    if (!clientRef.current) return;
    
    const handleConnectionStateChange = (state) => {
      Logger.log(`Connection state changed to: ${state}`);
      
      if (state === 'DISCONNECTED') {
        setIsJoined(false);
        Logger.log('Disconnected from Agora');
      } else if (state === 'CONNECTED') {
        setIsJoined(true);
        setError(null);
      }
    };
    
    // Add connection state change listener
    clientRef.current.on('connection-state-change', handleConnectionStateChange);
    
    return () => {
      // Remove listener on cleanup
      clientRef.current.off('connection-state-change', handleConnectionStateChange);
    };
  }, []);
  
  // Set up event handlers and initialization
  useEffect(() => {
    if (!channel || !enabled) {
      return;
    }
    
    // Set up event handlers for remote users
    const handleUserPublished = async (user, mediaType) => {
      Logger.log(`User published: ${user.uid}, mediaType: ${mediaType}`);
      
      try {
        // Subscribe to the user's media
        await clientRef.current.subscribe(user, mediaType);
        
        // If it's audio, play it
        if (mediaType === 'audio') {
          user.audioTrack.play();
        }
        
        // Add user to the list if not already there
        setUsers(prevUsers => {
          if (!prevUsers.some(u => u.uid === user.uid)) {
            return [...prevUsers, user];
          }
          return prevUsers;
        });
      } catch (error) {
        Logger.error("Error subscribing to user:", error);
      }
    };
    
    const handleUserUnpublished = (user, mediaType) => {
      Logger.log(`User unpublished: ${user.uid}, mediaType: ${mediaType}`);
      
      // If it's audio, stop it
      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.stop();
      }
    };
    
    const handleUserJoined = (user) => {
      Logger.log(`User joined: ${user.uid}`);
      
      // Add user to the list if not already there
      setUsers(prevUsers => {
        if (!prevUsers.some(u => u.uid === user.uid)) {
          return [...prevUsers, user];
        }
        return prevUsers;
      });
    };
    
    const handleUserLeft = (user) => {
      Logger.log(`User left: ${user.uid}`);
      setUsers(prevUsers => prevUsers.filter(u => u.uid !== user.uid));
    };
    
    // Add event listeners
    clientRef.current.on("user-published", handleUserPublished);
    clientRef.current.on("user-unpublished", handleUserUnpublished);
    clientRef.current.on("user-joined", handleUserJoined);
    clientRef.current.on("user-left", handleUserLeft);
    
    // Set up a single initialization function
    const initialize = async () => {
      if (initializingRef.current) {
        Logger.log("Already initializing, skipping duplicate initialization");
        return;
      }
      
      initializingRef.current = true;
      
      try {
        // Don't initialize microphone here - we'll do it when the user clicks the mic button
        // Instead, just join the channel without microphone
        
        // Check if already connected to this channel
        if (isJoined && joinedChannelRef.current === channel) {
          Logger.log(`Already joined to channel ${channel}`);
          setIsReady(true);
          onClientReady(clientRef.current);
          return;
        }
        
        // Check if client is already connecting or connected
        if (clientRef.current.connectionState === 'CONNECTING' || clientRef.current.connectionState === 'CONNECTED') {
          
          // If connected to a different channel, leave it first
          if (joinedChannelRef.current && joinedChannelRef.current !== channel) {
            Logger.log("Connected to different channel, leaving first");
            try {
              await leaveChannel();
            } catch (err) {
              Logger.error("Error leaving channel:", err);
            }
          } else {
            // Already connected to this channel or connecting
            setIsJoined(true);
            setIsReady(true);
            joinedChannelRef.current = channel;
            staticClientChannel = channel;
            onClientReady(clientRef.current);
            return;
          }
        }
        
        // Join channel if not already joined
        Logger.log(`Joining channel ${channel}`);
        await joinChannel();
        Logger.log("Join channel completed");
      } catch (err) {
        Logger.error("Error during initialization:", err);
      } finally {
        initializingRef.current = false;
      }
    };
    
    // Run initialization
    initialize();
    
    // Clean up event listeners on unmount or when channel changes
    return () => {
      Logger.log("Cleaning up event listeners");
      clientRef.current.off("user-published", handleUserPublished);
      clientRef.current.off("user-unpublished", handleUserUnpublished);
      clientRef.current.off("user-joined", handleUserJoined);
      clientRef.current.off("user-left", handleUserLeft);
    };
  }, [channel, enabled, uid, onClientReady, isJoined]);
  
  /**
   * Initialize the microphone
   * @returns {Promise<IAgoraRTCRemoteUser>} The microphone track
   */
  const initMicrophone = async () => {
    if (!enabled || microphoneTrack) {
      return microphoneTrack;
    }
    
    Logger.log("Initializing microphone");
    try {
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      
      // Set initial mute state
      await audioTrack.setMuted(startMuted);
      
      setMicrophoneTrack(audioTrack);
      Logger.log("Microphone initialized successfully");
      
      return audioTrack;
    } catch (error) {
      Logger.error("Error initializing microphone:", error);
      setError("Failed to initialize microphone. Please check your permissions.");
      return null;
    }
  };
  
  // Check if voice is disabled for the space
  useEffect(() => {
    const checkVoiceDisabled = async () => {
      if (channel) {
        try {
          // Extract space ID from channel name (assuming channel name is the space ID)
          const spaceID = channel;
          
          // Get space data
          const spaceData = await getSpaceItem(spaceID);
          
          if (spaceData && spaceData.voiceDisabled) {
            Logger.log("Voice is disabled for this space");
            setVoiceDisabled(true);
            
            // If already joined, leave the channel
            if (isJoined) {
              await leaveChannel();
            }
          } else {
            setVoiceDisabled(false);
          }
        } catch (error) {
          Logger.error("Error checking if voice is disabled:", error);
        }
      }
    };
    
    checkVoiceDisabled();
    
    // Listen for voice setting changes
    const handleVoiceSettingChanged = (event) => {
      if (event.detail && typeof event.detail.voiceDisabled === 'boolean') {
        Logger.log("Voice setting changed:", event.detail.voiceDisabled);
        setVoiceDisabled(event.detail.voiceDisabled);
        
        // If voice is now disabled and we're joined, leave the channel
        if (event.detail.voiceDisabled && isJoined) {
          leaveChannel();
        } else if (!event.detail.voiceDisabled && !isJoined && enabled && channel) {
          // If voice is now enabled and we're not joined, join the channel
          joinChannel();
        }
      }
    };
    
    window.addEventListener("SpaceVoiceSettingChanged", handleVoiceSettingChanged);
    
    return () => {
      window.removeEventListener("SpaceVoiceSettingChanged", handleVoiceSettingChanged);
    };
  }, [channel, isJoined, enabled]);
  
  /**
   * Join the channel
   * @returns {Promise<void>}
   */
  const joinChannel = async () => {
    if (!enabled) {
      Logger.log("Agora is disabled, not joining channel");
      return false;
    }
    
    if (voiceDisabled) {
      Logger.log("Voice is disabled for this space, not joining channel");
      setError("Voice chat is disabled for this space");
      return false;
    }
    
    if (!channel) {
      Logger.error("AgoraProvider: No channel specified");
      setError("No channel specified");
      return false;
    }
    
    Logger.log(`joinChannel called for channel ${channel} with UID ${uid}`);
    Logger.log(`Current state:`, { 
      isJoined, 
      isJoining, 
      connectionState: clientRef.current.connectionState,
      joinedChannel: joinedChannelRef.current
    });
    
    // If already joined to this channel, just return success
    if (isJoined && joinedChannelRef.current === channel) {
      Logger.log(`Already joined to channel: ${channel}`);
      return true;
    }
    
    // If already joining, don't try to join again
    if (isJoining) {
      Logger.log("AgoraProvider: Already in the process of joining");
      return false;
    }
    
    // Check if client is already connected
    if (clientRef.current.connectionState === 'CONNECTED') {
      // If connected to a different channel, leave it first
      if (joinedChannelRef.current && joinedChannelRef.current !== channel) {
        Logger.log("Connected to different channel, leaving first");
        try {
          await leaveChannel();
        } catch (err) {
          Logger.error("Error leaving channel:", err);
        }
      } else {
        // Already connected to this channel
        Logger.log("Client already connected, setting joined state to true");
        setIsJoined(true);
        setIsReady(true);
        joinedChannelRef.current = channel;
        staticClientChannel = channel;
        onClientReady(clientRef.current);
        return true;
      }
    }
    
    // Check if client is already connecting
    if (clientRef.current.connectionState === 'CONNECTING') {
      Logger.log("Client already connecting, waiting for connection");
      setIsJoining(true);
      
      // Wait for connection to complete
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (clientRef.current.connectionState === 'CONNECTED') {
            clearInterval(checkConnection);
            setIsJoined(true);
            setIsJoining(false);
            setIsReady(true);
            joinedChannelRef.current = channel;
            staticClientChannel = channel;
            onClientReady(clientRef.current);
            resolve(true);
          }
        }, 500);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkConnection);
          Logger.log("AgoraProvider: Connection timeout, considering join failed");
          setIsJoining(false);
          resolve(false);
        }, 10000);
      });
    }
    
    try {
      Logger.log(`Joining channel: ${channel} with UID: ${uid || "random"}`);
      Logger.log(`Using appId: ${appId}, Type: ${typeof appId}, Length: ${appId.length}`);
      
      // Validate appId
      if (!appId || appId.trim() === "") {
        const errorMsg = "AgoraProvider: App ID is empty or invalid";
        Logger.error(errorMsg);
        setError(errorMsg);
        setIsJoining(false);
        return false;
      }
      
      setIsJoining(true);
      
      // Join the channel
      const uidToUse = uid || Math.floor(Math.random() * 1000000);
      await clientRef.current.join(appId, channel, token, uidToUse);
      Logger.log(`Joined channel successfully with UID: ${clientRef.current.uid}`);
      
      // Don't initialize microphone here - we'll do it when the user clicks the mic button
      
      // Update state
      setIsJoined(true);
      setIsJoining(false);
      setIsReady(true);
      joinedChannelRef.current = channel;
      staticClientChannel = channel;
      onClientReady(clientRef.current);
      
      return true;
    } catch (err) {
      Logger.error("Error joining channel:", err);
      setError(`Error joining channel: ${err.toString()}`);
      setIsJoining(false);
      return false;
    }
  };
  
  // Leave channel
  const leaveChannel = async () => {
    if (!isJoined) return;
    
    try {
      if (microphoneTrack) {
        await clientRef.current.unpublish(microphoneTrack);
      }
      
      await clientRef.current.leave();
      staticClientChannel = null;
      joinedChannelRef.current = null;
      
      Logger.log("Left channel successfully");
      setIsJoined(false);
      setUsers([]);
    } catch (error) {
      Logger.error("Error leaving channel:", error);
      setError(error.message || "Failed to leave channel");
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (microphoneTrack) {
        microphoneTrack.close();
      }
    };
  }, []);
  
  // Join channel when enabled and channel changes
  useEffect(() => {
    if (enabled && channel && (!isJoined || joinedChannelRef.current !== channel)) {
      // Don't initialize microphone here - we'll do it when the user clicks the mic button
      joinChannel();
    }
  }, [enabled, channel, isJoined]);
  
  // Add a function to check the actual microphone status from Agora
  const getMicrophoneStatus = () => {
    if (!microphoneTrack) return false;
    
    try {
      // Check if the track exists and is not muted
      return microphoneTrack.isActive && !microphoneTrack.muted;
    } catch (err) {
      Logger.error("Error checking microphone status:", err);
      return false;
    }
  };
  
  // Add an effect to sync the voice enabled state with the actual microphone status
  useEffect(() => {
    // Function to sync the state with the actual microphone status
    const syncMicrophoneState = () => {
      const actualStatus = getMicrophoneStatus();
      
      // Only update if there's a mismatch
      if (actualStatus !== isVoiceEnabled) {
        Logger.log("Syncing microphone state:", { actualStatus, currentState: isVoiceEnabled });
        setIsVoiceEnabled(actualStatus);
        
        // Dispatch an event to notify other components
        window.dispatchEvent(new CustomEvent("VoiceToggled", {
          detail: { enabled: actualStatus }
        }));
        
        // Update the window.agoraClient object
        if (window.agoraClient) {
          window.agoraClient.isVoiceEnabled = actualStatus;
          window.agoraClient.microphoneTrack = microphoneTrack;
        }
      }
    };
    
    // Sync immediately
    if (microphoneTrack) {
      syncMicrophoneState();
    }
    
    // Set up interval to periodically sync the state
    const intervalId = setInterval(syncMicrophoneState, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [microphoneTrack, isVoiceEnabled]);
  
  /**
   * Toggle voice on/off
   * @returns {Promise<boolean>} New voice state
   */
  const toggleVoice = async () => {
    if (voiceDisabled) {
      Logger.log("Voice is disabled for this space, cannot toggle");
      toast({
        title: "Voice Chat Disabled",
        description: "Voice chat has been disabled for this space by the owner.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      return false;
    }
    
    try {
      // Get the current state - either from state or from the microphone track
      const currentState = isVoiceEnabled !== undefined ? isVoiceEnabled : 
        (microphoneTrack ? !microphoneTrack.muted : false);
      
      Logger.log("AgoraProvider: Toggling voice, current state:", { 
        isVoiceEnabled, 
        currentState,
        hasMicTrack: !!microphoneTrack,
        trackMuted: microphoneTrack?.muted
      });
      
      // If we don't have a microphone track, initialize it
      // This is where the browser will prompt for microphone permissions
      if (!microphoneTrack) {
        Logger.log("AgoraProvider: No microphone track, initializing...");
        const track = await initMicrophone();
        if (!track) {
          Logger.error("AgoraProvider: Failed to initialize microphone");
          return currentState;
        }
      }
      
      // Calculate the new state (opposite of current state)
      const newState = !currentState;
      Logger.log("AgoraProvider: New voice state will be:", newState);
      
      // If turning off (currently enabled), mute the track
      if (currentState) {
        if (microphoneTrack) {
          try {
            Logger.log("AgoraProvider: Muting microphone track");
            
            // Force mute the track
            await microphoneTrack.setMuted(true);
            
            // Double-check that it's muted
            if (!microphoneTrack.muted) {
              Logger.warn("AgoraProvider: Track not muted after setMuted(true), trying again");
              await microphoneTrack.setEnabled(false);
            }
            
            Logger.log("AgoraProvider: Microphone track muted successfully, muted state:", microphoneTrack.muted);
          } catch (err) {
            Logger.error("Error muting track:", err);
            return currentState;
          }
        }
      } 
      // If turning on (currently disabled), unmute the track
      else {
        if (microphoneTrack) {
          try {
            // Make sure the track is published
            if (clientRef.current && isJoined && !clientRef.current.localTracks?.includes(microphoneTrack)) {
              Logger.log("AgoraProvider: Publishing microphone track");
              await clientRef.current.publish(microphoneTrack);
              Logger.log("AgoraProvider: Microphone track published successfully");
            }
            
            // Unmute the track
            Logger.log("AgoraProvider: Unmuting microphone track");
            await microphoneTrack.setMuted(false);
            
            // Double-check that it's unmuted
            if (microphoneTrack.muted) {
              Logger.warn("AgoraProvider: Track still muted after setMuted(false), trying again");
              await microphoneTrack.setEnabled(true);
            }
            
            Logger.log("AgoraProvider: Microphone track unmuted successfully, muted state:", microphoneTrack.muted);
          } catch (err) {
            Logger.error("Error unmuting track:", err);
            return currentState;
          }
        }
      }
      
      // Update state
      setIsVoiceEnabled(newState);
      return newState;
    } catch (err) {
      Logger.error("Error toggling voice:", err);
      return isVoiceEnabled;
    }
  };
  
  /**
   * Create a new microphone track and update the state
   * @param {Object} newTrack The new microphone track
   */
  const createMicrophoneTrack = async (newTrack) => {
    try {
      // Set the new microphone track
      setMicrophoneTrack(newTrack);
      
      Logger.log('Microphone track updated successfully');
    } catch (error) {
      Logger.error('Error updating microphone track:', error);
      throw error;
    }
  };
  
  /**
   * Toggle screen sharing
   * @returns {Promise<boolean>} Whether screen sharing is now enabled
   */
  const toggleScreenShare = async () => {
    if (!clientRef.current || !channel) {
      Logger.error('AgoraProvider: Voice chat not connected');
      return false;
    }

    try {
      if (isScreenSharing) {
        // STOP SCREEN SHARING
        Logger.log('AgoraProvider: Stopping screen share');
        if (screenTrack) {
          // Check if screenTrack is an array (contains both video and audio)
          if (Array.isArray(screenTrack)) {
            // Unpublish all tracks in the array
            await clientRef.current.unpublish(screenTrack);
            screenTrack.forEach(track => track.close());
          } else {
            // Unpublish the single track
            await clientRef.current.unpublish(screenTrack);
            screenTrack.close();
          }
          setScreenTrack(null);
        }
        setIsScreenSharing(false);
        Logger.log('AgoraProvider: Screen sharing stopped');
        
        // Update window.agoraClient for other components
        if (typeof window !== 'undefined') {
          if (!window.agoraClient) {
            window.agoraClient = {};
          }
          window.agoraClient.isScreenSharing = false;
          window.agoraClient.screenTrack = null;
          
          // Dispatch an event to notify other components
          window.dispatchEvent(new CustomEvent("ScreenShareToggled", {
            detail: { enabled: false }
          }));
        }
        
        return false;
      } else {
        // START SCREEN SHARING
        Logger.log('AgoraProvider: Starting screen share');
        
        try {
          // Create screen video track with specific encoding parameters
          const screenVideoTrack = await AgoraRTC.createScreenVideoTrack({
            encoderConfig: "1080p_1",     // High quality video
            optimizationMode: "detail"    // Optimize for detail (good for text)
          });
          
          Logger.log('AgoraProvider: Screen track created:', screenVideoTrack);
          
          // Handle when user ends screen sharing through the browser UI
          screenVideoTrack.on('track-ended', () => {
            Logger.log('AgoraProvider: Screen sharing ended by browser UI');
            clientRef.current.unpublish(screenVideoTrack);
            screenVideoTrack.close();
            setScreenTrack(null);
            setIsScreenSharing(false);
            
            // Update window.agoraClient for other components
            if (typeof window !== 'undefined') {
              if (!window.agoraClient) {
                window.agoraClient = {};
              }
              window.agoraClient.isScreenSharing = false;
              window.agoraClient.screenTrack = null;
              
              // Dispatch an event to notify other components
              window.dispatchEvent(new CustomEvent("ScreenShareToggled", {
                detail: { enabled: false }
              }));
            }
          });
          
          // Publish the screen track to the channel
          await clientRef.current.publish(screenVideoTrack);
          setScreenTrack(screenVideoTrack);
          setIsScreenSharing(true);
          Logger.log('AgoraProvider: Screen sharing started');
          
          // Update window.agoraClient for other components
          if (typeof window !== 'undefined') {
            if (!window.agoraClient) {
              window.agoraClient = {};
            }
            window.agoraClient.isScreenSharing = true;
            window.agoraClient.screenTrack = screenVideoTrack;
            
            // Dispatch an event to notify other components
            window.dispatchEvent(new CustomEvent("ScreenShareToggled", {
              detail: { enabled: true }
            }));
          }
          
          return true;
        } catch (screenError) {
          // Handle errors when creating or publishing the screen track
          Logger.error('AgoraProvider: Error creating screen track:', screenError);
          setIsScreenSharing(false);
          setScreenTrack(null);
          return false;
        }
      }
    } catch (error) {
      // Handle any other errors
      Logger.error('AgoraProvider: Error toggling screen share:', error);
      setIsScreenSharing(false);
      setScreenTrack(null);
      return false;
    }
  };
  
  // Initialize window.agoraClient on mount
  useEffect(() => {
    Logger.log("AgoraProvider: Initializing window.agoraClient");
    
    if (typeof window !== 'undefined') {
      window.agoraClient = {
        isVoiceEnabled: false,
        isJoined: false,
        client: clientRef.current,
        isScreenSharing: false,
        screenTrack: null
      };
      
      // Add event listeners for screen sharing
      const handleToggleScreenShare = (event) => {
        Logger.log("AgoraProvider: Received ToggleScreenShare event");
        toggleScreenShare()
          .then(result => {
            if (event.detail && event.detail.callback) {
              event.detail.callback(true, result);
            }
          })
          .catch(error => {
            Logger.error("AgoraProvider: Error handling ToggleScreenShare event:", error);
            if (event.detail && event.detail.callback) {
              event.detail.callback(false, isScreenSharing);
            }
          });
      };
      
      const handleJoinVoiceChat = (event) => {
        Logger.log("AgoraProvider: Received JoinVoiceChat event");
        joinChannel()
          .then(result => {
            if (event.detail && event.detail.callback) {
              event.detail.callback(result);
            }
          })
          .catch(error => {
            Logger.error("AgoraProvider: Error handling JoinVoiceChat event:", error);
            if (event.detail && event.detail.callback) {
              event.detail.callback(false);
            }
          });
      };
      
      window.addEventListener('ToggleScreenShare', handleToggleScreenShare);
      window.addEventListener('JoinVoiceChat', handleJoinVoiceChat);
      
      return () => {
        window.removeEventListener('ToggleScreenShare', handleToggleScreenShare);
        window.removeEventListener('JoinVoiceChat', handleJoinVoiceChat);
        
        // Clean up on unmount
        if (typeof window !== 'undefined' && window.agoraClient) {
          Logger.log("AgoraProvider: Cleaning up window.agoraClient");
          window.agoraClient = null;
        }
      };
    }
    
    return () => {
      // Clean up on unmount
      if (typeof window !== 'undefined' && window.agoraClient) {
        Logger.log("AgoraProvider: Cleaning up window.agoraClient");
        window.agoraClient = null;
      }
    };
  }, []);
  
  // Add an effect to update window.agoraClient when isVoiceEnabled changes
  useEffect(() => {
    Logger.log("AgoraProvider: Voice enabled state changed:", isVoiceEnabled);
    
    // Update window.agoraClient
    if (typeof window !== 'undefined') {
      if (!window.agoraClient) {
        window.agoraClient = {};
      }
      window.agoraClient.isVoiceEnabled = isVoiceEnabled;
      window.agoraClient.microphoneTrack = microphoneTrack;
      window.agoraClient.client = clientRef.current;
      
      // Dispatch an event to notify other components
      window.dispatchEvent(new CustomEvent("VoiceToggled", {
        detail: { enabled: isVoiceEnabled }
      }));
      
      Logger.log("AgoraProvider: Updated window.agoraClient and dispatched event:", { isVoiceEnabled });
    }
  }, [isVoiceEnabled, microphoneTrack]);
  
  // Context value
  const contextValue = {
    client: clientRef.current,
    isJoined,
    isVoiceEnabled,
    users,
    error,
    channel: currentChannel,
    appId,
    toggleVoice,
    leaveChannel,
    joinChannel,
    microphoneTrack,
    isReady,
    createMicrophoneTrack,
    isScreenSharing,
    screenTrack,
    toggleScreenShare,
    voiceDisabled
  };
  
  return (
    <AgoraContext.Provider value={contextValue}>
      {children}
    </AgoraContext.Provider>
  );
};

// Custom hook to use the Agora context
export const useAgoraContext = () => {
  const context = useContext(AgoraContext);
  if (!context) {
    throw new Error("useAgoraContext must be used within an AgoraProvider");
  }
  return context;
};

AgoraProvider.propTypes = {
  children: PropTypes.node.isRequired,
  appId: PropTypes.string.isRequired,
  channel: PropTypes.string.isRequired,
  token: PropTypes.string,
  uid: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default AgoraProvider; 