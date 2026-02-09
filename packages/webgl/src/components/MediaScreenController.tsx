/**
 * MediaScreenController.tsx
 *
 * Manages media screens in Unity application - handles image/video display and interactions.
 * Set DEBUG_MEDIA_SCREEN to true for detailed logging.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import MediaScreenUploadModal from './MediaScreenUploadModal';
import { getMediaScreenImagesFromFirestore, getMediaScreenImage } from '@disruptive-spaces/shared/firebase/mediaScreenFirestore';
import { useUnity } from '../providers/UnityProvider';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { useMediaScreenVideoPlayer } from '../hooks/unityEvents/useMediaScreenVideoPlayer';
import { useMediaScreenThumbnails } from '../hooks/unityEvents/useMediaScreenThumbnails';
import { useUnityMediaScreenImages } from '../hooks/unityEvents/useUnityMediaScreenImages';
import MediaScreenVideoPlayer from './MediaScreenVideoPlayer';
import { useUnityInputManager } from '../hooks/useUnityInputManager';
import { useListenForUnityEvent } from '../hooks/unityEvents/core/useListenForUnityEvent';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';

// Configuration
const DEBUG_MEDIA_SCREEN = false;
const EDIT_MODE_REFRESH_INTERVAL = 5000;

// Utilities
const cleanFirebaseUrl = (url: string): string => {
  if (!url?.includes('firebasestorage.googleapis.com')) return url;
  try {
    const urlObj = new URL(url);
    const alt = urlObj.searchParams.get('alt');
    const token = urlObj.searchParams.get('token');
    urlObj.search = '';
    if (alt) urlObj.searchParams.set('alt', alt);
    if (token) urlObj.searchParams.set('token', token);
    return urlObj.toString();
  } catch (error) {
    console.error('Error cleaning Firebase URL:', error);
    return url;
  }
};

// Custom hook for image viewer modal
const useImageViewerModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentMediaType, setCurrentMediaType] = useState<string>('image');
  const modalContentRef = useRef<HTMLDivElement>(null);

  useUnityInputManager(isOpen, 'image-viewer-modal');

  const preventPropagation = useCallback((e: Event) => e.stopPropagation(), []);

  useEffect(() => {
    if (!isOpen || !modalContentRef.current) return;

    const modalElement = modalContentRef.current;
    const unityCanvas = document.getElementById('unity-canvas');
    const events = ['mousemove', 'mousedown', 'mouseup', 'wheel'];

    events.forEach(event => modalElement.addEventListener(event, preventPropagation));
    if (unityCanvas) (unityCanvas as HTMLElement).style.pointerEvents = 'none';

    return () => {
      events.forEach(event => modalElement.removeEventListener(event, preventPropagation));
      if (unityCanvas) (unityCanvas as HTMLElement).style.pointerEvents = 'auto';
    };
  }, [isOpen, preventPropagation]);

  const openImageViewer = (imageUrl: string, mediaType = 'image') => {
    const isActuallyImage = typeof imageUrl === 'string' && (
      imageUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) !== null ||
      (imageUrl.includes('firebasestorage') && !imageUrl.includes('video'))
    );

    setCurrentImageUrl(imageUrl);
    setCurrentMediaType(isActuallyImage ? 'image' : mediaType);
    setIsOpen(true);
  };

  const closeImageViewer = () => {
    setIsOpen(false);
    setTimeout(() => {
      setCurrentImageUrl(null);
      setCurrentMediaType('image');
    }, 300);
  };

  return {
    isOpen, currentImageUrl, currentMediaType, openImageViewer,
    closeImageViewer, modalContentRef, preventPropagation
  };
};

// Styles for Unity input management
const ImageViewerStyles = () => (
  <style dangerouslySetInnerHTML={{
    __html: `
      body.unity-input-disabled #unity-container,
      body.unity-input-disabled #unity-canvas { pointer-events: none !important; }
      .image-viewer-modal-content { pointer-events: auto !important; }
    `
  }} />
);

// Custom hook for media screen state management
const useMediaScreenState = () => {
  const [mediaScreens, setMediaScreens] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [unityReady, setUnityReady] = useState(false);

  const updateMediaScreen = useCallback((screenId: string, updates: any) => {
    setMediaScreens(prevScreens => {
      const exists = Array.isArray(prevScreens) &&
        prevScreens.some(screen => screen.mediaScreenId === screenId);

      if (exists) {
        return prevScreens.map(screen =>
          screen.mediaScreenId === screenId
            ? { ...screen, ...updates, lastUpdated: new Date().toISOString() }
            : screen
        );
      } else {
        return [...(Array.isArray(prevScreens) ? prevScreens : []), {
          mediaScreenId: screenId,
          ...updates,
          firstDetected: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }];
      }
    });
  }, []);

  const getScreenData = useCallback((screenId: string) => {
    if (!Array.isArray(mediaScreens)) return null;
    return mediaScreens.find(s => s.mediaScreenId === screenId);
  }, [mediaScreens]);

  return {
    mediaScreens, setMediaScreens, isEditMode, setIsEditMode,
    selectedScreen, setSelectedScreen, unityReady, setUnityReady,
    updateMediaScreen, getScreenData
  };
};

const MediaScreenController: React.FC = () => {
  const { spaceID } = useUnity();
  const [isOpen, setIsOpen] = useState(false);
  const queueMessage = useSendUnityEvent();
  const { fullscreenRef } = useFullscreenContext();
  const listenToUnityMessage = useListenForUnityEvent();
  const { trackReactEvent } = useAnalytics(spaceID);

  const {
    mediaScreens, setMediaScreens, isEditMode, setIsEditMode,
    selectedScreen, setSelectedScreen, unityReady, setUnityReady,
    updateMediaScreen, getScreenData
  } = useMediaScreenState();

  const {
    isOpen: isViewerOpen,
    currentImageUrl,
    currentMediaType,
    openImageViewer,
    closeImageViewer: onViewerClose,
    modalContentRef,
    preventPropagation
  } = useImageViewerModal();

  const [videoUrl, videoTitle, currentVideoMediaScreenId, resetVideoUrl, isVideoProcessing] = useMediaScreenVideoPlayer(isEditMode);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  useMediaScreenThumbnails();
  useUnityMediaScreenImages();

  useEffect(() => {
    if ((window as any).isPlayerInstantiated) {
      setUnityReady(true);
      return;
    }

    const handlePlayerInstantiated = () => setUnityReady(true);
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    return () => window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
  }, [setUnityReady]);

  const getLatestScreenData = useCallback(async (screenId: string) => {
    const screen = getScreenData(screenId);
    if (screen) {
      return {
        screen,
        imageUrl: screen.imageUrl,
        videoUrl: screen.videoUrl,
        mediaType: screen.mediaType || 'image',
        displayAsVideo: screen.displayAsVideo || false
      };
    }

    if (currentImageUrl) {
      return {
        screen: { mediaScreenId: screenId },
        imageUrl: currentImageUrl,
        videoUrl: null,
        mediaType: 'image',
        displayAsVideo: false
      };
    }

    if (spaceID && screenId) {
      try {
        const mediaScreen = await getMediaScreenImage(spaceID, screenId);
        if (mediaScreen) {
          updateMediaScreen(screenId, {
            ...mediaScreen,
            hasImage: !!mediaScreen.imageUrl,
            source: 'firestore-fetch'
          });
          return {
            screen: mediaScreen,
            imageUrl: mediaScreen.imageUrl,
            videoUrl: mediaScreen.videoUrl,
            mediaType: mediaScreen.mediaType || 'image',
            displayAsVideo: mediaScreen.displayAsVideo || false
          };
        }
      } catch (error) {
        console.error(`Error fetching media screen data for ${screenId}:`, error);
      }
    }

    return null;
  }, [getScreenData, currentImageUrl, spaceID, updateMediaScreen]);

  const processMediaScreenClick = useCallback(async (screenId: string) => {
    setSelectedScreen(screenId);

    if (isEditMode) {
      setIsOpen(true);
      return;
    }

    if (isVideoModalOpen && currentVideoMediaScreenId === screenId) return;

    const screenData = await getLatestScreenData(screenId);
    if (!screenData) return;

    if (screenData.displayAsVideo && screenData.videoUrl) {
      queueMessage("PlayMediaScreenVideo", {
        mediaScreenId: screenId,
        videoUrl: screenData.videoUrl
      });
    } else if (screenData.imageUrl) {
      const cleanedImageUrl = cleanFirebaseUrl(screenData.imageUrl);
      openImageViewer(cleanedImageUrl, screenData.mediaType || 'image');
    }
  }, [isEditMode, isVideoModalOpen, currentVideoMediaScreenId,
      getLatestScreenData, queueMessage, openImageViewer]);

  useEffect(() => {
    if (!unityReady || !spaceID) return;

    const fetchMediaScreenImages = async () => {
      try {
        const images = await getMediaScreenImagesFromFirestore(spaceID);
        const imageMap: Record<string, string> = {};
        images.forEach((image: any) => {
          if (image.id && image.imageUrl) imageMap[image.id] = image.imageUrl;
        });

        setMediaScreens(prevScreens =>
          prevScreens.map(screen => ({
            ...screen,
            hasImage: !!imageMap[screen.mediaScreenId],
            imageUrl: imageMap[screen.mediaScreenId],
            mediaType: screen.mediaType || 'image'
          }))
        );
      } catch (error) {
        console.error('Error fetching media screen images:', error);
      }
    };

    fetchMediaScreenImages();

    if (isEditMode) {
      const intervalId = setInterval(fetchMediaScreenImages, EDIT_MODE_REFRESH_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [spaceID, isEditMode, unityReady, setMediaScreens]);

  const handleImageChange = useCallback((changeData: any) => {
    const { mediaScreenId, type, imageUrl, mediaType } = changeData;

    if (type === 'upload') {
      updateMediaScreen(mediaScreenId, {
        hasImage: true,
        imageUrl,
        mediaType: mediaType || 'image'
      });
    } else if (type === 'delete') {
      setTimeout(() => {
        setMediaScreens(prevScreens =>
          prevScreens.filter(screen => screen.mediaScreenId !== mediaScreenId)
        );
      }, 100);
    }
  }, [updateMediaScreen, setMediaScreens]);

  useEffect(() => {
    const handleEditModeChange = (event: any) => {
      const isEnabled = event.detail.enabled;
      setIsEditMode(isEnabled);
      queueMessage("SetMediaScreenEditMode", {
        enabled: isEnabled,
        showUploadIcon: isEnabled
      });
    };

    window.addEventListener('editModeChanged', handleEditModeChange);
    return () => window.removeEventListener('editModeChanged', handleEditModeChange);
  }, [queueMessage, setIsEditMode]);

  useEffect(() => {
    (window as any).JsSendMediaScreenClick = (jsonData: string) => {
      try {
        const data = JSON.parse(jsonData);
        window.dispatchEvent(new CustomEvent('MediaScreenClick', {
          detail: JSON.stringify(data)
        }));
      } catch (error) {
        console.error("Error processing MediaScreenClick data:", error);
      }
    };

    (window as any).handleMediaScreenClick = (mediaScreenId: string) => {
      processMediaScreenClick(mediaScreenId);
    };

    (window as any).TestJavaScriptFromUnity = (message: string) => {
      // Message received from Unity
    };

    return () => {
      delete (window as any).JsSendMediaScreenClick;
      delete (window as any).handleMediaScreenClick;
      delete (window as any).TestJavaScriptFromUnity;
    };
  }, [processMediaScreenClick]);

  useEffect(() => {
    const handleRegisterMediaScreen = (event: any) => {
      try {
        const data = JSON.parse(event.detail);
        updateMediaScreen(data.mediaScreenId, { ...data, source: 'event' });

        if (isEditMode) {
          queueMessage("SetMediaScreenEditMode", {
            mediaScreenId: data.mediaScreenId,
            enabled: true,
            showUploadIcon: true
          });
        }

        if (spaceID && data.mediaScreenId) {
          getMediaScreenImage(spaceID, data.mediaScreenId)
            .then(mediaScreen => {
              if (mediaScreen?.displayAsVideo && mediaScreen?.videoUrl) {
                queueMessage("SetMediaScreenImage", {
                  mediaScreenId: data.mediaScreenId,
                  imageUrl: null,
                  displayAsVideo: true
                });
              }
            })
            .catch(error => console.error(`Error fetching media screen data:`, error));
        }
      } catch (error) {
        console.error('Error handling MediaScreen registration:', error);
      }
    };

    const handleMediaScreenClick = (event: any) => {
      try {
        let mediaScreenId;
        if (typeof event === 'string') {
          mediaScreenId = event;
        } else {
          const data = JSON.parse(event.detail);
          mediaScreenId = data.mediaScreenId;
        }
        processMediaScreenClick(mediaScreenId);
      } catch (error) {
        console.error('Error handling MediaScreen click:', error);
      }
    };

    const handleReactUnityEvent = (event: any) => {
      const { eventName, eventData } = event.detail || {};

      switch (eventName) {
        case 'RegisterMediaScreen':
          handleRegisterMediaScreen({ detail: eventData });
          break;
        case 'MediaScreenClick':
          handleMediaScreenClick({ detail: eventData });
          break;
        case 'SetMediaScreenImage':
          try {
            const data = JSON.parse(eventData);
            if (data.mediaScreenId) {
              updateMediaScreen(data.mediaScreenId, {
                imageUrl: data.imageUrl,
                hasImage: !!data.imageUrl,
                displayAsVideo: data.displayAsVideo || false,
                source: 'set-media-screen-image'
              });
            }
          } catch (error) {
            console.error('Error handling SetMediaScreenImage event:', error);
          }
          break;
      }
    };

    const events: [string, any][] = [
      ['RegisterMediaScreen', handleRegisterMediaScreen],
      ['MediaScreenClick', handleMediaScreenClick],
      ['reactUnityEvent', handleReactUnityEvent]
    ];

    events.forEach(([event, handler]) =>
      window.addEventListener(event, handler)
    );

    return () => {
      events.forEach(([event, handler]) =>
        window.removeEventListener(event, handler)
      );
    };
  }, [isEditMode, queueMessage, spaceID, updateMediaScreen, processMediaScreenClick]);

  useEffect(() => {
    if (videoUrl) {
      setIsVideoModalOpen(true);
      trackReactEvent(ANALYTICS_EVENT_TYPES.REACT.VIDEO_CLICK, {
        mediaScreenId: currentVideoMediaScreenId,
        videoUrl,
        videoTitle,
        source: 'media_screen_controller',
        trigger: 'video_modal_open'
      });
    }
  }, [videoUrl, trackReactEvent, currentVideoMediaScreenId, videoTitle]);

  const handleVideoModalClose = useCallback(() => {
    resetVideoUrl();
    setIsVideoModalOpen(false);
  }, [resetVideoUrl]);

  useEffect(() => {
    const handleRegisterMediaScreenDirect = (data: any) => {
      if (!data?.mediaScreenId) return;

      updateMediaScreen(data.mediaScreenId, {
        ...data,
        source: 'direct-event'
      });

      if (isEditMode) {
        queueMessage("SetMediaScreenEditMode", {
          mediaScreenId: data.mediaScreenId,
          enabled: true,
          showUploadIcon: true
        });
      }
    };

    const unsubscribeRegister = listenToUnityMessage("RegisterMediaScreen", handleRegisterMediaScreenDirect);
    const unsubscribeClick = listenToUnityMessage("MediaScreenClick", (data: any) => {
      if (data?.mediaScreenId) processMediaScreenClick(data.mediaScreenId);
    });

    return () => {
      unsubscribeRegister();
      unsubscribeClick();
    };
  }, [listenToUnityMessage, isEditMode, queueMessage, updateMediaScreen, processMediaScreenClick]);

  useEffect(() => {
    if (isEditMode && currentVideoMediaScreenId) {
      setSelectedScreen(currentVideoMediaScreenId);
      setIsOpen(true);
      resetVideoUrl();
    }
  }, [isEditMode, currentVideoMediaScreenId, resetVideoUrl, setSelectedScreen]);

  return (
    <>
      <MediaScreenUploadModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mediaScreenId={selectedScreen}
        onImageChange={handleImageChange}
      />

      {isViewerOpen && createPortal(
        <>
          <ImageViewerStyles />
          <div ref={fullscreenRef as any}>
            <dialog open className="modal modal-open" style={{ zIndex: 9998 }}>
              <div
                className="fixed inset-0 bg-black bg-opacity-80 z-[9998]"
                onClick={(e) => {
                  preventPropagation(e as any);
                  onViewerClose();
                }}
                onMouseMove={(e) => preventPropagation(e as any)}
                onMouseDown={(e) => preventPropagation(e as any)}
                onMouseUp={(e) => preventPropagation(e as any)}
                onWheel={(e) => preventPropagation(e as any)}
              />
              <div
                ref={modalContentRef}
                className="modal-box max-w-[80vw] max-h-[80vh] bg-gray-900 text-white rounded-lg relative z-[9999] image-viewer-modal-content"
                onClick={(e) => preventPropagation(e as any)}
                onMouseMove={(e) => preventPropagation(e as any)}
                onMouseDown={(e) => preventPropagation(e as any)}
                onMouseUp={(e) => preventPropagation(e as any)}
                onWheel={(e) => preventPropagation(e as any)}
              >
                <button
                  className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 bg-gray-700 text-white hover:bg-gray-600"
                  onClick={onViewerClose}
                >
                  ✕
                </button>
                <div className="p-0 w-full">
                  {currentImageUrl ? (
                    <div
                      className="relative w-full h-full flex justify-center items-center"
                      onClick={(e) => preventPropagation(e as any)}
                      onMouseMove={(e) => preventPropagation(e as any)}
                      onMouseDown={(e) => preventPropagation(e as any)}
                      onMouseUp={(e) => preventPropagation(e as any)}
                      onWheel={(e) => preventPropagation(e as any)}
                    >
                      {currentMediaType === 'image' ? (
                        <img
                          src={currentImageUrl}
                          className="max-w-full max-h-[80vh] object-contain"
                          alt="Media Screen Image"
                          onError={(e) => console.error("Error loading image:", e, currentImageUrl)}
                          onClick={(e) => preventPropagation(e as any)}
                        />
                      ) : (
                        <div
                          className="w-full text-center"
                          onClick={(e) => preventPropagation(e as any)}
                          onMouseMove={(e) => preventPropagation(e as any)}
                          onMouseDown={(e) => preventPropagation(e as any)}
                          onMouseUp={(e) => preventPropagation(e as any)}
                          onWheel={(e) => preventPropagation(e as any)}
                        >
                          <p className="mb-4 text-lg">Video URL:</p>
                          <p className="p-3 bg-gray-800 rounded-md text-sm break-all max-w-full">
                            {currentImageUrl}
                          </p>
                          <p className="mt-4 text-sm text-gray-400">
                            Video playback will be implemented in a future update
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center h-[400px]"
                      onClick={(e) => preventPropagation(e as any)}
                      onMouseMove={(e) => preventPropagation(e as any)}
                      onMouseDown={(e) => preventPropagation(e as any)}
                      onMouseUp={(e) => preventPropagation(e as any)}
                      onWheel={(e) => preventPropagation(e as any)}
                    >
                      <p>No image available</p>
                    </div>
                  )}
                </div>
              </div>
            </dialog>
          </div>
        </>,
        document.body
      )}

      <MediaScreenVideoPlayer
        videoUrl={videoUrl}
        videoTitle={videoTitle}
        mediaScreenId={currentVideoMediaScreenId}
        isOpen={isVideoModalOpen}
        onClose={handleVideoModalClose}
      />
    </>
  );
};

export default MediaScreenController;
