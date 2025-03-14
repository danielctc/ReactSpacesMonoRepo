import { useEffect, useState } from "react";
import { getSpaceVideosFromFirestore } from "@disruptive-spaces/shared/firebase/spacesFirestore";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from "../../providers/UnityProvider"; // Import useUnity for spaceID
import { useSendUnityEvent } from "../../hooks/unityEvents/core/useSendUnityEvent";

// Hook to handle fetching and sending thumbnails to Unity
export const useUnityThumbnails = () => {
  const { spaceID } = useUnity(); // Correctly access spaceID
  const queueMessage = useSendUnityEvent();
  const [unityReady, setUnityReady] = useState(false);

  // First, set up a listener for Unity readiness
  useEffect(() => {
    // Check if Unity is already ready via window flag
    if (window.isPlayerInstantiated) {
      Logger.log("useUnityThumbnails: Unity already ready (via window flag)");
      setUnityReady(true);
      return;
    }

    // Otherwise, listen for the PlayerInstantiated event
    const handlePlayerInstantiated = () => {
      Logger.log("useUnityThumbnails: Unity is now ready (PlayerInstantiated event)");
      setUnityReady(true);
    };

    // Add event listener
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    // Cleanup
    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Then, fetch and send thumbnails only when Unity is ready
  useEffect(() => {
    // Only proceed if Unity is ready
    if (!unityReady) {
      Logger.log("useUnityThumbnails: Waiting for Unity to be ready before loading thumbnails");
      return;
    }

    Logger.log("useUnityThumbnails: Unity is ready, now loading thumbnails");
    
    const fetchThumbnails = async () => {
      try {
        // Ensure spaceID is defined before making the Firestore call
        if (!spaceID) {
          throw new Error("spaceID is not defined.");
        }

        // Fetch video data from Firestore
        const spaceVideos = await getSpaceVideosFromFirestore(spaceID);

        // Function to fetch the best thumbnail URL for a video
        const fetchThumbnailUrl = async (videoUrl) => {
          const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=${videoUrl}`;
          const response = await fetch(oEmbedUrl);

          if (!response.ok) {
            throw new Error(`Failed to fetch thumbnail: ${response.statusText}`);
          }

          const data = await response.json();

          // Extract the base thumbnail URL
          const baseThumbnailUrl = data.thumbnail_url.replace(/_\d+x\d+/, '');
          const resolutions = ['640x360', '295x166']; // Try from high to low resolution

          let validThumbnailUrl = null;

          // Iterate over each resolution to find the best available
          for (let res of resolutions) {
            // Build the test URL with or without the play button overlay
            const testUrl = `https://i.vimeocdn.com/filter/overlay?src0=${encodeURIComponent(`${baseThumbnailUrl}_${res}`)}&src1=http://f.vimeocdn.com/p/images/crawler_play.png`;

            // Check if the test URL is valid (response is okay)
            try {
              const imgResponse = await fetch(testUrl, { method: 'HEAD' });
              if (imgResponse.ok) {
                validThumbnailUrl = testUrl;
                break; // Exit the loop once we find a valid thumbnail
              }
            } catch (error) {
              console.warn(`Failed to validate thumbnail URL: ${testUrl}`, error);
            }
          }

          // Fallback to original thumbnail_url if none of the custom resolutions worked
          return validThumbnailUrl || data.thumbnail_url;
        };

        // Iterate over each video and fetch the corresponding thumbnail
        const thumbnailPromises = spaceVideos.map(async (video) => {
          const thumbnailUrl = await fetchThumbnailUrl(video.url);
          return { gameObjectName: video.id, thumbnailUrl };
        });

        const thumbnails = await Promise.all(thumbnailPromises);

        Logger.log("Fetched Thumbnails", thumbnails);

        // Send each thumbnail data to Unity
        thumbnails.forEach(({ gameObjectName, thumbnailUrl }) => {
          queueMessage("SetThumbnail", { gameObjectName, thumbnailUrl });
        });
      } catch (error) {
        Logger.error('Error fetching thumbnails:', error);
      }
    };

    fetchThumbnails();
  }, [queueMessage, spaceID, unityReady]);
};
