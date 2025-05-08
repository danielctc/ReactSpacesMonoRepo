import { useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { usePlacePortal } from './usePlacePortal';

export const useSpacePortals = (spaceId) => {
  const { placePortal } = usePlacePortal();

  useEffect(() => {
    const loadPortals = async () => {
      if (!spaceId) {
        Logger.log("useSpacePortals: No spaceId provided, skipping portal load");
        return;
      }

      try {
        // Get portals collection for this space
        const portalsRef = collection(db, 'spaces', spaceId, 'portals');
        const querySnapshot = await getDocs(portalsRef);
        
        if (querySnapshot.empty) {
          Logger.log("useSpacePortals: No portals found for space:", spaceId);
          return;
        }

        Logger.log(`useSpacePortals: Found ${querySnapshot.size} portals for space ${spaceId}`);

        // Place each portal in Unity
        querySnapshot.forEach((doc) => {
          const portalData = doc.data();
          Logger.log(`useSpacePortals: Placing portal ${portalData.portalId} in Unity:`, portalData);

          // Place the portal in Unity
          placePortal(
            portalData.portalId,
            portalData.prefabName,
            portalData.position,
            portalData.rotation,
            portalData.scale
          );
        });

      } catch (error) {
        Logger.error("useSpacePortals: Error loading portals:", error);
      }
    };

    // Load portals when Unity is ready
    if (window.unityInstance) {
      Logger.log("useSpacePortals: Unity is ready, loading portals");
      loadPortals();
    } else {
      // Listen for Unity ready event
      const handleUnityReady = () => {
        Logger.log("useSpacePortals: Unity ready event received, loading portals");
        loadPortals();
      };

      window.addEventListener('PlayerInstantiated', handleUnityReady);
      return () => {
        window.removeEventListener('PlayerInstantiated', handleUnityReady);
      };
    }
  }, [spaceId, placePortal]);
}; 