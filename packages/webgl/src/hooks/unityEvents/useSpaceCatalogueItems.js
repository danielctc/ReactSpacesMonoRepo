import { useEffect } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { usePlaceCatalogueItem } from './usePlaceCatalogueItem';
import { useSendUnityEvent } from './core/useSendUnityEvent';

export const useSpaceCatalogueItems = (spaceId) => {
  const { placeCatalogueItem } = usePlaceCatalogueItem();
  const sendUnityEvent = useSendUnityEvent();

  useEffect(() => {
    const loadCatalogueItems = async () => {
      if (!spaceId) {
        Logger.log("useSpaceCatalogueItems: No spaceId provided, skipping catalogue items load");
        return;
      }

      try {
        // Get catalogue collection for this space
        const catalogueRef = collection(db, 'spaces', spaceId, 'catalogue');

        // Initial load
        const querySnapshot = await getDocs(catalogueRef);
        if (!querySnapshot.empty) {
          Logger.log(`useSpaceCatalogueItems: Initial load ${querySnapshot.size} items for space ${spaceId}`);
          querySnapshot.forEach((snap) => {
            const data = snap.data();
            placeCatalogueItem(
              data.itemId,
              data.glbUrl,
              data.position,
              data.rotation,
              data.scale
            );
          });
        }

        // Realtime listener for adds/updates/deletes
        onSnapshot(catalogueRef, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            if (change.type === 'added') {
              // Already placed during initial load, but guard for new realtime adds
              Logger.log('useSpaceCatalogueItems: Realtime add', data.itemId);
              placeCatalogueItem(data.itemId, data.glbUrl, data.position, data.rotation, data.scale);
            } else if (change.type === 'modified') {
              Logger.log('useSpaceCatalogueItems: Realtime modify', data.itemId);
              // Re-place/update in Unity by sending update event
              sendUnityEvent('UpdateCatalogueItem', {
                hotspotId: data.itemId,
                position: data.position,
                rotation: data.rotation,
                scale: data.scale
              });
            } else if (change.type === 'removed') {
              const removedId = data?.itemId || change.doc.id;
              Logger.log('useSpaceCatalogueItems: Realtime remove', removedId);
              sendUnityEvent('DeleteCatalogueItem', { hotspotId: removedId });
            }
          });
        });

      } catch (error) {
        Logger.error("useSpaceCatalogueItems: Error loading catalogue items:", error);
      }
    };

    // Load catalogue items when Unity is ready
    if (window.unityInstance) {
      Logger.log("useSpaceCatalogueItems: Unity is ready, loading catalogue items");
      loadCatalogueItems();
    } else {
      // Listen for Unity ready event
      const handleUnityReady = () => {
        Logger.log("useSpaceCatalogueItems: Unity ready event received, loading catalogue items");
        loadCatalogueItems();
      };

      window.addEventListener('PlayerInstantiated', handleUnityReady);
      return () => {
        window.removeEventListener('PlayerInstantiated', handleUnityReady);
      };
    }
  }, [spaceId, placeCatalogueItem, sendUnityEvent]);
}; 