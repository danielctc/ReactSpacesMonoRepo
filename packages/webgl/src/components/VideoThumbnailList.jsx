import React, { useState, useEffect } from 'react';
import { getSpaceVideosFromFirestore } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import VideoThumbnail from './VideoThumbnail';

const VideoThumbnailList = ({ spaceID }) => {
  const [videos, setVideos] = useState([]);

  // Fetch video data from Firestore
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const spaceVideos = await getSpaceVideosFromFirestore(spaceID);
        setVideos(spaceVideos);
      } catch (error) {
        Logger.error('Error fetching video data:', error);
      }
    };
    fetchVideos();
  }, [spaceID]);

  // Handle edit button click
  const handleEditClick = (gameObjectName) => {
    console.log(`Editing video for gameObject: ${gameObjectName}`);
    // Implement edit functionality here
  };

  return (
    <div>
      {videos.map((video) => (
        <VideoThumbnail
          key={video.id}
          gameObjectName={video.id}
          onEdit={handleEditClick}
        />
      ))}
    </div>
  );
};

export default VideoThumbnailList;
