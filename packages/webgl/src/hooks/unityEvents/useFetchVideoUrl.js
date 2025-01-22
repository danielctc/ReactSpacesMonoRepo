import { useState, useEffect } from "react";
import { getSpaceVideosFromFirestore } from "@disruptive-spaces/shared/firebase/spacesFirestore"; 
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useFetchVideoUrl = (spaceID) => {
    const [videoUrls, setVideoUrls] = useState({}); // Use an object to hold URLs indexed by game object names

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const spaceVideos = await getSpaceVideosFromFirestore(spaceID);
                Logger.log("useFetchVideoUrl: Fetched videos from Firestore:", spaceVideos);

                const urls = {};
                if (spaceVideos && spaceVideos.length > 0) {
                    spaceVideos.forEach(video => {
                        urls[video.id] = video.url.trim(); // Assuming video.id corresponds to game object names (TV1, TV2)
                    });
                    setVideoUrls(urls);
                } else {
                    Logger.warn("useFetchVideoUrl: No videos found in the videos collection for this space.");
                }
            } catch (error) {
                Logger.error("useFetchVideoUrl: Error fetching videos:", error);
            }
        };

        fetchVideos();
    }, [spaceID]);

    return videoUrls; // Return the object containing video URLs
};
