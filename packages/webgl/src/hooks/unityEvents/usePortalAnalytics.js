import { useState, useEffect, useCallback } from 'react';
import { 
  getPortalAnalytics, 
  getPortalNavigationAnalytics, 
  getAllPortalAnalytics 
} from '@disruptive-spaces/shared/firebase/analyticsFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Hook for accessing portal analytics data
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Configuration options
 * @returns {Object} - Portal analytics data and functions
 */
export const usePortalAnalytics = (spaceId, options = {}) => {
  const [portalClicks, setPortalClicks] = useState([]);
  const [portalNavigations, setPortalNavigations] = useState([]);
  const [allPortalEvents, setAllPortalEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    limitResults = 100
  } = options;

  // Load portal clicks
  const loadPortalClicks = useCallback(async () => {
    if (!spaceId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const clicks = await getPortalAnalytics(spaceId, {
        limitResults
      });
      
      setPortalClicks(clicks);
      Logger.log(`Portal Analytics: Loaded ${clicks.length} portal clicks for space ${spaceId}`);
    } catch (err) {
      Logger.error('Error loading portal clicks:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, limitResults]);

  // Load portal navigations
  const loadPortalNavigations = useCallback(async () => {
    if (!spaceId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const navigations = await getPortalNavigationAnalytics(spaceId, {
        limitResults
      });
      
      setPortalNavigations(navigations);
      Logger.log(`Portal Analytics: Loaded ${navigations.length} portal navigations for space ${spaceId}`);
    } catch (err) {
      Logger.error('Error loading portal navigations:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, limitResults]);

  // Load all portal events
  const loadAllPortalEvents = useCallback(async () => {
    if (!spaceId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const allEvents = await getAllPortalAnalytics(spaceId, {
        limitResults
      });
      
      setAllPortalEvents(allEvents);
      Logger.log(`Portal Analytics: Loaded ${allEvents.length} total portal events for space ${spaceId}`);
    } catch (err) {
      Logger.error('Error loading all portal events:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, limitResults]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadPortalClicks(),
      loadPortalNavigations(),
      loadAllPortalEvents()
    ]);
  }, [loadPortalClicks, loadPortalNavigations, loadAllPortalEvents]);

  // Get analytics for a specific portal
  const getPortalSpecificAnalytics = useCallback((portalId) => {
    const clickEvents = portalClicks.filter(event => 
      event.data?.portalId === portalId
    );
    const navigationEvents = portalNavigations.filter(event => 
      event.data?.portalId === portalId
    );
    
    return {
      clicks: clickEvents,
      navigations: navigationEvents,
      totalEvents: clickEvents.length + navigationEvents.length,
      lastActivity: Math.max(
        ...clickEvents.map(e => new Date(e.timestamp).getTime()),
        ...navigationEvents.map(e => new Date(e.timestamp).getTime())
      )
    };
  }, [portalClicks, portalNavigations]);

  // Get popular portals (most clicked/used)
  const getPopularPortals = useCallback(() => {
    const portalCounts = {};
    
    [...portalClicks, ...portalNavigations].forEach(event => {
      const portalId = event.data?.portalId;
      if (portalId) {
        if (!portalCounts[portalId]) {
          portalCounts[portalId] = {
            portalId,
            clicks: 0,
            navigations: 0,
            totalEvents: 0,
            targetSpaceId: event.data?.targetSpaceId || 'unknown'
          };
        }
        
        if (event.eventType === 'unity_portal_click') {
          portalCounts[portalId].clicks++;
        } else if (event.eventType === 'unity_portal_navigate') {
          portalCounts[portalId].navigations++;
        }
        
        portalCounts[portalId].totalEvents++;
      }
    });
    
    return Object.values(portalCounts).sort((a, b) => b.totalEvents - a.totalEvents);
  }, [portalClicks, portalNavigations]);

  // Load data on mount
  useEffect(() => {
    if (spaceId) {
      refreshAll();
    }
  }, [spaceId, refreshAll]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && spaceId) {
      const interval = setInterval(refreshAll, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, spaceId, refreshAll]);

  return {
    // Data
    portalClicks,
    portalNavigations,
    allPortalEvents,
    
    // State
    isLoading,
    error,
    
    // Functions
    loadPortalClicks,
    loadPortalNavigations,
    loadAllPortalEvents,
    refreshAll,
    getPortalSpecificAnalytics,
    getPopularPortals,
    
    // Computed values
    totalPortalClicks: portalClicks.length,
    totalPortalNavigations: portalNavigations.length,
    totalPortalEvents: allPortalEvents.length,
    
    // Unique portals
    uniquePortals: [...new Set(allPortalEvents.map(e => e.data?.portalId).filter(Boolean))]
  };
}; 