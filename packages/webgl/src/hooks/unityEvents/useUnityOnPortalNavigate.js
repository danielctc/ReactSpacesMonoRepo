import { useEffect, useContext } from 'react';
import { useListenForUnityEvent } from './core/useListenForUnityEvent';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { useUnity } from '../../providers/UnityProvider';
import { fetchPortalAnalyticsData } from '../../utils/portalAnalyticsUtils';

export const useUnityOnPortalNavigate = () => {
  const { user } = useContext(UserContext);
  const listenToUnityMessage = useListenForUnityEvent();
  const { spaceID } = useUnity();
  
  const { trackUnityEvent, isReady } = useAnalytics(spaceID, {
    enableDebugLogs: true
  });

  useEffect(() => {
    console.log('Setting up portal navigation listener...');
    
    const handlePortalNavigate = async (data) => {
      console.log('🔵 PORTAL CLICKED BY PLAYER (non-edit mode)');
      try {
        // Parse the data if it's a string
        const portalData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('Portal data:', portalData);

        if (!portalData.portalId) {
          console.error('Portal ID is missing from portal data');
          return;
        }

        // Fetch portal data from Firestore to get target space name
        let targetSpaceId = null;
        let targetSpaceName = null;
        
        try {
          const portalAnalyticsData = await fetchPortalAnalyticsData(spaceID, portalData.portalId);
          targetSpaceId = portalAnalyticsData.targetSpaceId;
          targetSpaceName = portalAnalyticsData.targetSpaceName;
        } catch (fetchError) {
          console.error('Error fetching portal analytics data:', fetchError);
          // Fallback to parsing portal ID
          const parts = portalData.portalId.split('_');
          if (parts.length >= 3) {
            targetSpaceId = parts[2];
          }
        }

        if (targetSpaceId) {
          console.log('Navigating to space:', targetSpaceId, `(${targetSpaceName || 'Unknown space name'})`);
          
          // Track portal navigation analytics before navigating
          if (isReady && user && portalData) {
            try {
              await trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.PORTAL_NAVIGATE, {
                category: ANALYTICS_CATEGORIES.NAVIGATION,
                portalId: portalData.portalId,
                targetSpaceId: targetSpaceId,
                targetSpaceName: targetSpaceName,
                sourceSpaceId: spaceID,
                isEditMode: false, // Portal navigation is in play mode
                navigationType: 'direct', // This is direct navigation without modal
                timestamp: new Date().toISOString()
              });
              
              console.log('🎯 Analytics: Portal navigation event tracked for:', portalData.portalId, '→', targetSpaceName || targetSpaceId);
            } catch (analyticsError) {
              console.error('🎯 Analytics: Error tracking portal navigation:', analyticsError);
            }
          }
          
          // Navigate to the target space
          window.location.href = `/?spaceId=${targetSpaceId}`;
        } else {
          console.error('Could not determine target space ID from portal:', portalData.portalId);
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
  }, [listenToUnityMessage, isReady, user, spaceID, trackUnityEvent]);
}; 