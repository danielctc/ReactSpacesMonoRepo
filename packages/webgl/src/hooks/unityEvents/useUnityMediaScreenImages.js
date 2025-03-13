import { useEffect } from "react";
import { getMediaScreenImagesFromFirestore } from "@disruptive-spaces/shared/firebase/mediaScreenFirestore";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from "../../providers/UnityProvider";
import { useSendUnityEvent } from "./core/useSendUnityEvent";

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
      
      console.log(`Cleaned Firebase URL from ${url} to ${urlObj.toString()}`);
      return urlObj.toString();
    }
    return url;
  } catch (error) {
    console.error('Error cleaning Firebase URL:', error);
    return url;
  }
};

// Hook to handle fetching and sending media screen images to Unity
export const useUnityMediaScreenImages = () => {
  const { spaceID } = useUnity();
  const queueMessage = useSendUnityEvent();

  useEffect(() => {
    const fetchMediaScreenImages = async () => {
      try {
        // Ensure spaceID is defined before making the Firestore call
        if (!spaceID) {
          throw new Error("spaceID is not defined.");
        }

        // Fetch media screen data from Firestore
        const mediaScreens = await getMediaScreenImagesFromFirestore(spaceID);
        Logger.log("Fetched Media Screen Images", mediaScreens);

        // Send each media screen image to Unity
        mediaScreens.forEach((screen) => {
          const { id, imageUrl, displayAsVideo, videoUrl } = screen;
          
          // For video screens, don't send the image URL to avoid CORS issues
          let imageUrlToSend = null;
          if (!displayAsVideo || !videoUrl) {
            // Only clean and send the image URL if this is not a video screen
            imageUrlToSend = imageUrl ? cleanFirebaseUrl(imageUrl) : null;
          }
          
          // Always send the media screen data to Unity, regardless of display mode
          // This ensures each media screen is handled independently
          queueMessage("SetMediaScreenImage", { 
            mediaScreenId: id, 
            imageUrl: imageUrlToSend,
            videoUrl: videoUrl || null,
            displayAsVideo: displayAsVideo || false,
            // Add a timestamp parameter to the message itself, not to the URL
            timestamp: Date.now()
          });
          
          Logger.log(`Sent media screen data for ${id} to Unity (displayAsVideo: ${displayAsVideo})`);
          
          // If this screen is set to display as video and has a video URL,
          // also send a message to ensure Unity knows it should be in video mode
          if (displayAsVideo && videoUrl) {
            queueMessage("SetMediaScreenDisplayMode", {
              mediaScreenId: id,
              displayAsVideo: true,
              videoUrl: videoUrl,
              timestamp: Date.now()
            });
            Logger.log(`Set display mode to video for screen ${id}`);
          }
        });
      } catch (error) {
        Logger.error('Error fetching media screen images:', error);
      }
    };

    fetchMediaScreenImages();
  }, [queueMessage, spaceID]);
}; 