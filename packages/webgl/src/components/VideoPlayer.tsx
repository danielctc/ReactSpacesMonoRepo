import React, { useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnityOnPlayVideo } from "../hooks/unityEvents";
import { useUnity } from '../providers/UnityProvider';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

const iframeStyles = {
  iframeContainer: {
    position: "relative" as const,
    paddingBottom: "56.25%",
    height: 0,
    overflow: "hidden",
    width: "100%",
  },
  iframe: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: "none",
  },
};

const VideoPlayer: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { fullscreenRef } = useFullscreenContext();
  const [currentVideoUrl, resetVideoUrl] = useUnityOnPlayVideo(false);
  const { user } = useContext(UserContext);
  const { spaceID } = useUnity();

  const { trackReactEvent, isReady } = useAnalytics(spaceID, {
    enableDebugLogs: true
  });

  useEffect(() => {
    Logger.log("VideoPlayer: Current video URL:", currentVideoUrl);
    if (currentVideoUrl) {
      Logger.log("VideoPlayer: Opening modal for video URL:", currentVideoUrl);
      setIsOpen(true);

      if (isReady && user) {
        trackReactEvent(ANALYTICS_EVENT_TYPES.REACT.VIDEO_CLICK, {
          category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
          action: 'video_player_open',
          videoUrl: currentVideoUrl,
          context: 'video_player_modal',
          spaceId: spaceID,
          timestamp: new Date().toISOString()
        });

        Logger.log("🎯 Analytics: Video click event tracked for modal open:", currentVideoUrl);
      }
    }
  }, [currentVideoUrl, trackReactEvent, isReady, user, spaceID]);

  const handleClose = () => {
    Logger.log("VideoPlayer: Closing modal");

    if (isReady && user && currentVideoUrl) {
      trackReactEvent(ANALYTICS_EVENT_TYPES.REACT.VIDEO_CLOSE, {
        category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
        action: 'video_player_close',
        videoUrl: currentVideoUrl,
        context: 'video_player_modal',
        spaceId: spaceID,
        timestamp: new Date().toISOString()
      });

      Logger.log("🎯 Analytics: Video close event tracked for modal close:", currentVideoUrl);
    }

    resetVideoUrl();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div ref={fullscreenRef as any}>
      <dialog open className="modal modal-open" style={{ zIndex: 9998 }}>
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[9998]" onClick={handleClose} />
        <div className="modal-box max-w-[80vw] max-h-[80vh] bg-gray-900 text-white rounded-lg overflow-hidden flex justify-center items-center relative z-[9999]">
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 bg-gray-700 text-white hover:bg-gray-600 z-[10000]"
            onClick={handleClose}
          >
            ✕
          </button>
          <div className="p-0 w-full">
            {currentVideoUrl && (
              <div style={iframeStyles.iframeContainer}>
                <iframe
                  src={currentVideoUrl}
                  style={iframeStyles.iframe}
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  title="Video Player"
                ></iframe>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>,
    document.body
  );
};

export default VideoPlayer;
