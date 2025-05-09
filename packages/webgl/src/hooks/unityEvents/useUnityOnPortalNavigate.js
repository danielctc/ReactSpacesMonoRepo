import { useEffect } from 'react';
import { useListenForUnityEvent } from './core/useListenForUnityEvent';

export const useUnityOnPortalNavigate = () => {
  const listenToUnityMessage = useListenForUnityEvent();

  useEffect(() => {
    console.log('Setting up portal navigation listener...');
    
    const handlePortalNavigate = (data) => {
      console.log('🔵 PORTAL CLICKED BY PLAYER (non-edit mode)');
      try {
        // Parse the data if it's a string
        const portalData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('Portal data:', portalData);

        // Get the target space ID from the portal ID
        // Format: portal_SpacesMetaverse_SDK_SpacesCinema_1746718114342
        const parts = portalData.portalId.split('_');
        if (parts.length >= 3) {
          const targetSpaceId = parts[2]; // Get the target space ID (e.g., "SpacesCinema")
          console.log('Navigating to space:', targetSpaceId);
          
          // Navigate to the target space
          window.location.href = `/?spaceId=${targetSpaceId}`;
        } else {
          console.error('Invalid portal ID format:', portalData.portalId);
        }
      } catch (error) {
        console.error('Error handling portal navigation:', error);
      }
    };

    // Listen for Unity messages using the core event system
    const unsubscribe = listenToUnityMessage("PortalNavigate", handlePortalNavigate);
    
    return () => {
      console.log('Cleaning up portal navigation listener');
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [listenToUnityMessage]);
}; 