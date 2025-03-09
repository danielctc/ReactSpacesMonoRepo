import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AgoraRTC from "agora-rtc-sdk-ng";

// Create context
const ScreenShareContext = createContext(null);

/**
 * Provider component for Agora screen sharing functionality
 */
export const ScreenShareProvider = ({ 
  children,
  appId,
  channel,
  uid,
  enabled = false
}) => {
  // State
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenTrack, setScreenTrack] = useState(null);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  
  // Refs
  const clientRef = useRef(null);
  
  // Initialize screen share client
  useEffect(() => {
    if (!enabled) return;
    
    console.log("Initializing screen share client");
    
    // Create a separate client for screen sharing
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;
    setIsReady(true);
    
    return () => {
      // Cleanup
      if (screenTrack) {
        screenTrack.close();
        setScreenTrack(null);
      }
    };
  }, [enabled]);
  
  // Start screen sharing
  const startScreenShare = async () => {
    if (!isReady || !clientRef.current || isScreenSharing) {
      console.log("Cannot start screen sharing:", { 
        isReady, 
        hasClient: !!clientRef.current,
        isScreenSharing
      });
      return;
    }
    
    try {
      console.log("Starting screen share");
      const client = clientRef.current;
      
      // Join channel with a different UID for screen sharing
      const screenShareUid = `${uid}-screen`;
      await client.join(appId, channel, null, screenShareUid);
      
      // Create screen video track
      const screenVideoTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: "1080p_1",
        optimizationMode: "detail"
      });
      
      // Handle screen share stopped by user through browser UI
      screenVideoTrack.on("track-ended", () => {
        stopScreenShare();
      });
      
      // Publish screen track
      await client.publish(screenVideoTrack);
      
      setScreenTrack(screenVideoTrack);
      setIsScreenSharing(true);
      setError(null);
      
      return screenVideoTrack;
    } catch (err) {
      console.error("Error starting screen share:", err);
      setError(err.message || "Failed to start screen sharing");
      setIsScreenSharing(false);
      return null;
    }
  };
  
  // Stop screen sharing
  const stopScreenShare = async () => {
    if (!isScreenSharing || !screenTrack || !clientRef.current) {
      console.log("Cannot stop screen sharing:", { 
        isScreenSharing, 
        hasScreenTrack: !!screenTrack,
        hasClient: !!clientRef.current
      });
      return;
    }
    
    try {
      console.log("Stopping screen share");
      const client = clientRef.current;
      
      // Unpublish and close screen track
      await client.unpublish(screenTrack);
      screenTrack.close();
      
      // Leave channel
      await client.leave();
      
      setScreenTrack(null);
      setIsScreenSharing(false);
      setError(null);
    } catch (err) {
      console.error("Error stopping screen share:", err);
      setError(err.message || "Failed to stop screen sharing");
    }
  };
  
  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      return stopScreenShare();
    } else {
      return startScreenShare();
    }
  };
  
  // Context value
  const value = {
    client: clientRef.current,
    isScreenSharing,
    screenTrack,
    error,
    ready: isReady,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare
  };
  
  return (
    <ScreenShareContext.Provider value={value}>
      {children}
    </ScreenShareContext.Provider>
  );
};

// Custom hook to use the ScreenShare context
export const useScreenShare = () => {
  const context = useContext(ScreenShareContext);
  if (!context) {
    throw new Error("useScreenShare must be used within a ScreenShareProvider");
  }
  return context;
}; 