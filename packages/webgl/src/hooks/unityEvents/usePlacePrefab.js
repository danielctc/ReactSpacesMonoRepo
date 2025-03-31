import { useCallback, useState, useEffect } from 'react';
import { useSendUnityEvent } from './core/useSendUnityEvent';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from '../../providers/UnityProvider';

/**
 * Hook to place prefabs in Unity
 * @returns {Object} Object containing placePrefab function and directPlacePrefab fallback
 */
export const usePlacePrefab = () => {
  const sendUnityEvent = useSendUnityEvent();
  const { isLoaded } = useUnity();
  const [isUnityReady, setIsUnityReady] = useState(false);

  // Listen for Unity readiness
  useEffect(() => {
    // Check if Unity is already ready via window flag
    if (window.isPlayerInstantiated) {
      Logger.log("usePlacePrefab: Unity already ready (via window flag)");
      setIsUnityReady(true);
      return;
    }

    // Otherwise, listen for the PlayerInstantiated event
    const handlePlayerInstantiated = () => {
      Logger.log("usePlacePrefab: Unity is now ready (PlayerInstantiated event)");
      setIsUnityReady(true);
    };

    // Add event listener
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    // Cleanup
    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Standard method using the useSendUnityEvent hook
  const placePrefab = useCallback((prefabName, position, rotation, scale) => {
    // Default values
    const pos = position || { x: 0, y: 1, z: 0 };
    const rot = rotation || { x: 0, y: 0, z: 0 };
    const scl = scale || { x: 1, y: 1, z: 1 };
    
    try {
      // Create prefab data
      const prefabData = {
        prefabName: prefabName || "TestPrefab",
        position: pos,
        rotation: rot,
        scale: scl
      };
      
      Logger.log("Sending prefab placement to Unity:", prefabData);
      
      // Send event to Unity
      sendUnityEvent("PlacePrefab", prefabData);
      
      return true;
    } catch (error) {
      Logger.error("Error placing prefab:", error);
      return false;
    }
  }, [sendUnityEvent]);

  // Fallback method using direct window.unityInstance access
  const directPlacePrefab = useCallback((prefabName, position, rotation, scale) => {
    // Default values
    const pos = position || { x: 0, y: 1, z: 0 };
    const rot = rotation || { x: 0, y: 0, z: 0 };
    const scl = scale || { x: 1, y: 1, z: 1 };
    
    if (!window.unityInstance) {
      Logger.error("Unity not loaded, cannot place prefab directly");
      return false;
    }
    
    try {
      // Create prefab data
      const prefabData = {
        prefabName: prefabName || "TestPrefab",
        position: pos,
        rotation: rot,
        scale: scl
      };
      
      // Create the event data
      const eventData = {
        eventName: "PlacePrefab",
        data: JSON.stringify(prefabData)
      };
      
      Logger.log("Directly sending prefab placement to Unity:", prefabData);
      
      // Send to Unity directly
      window.unityInstance.SendMessage(
        "ReactIncomingEvent",
        "HandleEvent",
        JSON.stringify(eventData)
      );
      
      return true;
    } catch (error) {
      Logger.error("Error directly placing prefab:", error);
      return false;
    }
  }, []);

  return {
    placePrefab,
    directPlacePrefab,
    isUnityLoaded: isUnityReady && isLoaded
  };
}; 