import { useCallback } from 'react';
import { useSendUnityEvent } from './core/useSendUnityEvent';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Hook to place video canvas items in Unity
 * @returns {Object} Object containing placeVideoCanvas function
 */
export const usePlaceVideoCanvas = () => {
  const sendUnityEvent = useSendUnityEvent();

  /**
   * Place a video canvas in Unity
   * @param {string} canvasId - Unique identifier for the canvas
   * @param {Object} data - Video canvas data from Firebase
   */
  const placeVideoCanvas = useCallback((canvasId, data) => {
    // Default values
    const position = data.position || { x: 0, y: 0, z: 0 };
    const rotation = data.rotation || { x: 0, y: 0, z: 0 };
    const scale = data.scale || { x: 1, y: 1, z: 1 };

    try {
      const canvasData = {
        canvasId: canvasId,
        videoUrl: data.videoUrl || '',
        videoType: data.videoType || 'youtube',
        aspectRatio: data.aspectRatio || '16:9',
        autoplay: data.autoplay || false,
        loop: data.loop || false,
        muted: data.muted !== undefined ? data.muted : true,
        position: position,
        rotation: rotation,
        scale: scale
      };

      Logger.log("Sending PlaceVideoCanvas to Unity:", canvasData);
      sendUnityEvent("PlaceVideoCanvas", canvasData);

      return true;
    } catch (error) {
      Logger.error("Error placing video canvas:", error);
      return false;
    }
  }, [sendUnityEvent]);

  /**
   * Direct fallback method using window.unityInstance
   */
  const directPlaceVideoCanvas = useCallback((canvasId, data) => {
    const position = data.position || { x: 0, y: 0, z: 0 };
    const rotation = data.rotation || { x: 0, y: 0, z: 0 };
    const scale = data.scale || { x: 1, y: 1, z: 1 };

    try {
      const canvasData = {
        canvasId: canvasId,
        videoUrl: data.videoUrl || '',
        videoType: data.videoType || 'youtube',
        aspectRatio: data.aspectRatio || '16:9',
        autoplay: data.autoplay || false,
        loop: data.loop || false,
        muted: data.muted !== undefined ? data.muted : true,
        position: position,
        rotation: rotation,
        scale: scale
      };

      const eventData = {
        eventName: "PlaceVideoCanvas",
        data: JSON.stringify(canvasData)
      };

      Logger.log("Directly sending PlaceVideoCanvas to Unity:", canvasData);

      window.unityInstance.SendMessage(
        "ReactIncomingEvent",
        "HandleEvent",
        JSON.stringify(eventData)
      );

      return true;
    } catch (error) {
      Logger.error("Error directly placing video canvas:", error);
      return false;
    }
  }, []);

  return {
    placeVideoCanvas,
    directPlaceVideoCanvas
  };
};
