import React from "react";
import { Button } from "@chakra-ui/react";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getSpaceVideosFromFirestore } from "@disruptive-spaces/shared/firebase/spacesFirestore";
import { useUnity } from "../providers/UnityProvider";

function TestPlayVideoButton({ isEditMode }) {
  const { spaceID } = useUnity();

  const handlePlayVideo = async () => {
    try {
      // Fetch videos from Firestore based on space ID
      const spaceVideos = await getSpaceVideosFromFirestore(spaceID);

      // Find the video matching "TV2"
      const video = spaceVideos.find((v) => v.id === "TV2");

      if (video && !isEditMode) {
        // Log the URL and manually set it for testing
        Logger.log("TestPlayVideoButton: Video URL set to:", video.url);
        // Dispatch the video play event manually
        window.dispatchReactUnityEvent("PlayVideo", { gameObjectName: "TV2" });
      } else {
        Logger.error("TestPlayVideoButton: Video not found or edit mode is active.");
      }
    } catch (error) {
      Logger.error('TestPlayVideoButton: Error fetching space videos:', error);
    }
  };

  return (
    <Button colorScheme="blue" onClick={handlePlayVideo} disabled={isEditMode}>
      Play TV2 Video
    </Button>
  );
}

export default TestPlayVideoButton;
