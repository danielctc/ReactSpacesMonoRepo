import { useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { usePlaceCatalogueItem } from './usePlaceCatalogueItem';

export const useSpaceCatalogueItems = (spaceId) => {
  const { placeCatalogueItem } = usePlaceCatalogueItem();

  useEffect(() => {
    const loadCatalogueItems = async () => {
      if (!spaceId) {
        Logger.log("useSpaceCatalogueItems: No spaceId provided, skipping catalogue items load");
        return;
      }

      try {
        // Get catalogue collection for this space
        const catalogueRef = collection(db, 'spaces', spaceId, 'catalogue');
        const querySnapshot = await getDocs(catalogueRef);
        
        if (querySnapshot.empty) {
          Logger.log("useSpaceCatalogueItems: No catalogue items found for space:", spaceId);
          return;
        }

        Logger.log(`useSpaceCatalogueItems: Found ${querySnapshot.size} items for space ${spaceId}`);

        // Place each catalogue item in Unity
        querySnapshot.forEach((doc) => {
          const itemData = doc.data();
          Logger.log(`useSpaceCatalogueItems: Placing item ${itemData.itemId} in Unity:`, itemData);

          // Place the item in Unity
          placeCatalogueItem(
            itemData.itemId,
            itemData.glbUrl,
            itemData.position,
            itemData.rotation,
            itemData.scale
          );
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
  }, [spaceId, placeCatalogueItem]);
}; 