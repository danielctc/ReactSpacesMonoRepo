import { useEffect, useState } from "react";
import { getSpaceItem } from "@disruptive-spaces/shared/firebase/spacesFirestore";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from "../../providers/UnityProvider";
import { useSendUnityEvent } from "./core/useSendUnityEvent";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

// Helper function to clean Firebase Storage URLs to avoid CORS issues
const cleanFirebaseUrl = (url) => {
  if (!url) return null;
  
  try {
    // Check if it's a Firebase Storage URL
    if (url.includes('firebasestorage.googleapis.com')) {
      // Parse the URL
      const urlObj = new URL(url);
      
      // Keep only essential parameters (alt=media and token)
      const alt = urlObj.searchParams.get('alt');
      const token = urlObj.searchParams.get('token');
      
      // Clear all parameters
      urlObj.search = '';
      
      // Add back only the essential ones
      if (alt) urlObj.searchParams.set('alt', alt);
      if (token) urlObj.searchParams.set('token', token);
      
      
      return urlObj.toString();
    }
    return url;
  } catch (error) {
    console.error('Error cleaning Firebase URL:', error);
    return url;
  }
};

// Hook to handle fetching and sending portal images to Unity
export const useUnityPortalImages = () => {
  const { spaceID } = useUnity();
  const queueMessage = useSendUnityEvent();
  const [unityReady, setUnityReady] = useState(false);

  // First, set up a listener for Unity readiness
  useEffect(() => {
    // Check if Unity is already ready via window flag
    if (window.isPlayerInstantiated) {
      Logger.log("useUnityPortalImages: Unity already ready (via window flag)");
      setUnityReady(true);
      return;
    }

    // Otherwise, listen for the PlayerInstantiated event
    const handlePlayerInstantiated = () => {
      Logger.log("useUnityPortalImages: Unity is now ready (PlayerInstantiated event)");
      setUnityReady(true);
    };

    // Add event listener
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    // Cleanup
    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Then, fetch and send portal images only when Unity is ready
  useEffect(() => {
    // Only proceed if Unity is ready
    if (!unityReady) {
      Logger.log("useUnityPortalImages: Waiting for Unity to be ready before loading portal images");
      return;
    }

    Logger.log("useUnityPortalImages: Unity is ready, now loading portal images");
    
    const fetchPortalImages = async () => {
      try {
        // Ensure spaceID is defined before making the Firestore call
        if (!spaceID) {
          throw new Error("spaceID is not defined.");
        }

        // Get portals collection for this space
        const portalsRef = collection(db, 'spaces', spaceID, 'portals');
        const querySnapshot = await getDocs(portalsRef);
        
        if (querySnapshot.empty) {
          Logger.log("useUnityPortalImages: No portals found for space:", spaceID);
          return;
        }

        Logger.log(`useUnityPortalImages: Found ${querySnapshot.size} portals for space ${spaceID}`);

        // Process each portal
        for (const doc of querySnapshot.docs) {
          const portalData = doc.data();
          const portalId = portalData.portalId;
          const targetSpaceId = portalData.targetSpaceId;
          
          if (!targetSpaceId) {
            Logger.warn(`useUnityPortalImages: No target space ID found for portal: ${portalId}`);
            continue;
          }

          // Fetch target space data to get its background image
          const targetSpaceData = await getSpaceItem(targetSpaceId);
          if (!targetSpaceData) {
            Logger.warn(`useUnityPortalImages: No space data found for target space: ${targetSpaceId}`);
            continue;
          }

          // Get the background image URL (prefer backgroundUrl if available)
          const backgroundImageUrl = targetSpaceData.backgroundUrl || targetSpaceData.backgroundGsUrl;
          if (!backgroundImageUrl) {
            Logger.warn(`useUnityPortalImages: No background image URL found for target space: ${targetSpaceId}`);
            continue;
          }

          // Clean the URL to avoid CORS issues
          const cleanedImageUrl = cleanFirebaseUrl(backgroundImageUrl);

          // Send the portal data to Unity using the SetPortalImage event
          queueMessage("SetPortalImage", JSON.stringify({ 
            portalId: portalId,
            imageUrl: cleanedImageUrl
          }));
          
          Logger.log(`Sent portal image data to Unity for portal ${portalId}: ${cleanedImageUrl}`);
        }
      } catch (error) {
        Logger.error('Error fetching portal images:', error);
      }
    };

    fetchPortalImages();
  }, [queueMessage, spaceID, unityReady]);
}; 