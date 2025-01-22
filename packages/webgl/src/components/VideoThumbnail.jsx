import React from 'react';
import AccessEditButton from './AccessEditButton'; // Import the conditional button

// Component for displaying a video thumbnail with an optional "EDIT" button
const VideoThumbnail = ({ gameObjectName, onEdit }) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Conditionally render the "EDIT" button */}
      <AccessEditButton onClick={() => onEdit(gameObjectName)}>
        EDIT
      </AccessEditButton>
    </div>
  );
};

export default VideoThumbnail; 
