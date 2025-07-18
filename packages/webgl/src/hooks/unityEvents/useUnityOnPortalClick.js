import { useState, useEffect, useContext } from 'react';
import { useListenForUnityEvent } from './core/useListenForUnityEvent';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { useUnity } from '../../providers/UnityProvider';
import { fetchPortalAnalyticsData } from '../../utils/portalAnalyticsUtils';

export const useUnityOnPortalClick = () => {
  const [clickedPortal, setClickedPortal] = useState(null);
  const { user } = useContext(UserContext);
  const listenToUnityMessage = useListenForUnityEvent();
  const { spaceID } = useUnity();
  
  const { trackUnityEvent, isReady } = useAnalytics(spaceID, {
    enableDebugLogs: true
  });

  useEffect(() => {
    console.log('Setting up portal click listener...');
    
    const handlePortalClick = async (data) => {
      console.log('Portal click event received:', data);
      try {
        // Parse the data if it's a string
        const portalData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('Parsed portal data:', portalData);
        setClickedPortal(portalData);
        
        // Track portal click in analytics
        if (isReady && user && portalData && portalData.portalId) {
          try {
            // Fetch portal data from Firestore to get target space name
            const { targetSpaceId, targetSpaceName } = await fetchPortalAnalyticsData(spaceID, portalData.portalId);
            
            await trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.PORTAL_CLICK, {
              category: ANALYTICS_CATEGORIES.NAVIGATION,
              portalId: portalData.portalId,
              targetSpaceId: targetSpaceId,
              targetSpaceName: targetSpaceName,
              sourceSpaceId: spaceID,
              isEditMode: true, // Portal clicks are typically in edit mode
              timestamp: new Date().toISOString()
            });
            
            console.log('🎯 Analytics: Portal click event tracked for:', portalData.portalId, 'targeting:', targetSpaceName || targetSpaceId);
          } catch (analyticsError) {
            console.error('🎯 Analytics: Error tracking portal click:', analyticsError);
            // Fallback analytics without target space name
            try {
              await trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.PORTAL_CLICK, {
                category: ANALYTICS_CATEGORIES.NAVIGATION,
                portalId: portalData.portalId,
                targetSpaceId: null,
                targetSpaceName: null,
                sourceSpaceId: spaceID,
                isEditMode: true,
                timestamp: new Date().toISOString()
              });
              console.log('🎯 Analytics: Portal click event tracked (fallback) for:', portalData.portalId);
            } catch (fallbackError) {
              console.error('🎯 Analytics: Failed to track portal click even with fallback:', fallbackError);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing portal click data:', error, 'Data:', data);
      }
    };

    // Listen for Unity messages using the core event system
    const unsubscribe = listenToUnityMessage("PortalClicked", handlePortalClick);
    
    return () => {
      console.log('Cleaning up portal click listener');
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [listenToUnityMessage, isReady, user, spaceID, trackUnityEvent]);

  const clearClickedPortal = () => {
    console.log('Clearing clicked portal state');
    setClickedPortal(null);
  };

  return { 
    clickedPortal, 
    clearClickedPortal,
    // Analytics-related returns
    isAnalyticsReady: isReady,
    trackPortalClick: trackUnityEvent
  };
}; 