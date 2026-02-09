import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnityInputManager } from '../hooks/useUnityInputManager';

interface MediaScreenVideoPlayerProps {
  videoUrl: string | null;
  videoTitle: string | null;
  mediaScreenId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const iframeStyles = {
  iframeContainer: {
    position: "relative" as const,
    paddingBottom: "56.25%",
    height: 0,
    overflow: "hidden",
    width: "100%",
    pointerEvents: "auto" as const,
  },
  iframe: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    border: "none",
    pointerEvents: "auto" as const,
    zIndex: 10000,
  },
};

const VideoModalStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
        body.unity-input-disabled #unity-container,
        body.unity-input-disabled #unity-canvas {
          pointer-events: none !important;
        }

        .video-iframe {
          z-index: 1003 !important;
          pointer-events: auto !important;
        }

        .iframe-container {
          pointer-events: auto !important;
        }
      `
    }}
  />
);

const MediaScreenVideoPlayer: React.FC<MediaScreenVideoPlayerProps> = ({ videoUrl, videoTitle, mediaScreenId, isOpen, onClose }) => {
  const { fullscreenRef } = useFullscreenContext();

  useUnityInputManager(isOpen, `video-modal-${mediaScreenId}`);

  useEffect(() => {
    if (isOpen) {
      const blockAllMouseEvents = (e: MouseEvent) => {
        const isOverlay = (e.target as HTMLElement).classList?.contains('modal-overlay');

        if (isOverlay) {
          e.stopPropagation();
          e.preventDefault();
        }
      };

      document.addEventListener('mousemove', blockAllMouseEvents, true);
      document.addEventListener('mousedown', blockAllMouseEvents, true);
      document.addEventListener('mouseup', blockAllMouseEvents, true);
      document.addEventListener('click', blockAllMouseEvents, true);
      document.addEventListener('wheel', blockAllMouseEvents, true);

      const unityCanvas = document.getElementById('unity-canvas');
      const unityContainer = document.getElementById('unity-container');

      if (unityCanvas) {
        (unityCanvas as HTMLElement).style.pointerEvents = 'none';
      }

      if (unityContainer) {
        (unityContainer as HTMLElement).style.pointerEvents = 'none';
      }

      document.body.classList.add('unity-input-disabled');

      if ((window as any).unityInstance) {
        try {
          (window as any).unityInstance.SendMessage('WebGLInputManager', 'Disable');
          (window as any).unityInstance.SendMessage('CameraController', 'DisableInput', 'VideoModal');
        } catch (e) {
          console.error('Error disabling Unity input:', e);
        }
      }

      return () => {
        document.removeEventListener('mousemove', blockAllMouseEvents, true);
        document.removeEventListener('mousedown', blockAllMouseEvents, true);
        document.removeEventListener('mouseup', blockAllMouseEvents, true);
        document.removeEventListener('click', blockAllMouseEvents, true);
        document.removeEventListener('wheel', blockAllMouseEvents, true);

        if (unityCanvas) {
          (unityCanvas as HTMLElement).style.pointerEvents = 'auto';
        }

        if (unityContainer) {
          (unityContainer as HTMLElement).style.pointerEvents = 'auto';
        }

        document.body.classList.remove('unity-input-disabled');

        if ((window as any).unityInstance) {
          try {
            (window as any).unityInstance.SendMessage('WebGLInputManager', 'Enable');
            (window as any).unityInstance.SendMessage('CameraController', 'EnableInput', 'VideoModal');
          } catch (e) {
            console.error('Error re-enabling Unity input:', e);
          }
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <VideoModalStyles />
      <div ref={fullscreenRef as any}>
        <dialog open className="modal modal-open" style={{ zIndex: 9998 }}>
          <div
            className="modal-overlay fixed inset-0 bg-black bg-opacity-80 z-[9998]"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onClose();
                e.stopPropagation();
                e.preventDefault();
              }
            }}
            onMouseMove={(e) => {
              if (e.target === e.currentTarget) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
            onMouseUp={(e) => {
              if (e.target === e.currentTarget) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
            onWheel={(e) => {
              if (e.target === e.currentTarget) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
          />
          <div className="modal-box max-w-[80vw] max-h-[80vh] bg-gray-900 text-white rounded-lg overflow-hidden z-[9999] video-modal-content">
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 bg-gray-700 text-white hover:bg-gray-600 z-[10000]"
              onClick={onClose}
            >
              ✕
            </button>
            <div className="p-0 w-full">
              {!videoUrl ? (
                <div className="flex flex-col items-center justify-center h-[400px]">
                  <span className="loading loading-spinner loading-xl mb-4"></span>
                  <p>Unable to load video</p>
                  <p className="text-sm text-gray-400 mt-2">
                    No video URL provided
                  </p>
                </div>
              ) : (
                <div
                  className="iframe-container"
                  style={iframeStyles.iframeContainer}
                >
                  <iframe
                    className="video-iframe"
                    src={videoUrl}
                    style={iframeStyles.iframe}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    title={videoTitle || "Video Player"}
                  ></iframe>
                </div>
              )}
            </div>
          </div>
        </dialog>
      </div>
    </>,
    document.body
  );
};

export default MediaScreenVideoPlayer;
