import React, { useState, useEffect } from 'react';
import { useUnityOnPlayVideo } from "../hooks/unityEvents";
import { useSendUnityEvent } from "../hooks/unityEvents/core/useSendUnityEvent"; // Send event to Unity
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface TestModalTriggerProps {
  gameObjectName: string;
}

const TestModalTrigger: React.FC<TestModalTriggerProps> = ({ gameObjectName }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [videoUrl, resetVideoUrl] = useUnityOnPlayVideo(isEditMode); // Fetch video URL based on mode
  const sendUnityEvent = useSendUnityEvent(); // Get the function to send events to Unity
  const [isOpen, setIsOpen] = useState(false);

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // Open the appropriate modal based on mode
  const handleOpenModal = () => {
    if (isEditMode) {
      Logger.log("TestModalTrigger: Edit mode is enabled, but edit modal has been removed");
    } else {
      Logger.log("TestModalTrigger: Sending PlayVideo event to Unity for", gameObjectName);
      sendUnityEvent("PlayVideo", { gameObjectName }); // Send the PlayVideo event
      if (videoUrl) {
        setIsOpen(true); // Open the test modal if video URL exists
      }
    }
  };

  // Effect to open modal if videoUrl is received
  useEffect(() => {
    if (videoUrl) {
      Logger.log("TestModalTrigger: Video URL received:", videoUrl);
      setIsOpen(true);
    }
  }, [videoUrl]);

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <button
        onClick={toggleEditMode}
        className={`btn mb-4 ${isEditMode ? 'btn-accent' : 'btn-primary'}`}
      >
        {isEditMode ? "Switch to Play Mode" : "Switch to Edit Mode"}
      </button>

      <button onClick={handleOpenModal} className="btn btn-secondary">
        Open Modal for TV2
      </button>

      {/* Quick test modal for displaying video */}
      {isOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl bg-gray-900 text-white">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
            {videoUrl && (
              <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={videoUrl}
                  className="absolute top-0 left-0 w-full h-full border-0"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title="Test Video Player"
                ></iframe>
              </div>
            )}
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setIsOpen(false)}>
            <button>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default TestModalTrigger;
