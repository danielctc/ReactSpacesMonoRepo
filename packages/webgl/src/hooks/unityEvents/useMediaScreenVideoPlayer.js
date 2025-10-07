import { useState, useEffect, useCallback } from "react";
import { getMediaScreenImage } from "@disruptive-spaces/shared/firebase/mediaScreenFirestore"; 
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { useUnity } from "../../providers/UnityProvider";

/**
 * Hook to handle playing videos from media screens when clicked in view mode
 * @param {boolean} isEditMode - Whether the app is in edit mode
 * @returns {[string|null, string, string|null, Function, boolean]} - Video URL, title, media screen ID, reset function, and processing flag
 */
export const useMediaScreenVideoPlayer = (isEditMode) => {
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [currentMediaScreenId, setCurrentMediaScreenId] = useState(null);
  const [isProcessingEvent, setIsProcessingEvent] = useState(false);

  const listenToUnityMessage = useListenForUnityEvent();
  const { spaceID } = useUnity();

  // Function to convert a raw video URL to an embed URL
  const getEmbedUrl = useCallback((url) => {
    try {
      if (!url) return null;
      
      // YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        
        if (url.includes('youtube.com/watch')) {
          const urlParams = new URLSearchParams(new URL(url).search);
          videoId = urlParams.get('v');
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        
        if (!videoId) return url; // Return original URL if we can't extract ID
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
      
      // Vimeo
      if (url.includes('vimeo.com')) {
        // Check if it's already an embed URL
        if (url.includes('player.vimeo.com/video')) {
          return url;
        }
        
        const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0]?.split('/')[0];
        if (!vimeoId) return url; // Return original URL if we can't extract ID
        return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
      }
      
      // Return the original URL for other formats
      return url;
    } catch (error) {
      Logger.error('Error converting to embed URL:', error);
      return url; // Return original URL on error
    }
  }, []);

  // Reset processing state after a delay
  const safelyResetProcessingState = useCallback(() => {
    // Use a short timeout to ensure state updates have completed
    setTimeout(() => {
      setIsProcessingEvent(false);
      Logger.log("Video processing state reset");
    }, 100);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let processingTimeout = null;

    const handlePlayMediaScreenVideo = async (eventDataJson) => {
      try {
        console.log("[DEBUG] PlayMediaScreenVideo event received:", eventDataJson, "isEditMode:", isEditMode);
        console.log("PlayMediaScreenVideo event received:", eventDataJson);
        
        // IMPORTANT: We no longer return early in edit mode
        // Instead, we'll just skip the video playing logic but still set the currentMediaScreenId
        // This allows the MediaScreenController to handle the click in edit mode
        
        const { mediaScreenId, videoUrl: directVideoUrl } = eventDataJson || {};
        if (!mediaScreenId) {
          Logger.error("Media screen ID is missing in Unity event data.");
          safelyResetProcessingState();
          return;
        }
        
        // In edit mode, just set the current media screen ID and return
        // This allows the click to be processed by the MediaScreenController for opening the upload modal
        if (isEditMode) {
          console.log(`[DEBUG] Edit mode is active for screen ${mediaScreenId}, setting ID but not playing video`);
          Logger.log("Edit mode is active, setting media screen ID but not playing video");
          setCurrentMediaScreenId(mediaScreenId);
          return;
        }
        
        // Only proceed with video playing logic if not in edit mode
        // Set processing flag to prevent duplicate modal opening
        setIsProcessingEvent(true);
        
        // Set a safety timeout to reset processing state after 5 seconds
        // This ensures we don't get stuck in a processing state if something goes wrong
        processingTimeout = setTimeout(() => {
          if (isMounted) {
            Logger.warn("Video processing timeout reached, resetting state");
            setIsProcessingEvent(false);
          }
        }, 5000);

        // If a direct video URL is provided in the event, use it instead of fetching from Firestore
        if (directVideoUrl) {
          console.log(`Using direct video URL from event: ${directVideoUrl}`);
          if (isMounted) {
            try {
              // Convert to embed URL before setting state
              const embedUrl = getEmbedUrl(directVideoUrl);
              console.log(`Setting video URL to: ${embedUrl} (original: ${directVideoUrl})`);
              setVideoUrl(embedUrl);
              setVideoTitle(`Media Screen ${mediaScreenId}`);
              setCurrentMediaScreenId(mediaScreenId);
              Logger.log("Media screen video URL set directly from event:", embedUrl);
            } catch (error) {
              Logger.error("Error setting video URL from direct URL:", error);
            } finally {
              // Reset processing flag immediately after setting the video URL
              safelyResetProcessingState();
              clearTimeout(processingTimeout);
            }
          }
          return;
        }

        console.log(`Fetching media screen data for ID: ${mediaScreenId}`);
        try {
          // Get the media screen data from Firestore
          const mediaScreen = await getMediaScreenImage(spaceID, mediaScreenId);
          console.log("Media screen data from Firestore:", mediaScreen);
          
          // Check if the media screen has a video URL
          if (!mediaScreen || !mediaScreen.videoUrl) {
            Logger.error("No video URL found for media screen:", mediaScreenId);
            safelyResetProcessingState();
            clearTimeout(processingTimeout);
            return;
          }

          // Only proceed if this media screen is set to display as video
          if (!mediaScreen.displayAsVideo) {
            Logger.log("Media screen is not set to display as video:", mediaScreenId);
            console.log("displayAsVideo flag is false for this media screen");
            safelyResetProcessingState();
            clearTimeout(processingTimeout);
            return;
          }

          if (isMounted) {
            try {
              // Convert to embed URL before setting state
              const embedUrl = getEmbedUrl(mediaScreen.videoUrl);
              console.log(`Setting video URL to: ${embedUrl} (original: ${mediaScreen.videoUrl})`);
              const videoTitle = mediaScreen.title || `Media Screen ${mediaScreenId}`;
              setVideoUrl(embedUrl);
              setVideoTitle(videoTitle);
              setCurrentMediaScreenId(mediaScreenId);
              Logger.log("Media screen video URL set to:", embedUrl);
            } catch (error) {
              Logger.error("Error setting video URL from Firestore:", error);
            } finally {
              // Reset processing flag immediately after setting the video URL
              safelyResetProcessingState();
              clearTimeout(processingTimeout);
            }
          }
        } catch (error) {
          Logger.error(`Error fetching media screen data for ${mediaScreenId}:`, error);
          safelyResetProcessingState();
          clearTimeout(processingTimeout);
        }
      } catch (error) {
        Logger.error('Error handling media screen video play:', error);
        console.error('Error handling media screen video play:', error);
        safelyResetProcessingState();
        clearTimeout(processingTimeout);
      }
    };

    // Listen for the PlayMediaScreenVideo event from Unity
    const unsubscribe = listenToUnityMessage("PlayMediaScreenVideo", handlePlayMediaScreenVideo);

    // Cleanup function to remove listener and prevent state update on unmounted component
    return () => {
      isMounted = false;
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
      unsubscribe();
    };
  }, [listenToUnityMessage, spaceID, isEditMode, getEmbedUrl, safelyResetProcessingState]);

  const resetVideoUrl = useCallback(() => {
    setVideoUrl(null);
    setVideoTitle("");
    setCurrentMediaScreenId(null);
    setIsProcessingEvent(false);
    Logger.log("Video player state reset");
  }, []);

  return [videoUrl, videoTitle, currentMediaScreenId, resetVideoUrl, isProcessingEvent];
}; 