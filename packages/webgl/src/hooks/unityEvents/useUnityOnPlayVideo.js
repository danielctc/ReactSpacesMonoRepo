import { useState, useEffect, useContext } from "react";
import { getSpaceVideosFromFirestore } from "@disruptive-spaces/shared/firebase/spacesFirestore"; 
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { useUnity } from "../../providers/UnityProvider";
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

export const useUnityOnPlayVideo = (isEditMode) => {
  const [videoUrl, setVideoUrl] = useState(null);
  const { user } = useContext(UserContext);
  const listenToUnityMessage = useListenForUnityEvent();
  const { spaceID } = useUnity();
  
  const { trackUnityEvent, isReady } = useAnalytics(spaceID, {
    enableDebugLogs: true
  });

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
          
          // Track video play event in analytics
          if (isReady && user) {
            trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.VIDEO_PLAY, {
              category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
              videoId: gameObjectName,
              videoUrl: video.url,
              videoTitle: video.title || video.name || gameObjectName,
              isEditMode: false,
              spaceId: spaceID,
              timestamp: new Date().toISOString(),
              videoData: {
                gameObjectName,
                videoMetadata: video
              }
            });
            Logger.log("🎯 Analytics: Video play event tracked for:", gameObjectName);
          }
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
