import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { usePlaceVideoCanvas } from './usePlaceVideoCanvas';
import { useSendUnityEvent } from './core/useSendUnityEvent';

/**
 * Hook to load and sync video canvas items from Firebase
 * Filters catalogue items where type === "video_canvas"
 * @param {string} spaceId - The space ID to load video canvases for
 */
export const useVideoCanvasItems = (spaceId) => {
  const { placeVideoCanvas } = usePlaceVideoCanvas();
  const sendUnityEvent = useSendUnityEvent();

  useEffect(() => {
    if (!spaceId) {
      Logger.log("useVideoCanvasItems: No spaceId provided, skipping load");
      return;
    }

    let unsubscribe = null;

    const loadVideoCanvasItems = async () => {
      try {
        // Query catalogue collection for video_canvas type items
        const catalogueRef = collection(db, 'spaces', spaceId, 'catalogue');
        const videoCanvasQuery = query(catalogueRef, where('type', '==', 'video_canvas'));

        // Set up real-time listener
        unsubscribe = onSnapshot(videoCanvasQuery, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const canvasId = change.doc.id;

            if (change.type === 'added') {
              Logger.log('useVideoCanvasItems: Video canvas added', canvasId);
              placeVideoCanvas(canvasId, data);
            } else if (change.type === 'modified') {
              Logger.log('useVideoCanvasItems: Video canvas modified', canvasId);
              sendUnityEvent('UpdateVideoCanvas', {
                canvasId: canvasId,
                position: data.position,
                rotation: data.rotation,
                scale: data.scale,
                videoUrl: data.videoUrl,
                videoType: data.videoType,
                aspectRatio: data.aspectRatio,
                autoplay: data.autoplay,
                loop: data.loop,
                muted: data.muted
              });
            } else if (change.type === 'removed') {
              Logger.log('useVideoCanvasItems: Video canvas removed', canvasId);
              sendUnityEvent('DeleteVideoCanvas', { canvasId: canvasId });
            }
          });
        }, (error) => {
          Logger.error("useVideoCanvasItems: Error in snapshot listener:", error);
        });

        Logger.log(`useVideoCanvasItems: Listening for video canvas items in space ${spaceId}`);

      } catch (error) {
        Logger.error("useVideoCanvasItems: Error setting up listener:", error);
      }
    };

    // Load video canvas items when Unity is ready
    if (window.unityInstance) {
      Logger.log("useVideoCanvasItems: Unity is ready, loading video canvas items");
      loadVideoCanvasItems();
    } else {
      // Listen for Unity ready event
      const handleUnityReady = () => {
        Logger.log("useVideoCanvasItems: Unity ready event received, loading video canvas items");
        loadVideoCanvasItems();
      };

      window.addEventListener('PlayerInstantiated', handleUnityReady);
      return () => {
        window.removeEventListener('PlayerInstantiated', handleUnityReady);
        if (unsubscribe) unsubscribe();
      };
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [spaceId, placeVideoCanvas, sendUnityEvent]);
};
