import { useCallback } from 'react';
import { useSendUnityEvent } from './core/useSendUnityEvent';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Hook to place catalogue items (GLB models) in Unity
 * @returns {Object} Object containing placeCatalogueItem function and directPlaceCatalogueItem fallback
 */
export const usePlaceCatalogueItem = () => {
  const sendUnityEvent = useSendUnityEvent();

  // Standard method using the useSendUnityEvent hook
  const placeCatalogueItem = useCallback((itemId, glbUrl, position, rotation, scale) => {
    // Default values
    const pos = position || { x: 0, y: 0, z: 0 };
    const rot = rotation || { x: 0, y: 0, z: 0 };
    const scl = scale || { x: 1, y: 1, z: 1 };
    
    try {
      // Create item data
      const itemData = {
        hotspotId: itemId,
        glbUrl: glbUrl,
        position: pos,
        rotation: rot,
        scale: scl
      };
      
      Logger.log("Sending seating hotspot placement to Unity:", itemData);
      
      // Send event to Unity with the correct event name
      sendUnityEvent("SeatingHotspot", itemData);
      
      return true;
    } catch (error) {
      Logger.error("Error placing seating hotspot:", error);
      return false;
    }
  }, [sendUnityEvent]);

  // Fallback method using direct window.unityInstance access
  const directPlaceCatalogueItem = useCallback((itemId, glbUrl, position, rotation, scale) => {
    // Default values
    const pos = position || { x: 0, y: 0, z: 0 };
    const rot = rotation || { x: 0, y: 0, z: 0 };
    const scl = scale || { x: 1, y: 1, z: 1 };
    
    try {
      // Create item data
      const itemData = {
        hotspotId: itemId,
        glbUrl: glbUrl,
        position: pos,
        rotation: rot,
        scale: scl
      };
      
      // Create the event data
      const eventData = {
        eventName: "SeatingHotspot",
        data: JSON.stringify(itemData)
      };
      
      Logger.log("Directly sending seating hotspot placement to Unity:", itemData);
      
      // Send to Unity directly
      window.unityInstance.SendMessage(
        "ReactIncomingEvent",
        "HandleEvent",
        JSON.stringify(eventData)
      );
      
      return true;
    } catch (error) {
      Logger.error("Error directly placing seating hotspot:", error);
      return false;
    }
  }, []);

  return {
    placeCatalogueItem,
    directPlaceCatalogueItem,
    isUnityLoaded: true
  };
}; 