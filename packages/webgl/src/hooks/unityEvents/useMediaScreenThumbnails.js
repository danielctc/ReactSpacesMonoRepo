import { useEffect, useCallback, useState } from "react";
import { getMediaScreenImagesFromFirestore, getMediaScreenImage } from "@disruptive-spaces/shared/firebase/mediaScreenFirestore";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from "../../providers/UnityProvider";
import { useSendUnityEvent } from "./core/useSendUnityEvent";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";

/**
 * Hook to handle fetching and sending thumbnails to Unity for media screens set to display as videos
 */
export const useMediaScreenThumbnails = () => {
  const { spaceID } = useUnity();
  const queueMessage = useSendUnityEvent();
  const listenToUnityMessage = useListenForUnityEvent();
  const [unityReady, setUnityReady] = useState(false);

  // First, set up a listener for Unity readiness
  useEffect(() => {
    // Check if Unity is already ready via window flag
    if (window.isPlayerInstantiated) {
      Logger.log("useMediaScreenThumbnails: Unity already ready (via window flag)");
      setUnityReady(true);
      return;
    }

    // Otherwise, listen for the PlayerInstantiated event
    const handlePlayerInstantiated = () => {
      Logger.log("useMediaScreenThumbnails: Unity is now ready (PlayerInstantiated event)");
      setUnityReady(true);
    };

    // Add event listener
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    // Cleanup
    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Function to fetch thumbnail for a video URL
  const fetchThumbnailUrl = useCallback(async (videoUrl) => {
    try {
      // Check if it's a Vimeo URL
      if (videoUrl.includes('vimeo.com')) {
        return await fetchVimeoThumbnail(videoUrl);
      }
      
      // Check if it's a YouTube URL
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        return await fetchYouTubeThumbnail(videoUrl);
      }
      
      // Default fallback thumbnail for other video sources
      return 'https://via.placeholder.com/640x360?text=Video';
    } catch (error) {
      Logger.error(`Error fetching thumbnail for ${videoUrl}:`, error);
      return 'https://via.placeholder.com/640x360?text=Error';
    }
  }, []);

  // Fetch Vimeo thumbnail
  const fetchVimeoThumbnail = async (videoUrl) => {
    try {
      const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(oEmbedUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch Vimeo thumbnail: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract the base thumbnail URL (remove size suffix if present)
      const baseThumbnailUrl = data.thumbnail_url.replace(/_\d+x\d+/, '');
      const resolutions = ['640x360', '295x166']; // Try from high to low resolution
      
      let validThumbnailUrl = null;
      
      // Iterate over each resolution to find the best available with play button overlay
      for (let res of resolutions) {
        // Build the URL with play button overlay
        const testUrl = `https://i.vimeocdn.com/filter/overlay?src0=${encodeURIComponent(`${baseThumbnailUrl}_${res}`)}&src1=http://f.vimeocdn.com/p/images/crawler_play.png`;
        
        // Check if the test URL is valid
        try {
          const imgResponse = await fetch(testUrl, { method: 'HEAD' });
          if (imgResponse.ok) {
            validThumbnailUrl = testUrl;
            break; // Exit the loop once we find a valid thumbnail
          }
        } catch (error) {
          Logger.warn(`Failed to validate thumbnail URL: ${testUrl}`, error);
        }
      }
      
      // Fallback to original thumbnail_url if none of the custom resolutions worked
      return validThumbnailUrl || data.thumbnail_url;
    } catch (error) {
      Logger.error(`Error fetching Vimeo thumbnail: ${error.message}`);
      // Return a fallback image
      return 'https://via.placeholder.com/640x360?text=Vimeo+Video';
    }
  };

  // Extract YouTube video ID and generate thumbnail URL
  const fetchYouTubeThumbnail = async (videoUrl) => {
    let videoId = '';
    
    if (videoUrl.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(new URL(videoUrl).search);
      videoId = urlParams.get('v');
    } else if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
    }
    
    if (!videoId) {
      throw new Error('Could not extract YouTube video ID');
    }
    
    // Try to get the highest quality thumbnail first (maxresdefault)
    const maxResUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    try {
      // Check if maxresdefault is available
      const response = await fetch(maxResUrl, { method: 'HEAD' });
      if (response.ok) {
        return maxResUrl;
      }
    } catch (error) {
      Logger.warn(`Failed to validate maxresdefault thumbnail for YouTube video ${videoId}`, error);
    }
    
    // Fall back to high quality default which always exists
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  // Function to refresh a single media screen thumbnail
  const refreshMediaScreenThumbnail = useCallback(async (mediaScreenId) => {
    try {
      if (!spaceID || !mediaScreenId) {
        return;
      }

      Logger.log(`Refreshing thumbnail for media screen ${mediaScreenId}`);
      
      // Get the media screen data from Firestore
      const mediaScreen = await getMediaScreenImage(spaceID, mediaScreenId);
      
      if (!mediaScreen) {
        Logger.log(`No media screen found with ID ${mediaScreenId}`);
        return;
      }
      
      Logger.log(`Media screen data:`, mediaScreen);
      
      // Only proceed if this is a video media screen
      if (!mediaScreen.displayAsVideo || !mediaScreen.videoUrl) {
        Logger.log(`Media screen ${mediaScreenId} is not set to display as video or has no video URL`);
        return;
      }
      
      // Fetch the thumbnail URL
      const thumbnailUrl = await fetchThumbnailUrl(mediaScreen.videoUrl);
      
      // Send the thumbnail to Unity
      queueMessage("SetMediaScreenThumbnail", { 
        mediaScreenId, 
        thumbnailUrl
      });
      
      Logger.log(`Sent refreshed thumbnail for media screen ${mediaScreenId}: ${thumbnailUrl}`);
    } catch (error) {
      Logger.error(`Error refreshing thumbnail for media screen ${mediaScreenId}:`, error);
    }
  }, [spaceID, fetchThumbnailUrl, queueMessage]);

  // Listen for SetMediaScreenThumbnail events from Unity
  useEffect(() => {
    // Only proceed if Unity is ready
    if (!unityReady) {
      Logger.log("useMediaScreenThumbnails: Waiting for Unity to be ready before setting up thumbnail listeners");
      return;
    }

    Logger.log("useMediaScreenThumbnails: Unity is ready, now setting up thumbnail listeners");
    
    const handleSetMediaScreenThumbnail = async (eventData) => {
      try {
        const { mediaScreenId, thumbnailUrl } = eventData;
        
        // If thumbnailUrl is "refresh", fetch a fresh thumbnail
        if (thumbnailUrl === "refresh" && mediaScreenId) {
          
          await refreshMediaScreenThumbnail(mediaScreenId);
        }
      } catch (error) {
        console.error('Error handling SetMediaScreenThumbnail event:', error);
      }
    };

    // Listen for the SetMediaScreenThumbnail event
    const unsubscribe = listenToUnityMessage("SetMediaScreenThumbnail", handleSetMediaScreenThumbnail);
    
    return () => {
      unsubscribe();
    };
  }, [listenToUnityMessage, refreshMediaScreenThumbnail, unityReady]);

  // Fetch thumbnails for all media screens set to display as videos
  useEffect(() => {
    // Only proceed if Unity is ready
    if (!unityReady) {
      Logger.log("useMediaScreenThumbnails: Waiting for Unity to be ready before fetching thumbnails");
      return;
    }

    Logger.log("useMediaScreenThumbnails: Unity is ready, now fetching thumbnails");
    
    const fetchMediaScreenThumbnails = async () => {
      try {
        // Ensure spaceID is defined before making the Firestore call
        if (!spaceID) {
          throw new Error("spaceID is not defined.");
        }

        Logger.log("Fetching media screens for thumbnails...");
        // Fetch media screen data from Firestore
        const mediaScreens = await getMediaScreenImagesFromFirestore(spaceID);
        Logger.log("All media screens:", mediaScreens);
        
        // Filter for media screens that should display as videos
        const videoMediaScreens = mediaScreens.filter(screen => screen.displayAsVideo && screen.videoUrl);
        Logger.log("Media screens set to display as videos:", videoMediaScreens);
        
        if (videoMediaScreens.length === 0) {
          Logger.log("No media screens set to display as videos found.");
          return;
        }

        Logger.log(`Found ${videoMediaScreens.length} media screens set to display as videos.`);

        // Iterate over each video media screen and fetch the corresponding thumbnail
        const thumbnailPromises = videoMediaScreens.map(async (screen) => {
          try {
            const thumbnailUrl = await fetchThumbnailUrl(screen.videoUrl);
            Logger.log(`Fetched thumbnail for ${screen.id}: ${thumbnailUrl}`);
            return { mediaScreenId: screen.id, thumbnailUrl };
          } catch (error) {
            Logger.error(`Error processing thumbnail for media screen ${screen.id}:`, error);
            return { 
              mediaScreenId: screen.id, 
              thumbnailUrl: 'https://via.placeholder.com/640x360?text=Error' 
            };
          }
        });

        const thumbnails = await Promise.all(thumbnailPromises);
        Logger.log("Fetched Media Screen Thumbnails", thumbnails);

        // Send each thumbnail data to Unity
        thumbnails.forEach(({ mediaScreenId, thumbnailUrl }) => {
          queueMessage("SetMediaScreenThumbnail", { 
            mediaScreenId, 
            thumbnailUrl
          });
          Logger.log(`Sent thumbnail to Unity for media screen ${mediaScreenId}: ${thumbnailUrl}`);
        });
      } catch (error) {
        Logger.error('Error fetching media screen thumbnails:', error);
      }
    };

    fetchMediaScreenThumbnails();
    
    // Set up an interval to refresh thumbnails periodically (every 5 minutes)
    const intervalId = setInterval(fetchMediaScreenThumbnails, 5 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [queueMessage, spaceID, fetchThumbnailUrl, unityReady]);
}; 