import { useState, useEffect } from "react";
import { getSpaceVideosFromFirestore } from "@disruptive-spaces/shared/firebase/spacesFirestore"; 
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { useUnity } from "../../providers/UnityProvider";

export const useUnityOnPlayVideo = (isEditMode) => {
  const [videoUrl, setVideoUrl] = useState(null);

  const listenToUnityMessage = useListenForUnityEvent();
  const { spaceID } = useUnity();

  useEffect(() => {
    let isMounted = true;

    const handlePlayVideo = async (eventDataJson) => {
      try {
        // Only handle video play when not in edit mode
        if (isEditMode) {
          Logger.log("Edit mode is active, preventing video play.");
          return; // Prevent opening the play video modal if in edit mode
        }

        const { gameObjectName } = eventDataJson;
        if (!gameObjectName) {
          Logger.error("Game object name is missing in Unity event data.");
          return;
        }

        const spaceVideos = await getSpaceVideosFromFirestore(spaceID);
        Logger.log("SPACES VIDEOS", spaceVideos);
        
        const video = spaceVideos.find((v) => v.id === gameObjectName);
        if (video && isMounted) {
          setVideoUrl(video.url);
          Logger.log("Video URL set to:", video.url);
        } else {
          console.error("Video not found for game object:", gameObjectName);
        }
      } catch (error) {
        console.error('Error fetching space videos:', error);
      }
    };

    const unsubscribe = listenToUnityMessage("PlayVideo", handlePlayVideo);

    // Cleanup function to remove listener and prevent state update on unmounted component
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [listenToUnityMessage, spaceID, isEditMode]);

  const resetVideoUrl = () => {
    setVideoUrl(null);
  };

  return [videoUrl, resetVideoUrl];
};
