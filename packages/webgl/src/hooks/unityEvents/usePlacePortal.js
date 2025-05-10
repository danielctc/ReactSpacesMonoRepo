import { useCallback } from 'react';
import { useSendUnityEvent } from './core/useSendUnityEvent';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Hook to place portal prefabs in Unity
 * @returns {Object} Object containing placePortal function and directPlacePortal fallback
 */
export const usePlacePortal = () => {
  const sendUnityEvent = useSendUnityEvent();

  // Standard method using the useSendUnityEvent hook
  const placePortal = useCallback((portalId, prefabName, position, rotation, scale, initialImageUrl) => {
    // Default values
    const pos = position || { x: 0, y: 1.5, z: 0 };
    const rot = rotation || { x: 0, y: 0, z: 0 };
    const scl = scale || { x: 1, y: 1, z: 1 };
    
    try {
      // Create portal data
      const portalData = {
        portalId: portalId,
        prefabName: prefabName || "PortalObjectPrefab",
        position: pos,
        rotation: rot,
        scale: scl,
        initialImageUrl: initialImageUrl
      };
      
      Logger.log("Sending portal placement to Unity:", portalData);
      
      // Send event to Unity
      sendUnityEvent("PlacePortalPrefab", portalData);
      
      return true;
    } catch (error) {
      Logger.error("Error placing portal:", error);
      return false;
    }
  }, [sendUnityEvent]);

  // Fallback method using direct window.unityInstance access
  const directPlacePortal = useCallback((portalId, prefabName, position, rotation, scale, initialImageUrl) => {
    // Default values
    const pos = position || { x: 0, y: 1.5, z: 0 };
    const rot = rotation || { x: 0, y: 0, z: 0 };
    const scl = scale || { x: 1, y: 1, z: 1 };
    
    try {
      // Create portal data
      const portalData = {
        portalId: portalId,
        prefabName: prefabName || "PortalObjectPrefab",
        position: pos,
        rotation: rot,
        scale: scl,
        initialImageUrl: initialImageUrl
      };
      
      // Create the event data
      const eventData = {
        eventName: "PlacePortalPrefab",
        data: JSON.stringify(portalData)
      };
      
      Logger.log("Directly sending portal placement to Unity:", portalData);
      
      // Send to Unity directly
      window.unityInstance.SendMessage(
        "ReactIncomingEvent",
        "HandleEvent",
        JSON.stringify(eventData)
      );
      
      return true;
    } catch (error) {
      Logger.error("Error directly placing portal:", error);
      return false;
    }
  }, []);

  return {
    placePortal,
    directPlacePortal,
    isUnityLoaded: true // Always return true since we don't need to check Unity's state
  };
}; 