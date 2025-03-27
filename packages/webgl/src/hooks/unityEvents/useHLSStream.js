import { useState, useEffect, useCallback } from "react";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useSendUnityEvent } from "./core/useSendUnityEvent";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { updateSpaceHLSStream, getSpaceHLSStream } from "@disruptive-spaces/shared/firebase/spacesFirestore";
import { useUnity } from "../../providers/UnityProvider";

/**
 * Hook to handle HLS streaming integration with Unity
 * @returns {Object} - HLS streaming functionality
 */
export const useHLSStream = () => {
  const [playerStatus, setPlayerStatus] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [savedStreamData, setSavedStreamData] = useState(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const sendUnityEvent = useSendUnityEvent();
  const listenToUnityMessage = useListenForUnityEvent();
  const { spaceID, sendMessage, isLoaded } = useUnity();

  // Send stream URL to Unity
  const sendStreamToUnity = useCallback((streamUrl, playerIndex) => {
    if (!streamUrl) return;
    
    Logger.log(`useHLSStream: Sending stream URL to Unity: ${streamUrl} for player ${playerIndex}`);
    
    // Create the data object for Unity - match the exact property names Unity expects
    const unityData = {
      identifier: "LiveProjector", // Fixed identifier in Unity
      playerIndex: playerIndex.toString(),
      streamUrl: streamUrl
    };
    
    // OLD APPROACH: Standard event approach
    sendUnityEvent("SetHLSStream", unityData);
    
    // DIRECT APPROACH: Try sending directly to Unity objects
    if (isLoaded && sendMessage) {
      try {
        // React incoming event handler approach
        Logger.log(`useHLSStream: Sending with ReactIncomingEvent approach`);
        sendMessage("ReactIncomingEvent", "HandleEvent", JSON.stringify({ 
          eventName: "SetHLSStream", 
          data: JSON.stringify(unityData)
        }));
        
        // Direct HLSStream approach (most likely to work)
        Logger.log(`useHLSStream: Sending with direct HLSStream approach`);
        sendMessage("HLSStream", "SetHLSStream", JSON.stringify({
          identifier: "LiveProjector",
          playerIndex: playerIndex.toString(),
          streamUrl: streamUrl
        }));
        
        // Also try direct HLS set method (fallback)
        Logger.log(`useHLSStream: Sending with most direct approach possible`);
        sendMessage("LiveProjector", "SetStreamUrl", streamUrl);
        
        // Also try with hardcoded index
        sendMessage("HLSStreamClient", "SetStreamUrl", JSON.stringify({
          Index: playerIndex.toString(),
          Url: streamUrl
        }));
      } catch (error) {
        Logger.error(`useHLSStream: Error with direct message:`, error);
      }
    } else {
      Logger.warn(`useHLSStream: Unity not loaded, could not send direct message`);
    }
  }, [sendUnityEvent, sendMessage, isLoaded]);

  // Load existing HLS stream from Firebase when the hook initializes
  useEffect(() => {
    if (spaceID) {
      loadStreamFromFirebase(spaceID);
    }
  }, [spaceID]);

  // Function to load the stream URL from Firebase
  const loadStreamFromFirebase = async (spaceId) => {
    try {
      if (!spaceId) {
        Logger.warn("useHLSStream: Cannot load stream from Firebase - no spaceID");
        return;
      }
      
      setIsLoading(true);
      Logger.log(`useHLSStream: Loading stream from Firebase for space ${spaceId}`);
      
      const streamData = await getSpaceHLSStream(spaceId);
      
      if (streamData && streamData.streamUrl) {
        Logger.log(`useHLSStream: Loaded stream data from Firebase for space ${spaceId}`, streamData);
        
        // Store the saved stream data
        setSavedStreamData(streamData);
        
        // Always send to Unity if there's a stream URL, regardless of enabled state
        if (isLoaded) {
          // Send to Unity - add a small delay to ensure Unity is ready
          Logger.log(`useHLSStream: Unity is loaded, sending stream URL to Unity after delay`);
          setTimeout(() => {
            sendStreamToUnity(streamData.streamUrl, streamData.playerIndex || "0");
          }, 500);
          
          // Send again after a longer delay as a backup
          setTimeout(() => {
            Logger.log(`useHLSStream: Sending backup stream URL to Unity after longer delay`);
            sendStreamToUnity(streamData.streamUrl, streamData.playerIndex || "0");
          }, 2000);
        } else {
          Logger.warn(`useHLSStream: Unity is not loaded yet, will try again later`);
          
          // Set up an interval to check and send when Unity is loaded
          const checkInterval = setInterval(() => {
            if (isLoaded) {
              Logger.log(`useHLSStream: Unity is now loaded, sending stream URL to Unity`);
              sendStreamToUnity(streamData.streamUrl, streamData.playerIndex || "0");
              clearInterval(checkInterval);
            }
          }, 1000);
          
          // Clear the interval after 30 seconds to avoid memory leaks
          setTimeout(() => {
            clearInterval(checkInterval);
          }, 30000);
        }
      } else {
        Logger.log(`useHLSStream: No saved stream found for space ${spaceId}`);
        setSavedStreamData(null);
      }
    } catch (error) {
      Logger.error(`useHLSStream: Error loading stream from Firebase for space ${spaceId}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Force reload the stream data from Firebase and resend to Unity
  const reloadStreamData = useCallback(async () => {
    if (spaceID) {
      Logger.log(`useHLSStream: Forcing reload of stream data for space ${spaceID}`);
      setLoadAttempts(attempts => attempts + 1);
      await loadStreamFromFirebase(spaceID);
    }
  }, [spaceID]);

  // Function to set HLS stream URL and save to Firebase
  const setHLSStreamUrl = useCallback(async (streamUrl, playerIndex = 0, options = {}) => {
    try {
      if (!streamUrl || !streamUrl.trim()) {
        Logger.error("useHLSStream: Invalid stream URL");
        return;
      }
      
      setIsLoading(true);
      Logger.log(`useHLSStream: Setting HLS stream URL for LiveProjector[${playerIndex}]`, streamUrl);
      
      // Default options
      const { 
        enabled = true, 
        rtmpUrl = '', 
        streamKey = '',
        skipSendToUnity = false
      } = options;
      
      // Send to Unity immediately if not skipped, regardless of enabled state
      if (!skipSendToUnity) {
        sendStreamToUnity(streamUrl, playerIndex);
      }
      
      // Save to Firebase if spaceID is available
      if (spaceID) {
        try {
          // Prepare data for Firebase
          const firebaseData = {
            streamUrl,
            playerIndex: playerIndex.toString(),
            enabled,
            rtmpUrl,
            streamKey,
            updatedAt: new Date().toISOString()
          };
          
          Logger.log(`useHLSStream: Saving stream URL to Firebase for space ${spaceID}`, firebaseData);
          await updateSpaceHLSStream(spaceID, firebaseData);
          
          // Update saved stream data
          setSavedStreamData(firebaseData);
        } catch (error) {
          Logger.error(`useHLSStream: Error saving stream URL to Firebase for space ${spaceID}`, error);
          throw error;
        }
      } else {
        Logger.warn("useHLSStream: No spaceID available, stream URL not saved to Firebase");
      }
    } finally {
      setIsLoading(false);
    }
  }, [sendStreamToUnity, spaceID]);

  // Listen for player status updates from Unity
  useEffect(() => {
    const handlePlayerStatusUpdate = (data) => {
      if (!data) return;
      
      try {
        Logger.log("useHLSStream: Received player status update", data);
        
        const { identifier, playerIndex, isReady, isPlaying } = data;
        
        // Create a unique key using identifier and playerIndex
        const key = `${identifier}_${playerIndex}`;
        
        setPlayerStatus(prev => ({
          ...prev,
          [key]: { identifier, playerIndex, isReady, isPlaying }
        }));
      } catch (error) {
        Logger.error("useHLSStream: Error handling player status update", error);
      }
    };

    // Register listener for the "SetHLSStream" event (status updates from Unity)
    const unsubscribe = listenToUnityMessage("SetHLSStream", handlePlayerStatusUpdate);

    // Clean up listener on component unmount
    return () => {
      unsubscribe();
    };
  }, [listenToUnityMessage]);

  // If no data has been loaded yet, manually load it on first render
  useEffect(() => {
    // Always try resending if we have saved data
    if (savedStreamData && savedStreamData.streamUrl) {
      Logger.log("useHLSStream: Resending saved stream URL to Unity");
      
      // Add a delay to ensure Unity is ready
      const timer = setTimeout(() => {
        sendStreamToUnity(savedStreamData.streamUrl, savedStreamData.playerIndex || "0");
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [savedStreamData, playerStatus, sendStreamToUnity, loadAttempts]);

  // Listen for stream update events from other components
  useEffect(() => {
    const handleStreamUpdate = (event) => {
      if (event.detail) {
        Logger.log("useHLSStream: Received stream update event", event.detail);
        
        // Check if this event is for our space
        if (spaceID === event.detail.spaceId) {
          Logger.log(`useHLSStream: Stream update is for our space ${spaceID}, loading stream data`);
          loadStreamFromFirebase(spaceID);
        } else if (event.detail.streamUrl) {
          // Try to use the URL directly from the event if it has one
          Logger.log(`useHLSStream: Using stream URL directly from event: ${event.detail.streamUrl}`);
          const playerIndex = event.detail.playerIndex || "0";
          sendStreamToUnity(event.detail.streamUrl, playerIndex);
          
          // Update local state with the received data
          setSavedStreamData(event.detail);
        }
      }
    };

    // Listen to both event names for compatibility
    window.addEventListener("SpaceHLSStreamUpdated", handleStreamUpdate);
    window.addEventListener("SpaceStreamUpdated", handleStreamUpdate);

    return () => {
      window.removeEventListener("SpaceHLSStreamUpdated", handleStreamUpdate);
      window.removeEventListener("SpaceStreamUpdated", handleStreamUpdate);
    };
  }, [spaceID, sendStreamToUnity]);

  return {
    setHLSStreamUrl,
    playerStatus,
    isLoading,
    savedStreamData,
    reloadStreamData
  };
}; 