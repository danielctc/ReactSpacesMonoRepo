import { useEffect, useRef, useContext, useCallback, useState } from 'react';
import { UserContext } from '../providers/UserProvider';
import { 
  createAnalyticsSession, 
  trackAnalyticsEvent, 
  endAnalyticsSession,
  trackVideoPlayEvent,
  ANALYTICS_EVENT_TYPES,
  ANALYTICS_CATEGORIES
} from '../firebase/analyticsFirestore';
import { Logger } from '../logging/react-log';

/**
 * Analytics hook for tracking user interactions and events
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Configuration options
 * @returns {Object} - Analytics functions and state
 */
export const useAnalytics = (spaceId, options = {}) => {
  const { user } = useContext(UserContext);
  const sessionIdRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const spaceEntryTrackedRef = useRef(false); // Track if space entry has been recorded for this session
  const spaceExitTrackedRef = useRef(false); // Track if space exit has been recorded for this session
  const isInitializingRef = useRef(false); // Prevent multiple simultaneous initializations
  const isEndingSessionRef = useRef(false); // Prevent multiple simultaneous session endings
  
  const {
    autoStart = true,
    sessionMetadata = {},
    enableDebugLogs = false
  } = options;

  // Initialize session when component mounts and user is available
  useEffect(() => {
    if (user && spaceId && autoStart && !sessionIdRef.current && !isInitializingRef.current) {
      initializeSession();
    }
    
    // Cleanup on unmount
    return () => {
      if (sessionIdRef.current && !isEndingSessionRef.current) {
        if (enableDebugLogs) {
          Logger.log('Component unmounting, ending analytics session');
        }
        endSession();
      }
    };
  }, [user, spaceId, autoStart, enableDebugLogs]);

  // Handle page visibility changes to end session when user leaves
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && sessionIdRef.current && !isEndingSessionRef.current) {
        // User switched away from the page
        if (enableDebugLogs) {
          Logger.log('Page hidden, ending analytics session');
        }
        endSession();
      }
    };

    const handleBeforeUnload = () => {
      if (sessionIdRef.current && !isEndingSessionRef.current) {
        if (enableDebugLogs) {
          Logger.log('Page unloading, ending analytics session');
        }
        endSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enableDebugLogs]);

  /**
   * Initialize a new analytics session
   */
  const initializeSession = useCallback(async () => {
    if (!user || !spaceId || sessionIdRef.current || isInitializingRef.current) {
      if (enableDebugLogs) {
        Logger.log('Analytics session already initializing or initialized, skipping');
      }
      return;
    }

    try {
      isInitializingRef.current = true;
      setIsTracking(true);
      
      const sessionId = await createAnalyticsSession(spaceId, user.uid, {
        unityVersion: window.unityVersion || 'unknown',
        reactVersion: '18.x',
        startUrl: window.location.href,
        referrer: document.referrer,
        ...sessionMetadata
      });
      
      sessionIdRef.current = sessionId;
      setIsInitialized(true);
      
      // Track initial space entry event only once per session
      if (!spaceEntryTrackedRef.current) {
        await trackAnalyticsEvent(spaceId, sessionId, ANALYTICS_EVENT_TYPES.REACT.SPACE_ENTER, {
          userId: user.uid,
          category: ANALYTICS_CATEGORIES.NAVIGATION,
          source: 'react',
          spaceId,
          timestamp: new Date().toISOString()
        });
        spaceEntryTrackedRef.current = true;
        
        if (enableDebugLogs) {
          Logger.log(`📍 Analytics: Space entry tracked for session ${sessionId}`);
        }
      } else {
        if (enableDebugLogs) {
          Logger.log(`📍 Analytics: Space entry already tracked for this session, skipping duplicate`);
        }
      }
      
      if (enableDebugLogs) {
        Logger.log(`Analytics session initialized: ${sessionId} for space ${spaceId}`);
      }
    } catch (error) {
      Logger.error('Failed to initialize analytics session:', error);
      setIsTracking(false);
    } finally {
      isInitializingRef.current = false;
    }
  }, [user, spaceId, sessionMetadata, enableDebugLogs]);

  /**
   * End the current analytics session
   */
  const endSession = useCallback(async () => {
    if (enableDebugLogs) {
      Logger.log('endSession called with:', {
        sessionId: sessionIdRef.current,
        spaceId: spaceId,
        sessionIdType: typeof sessionIdRef.current,
        spaceIdType: typeof spaceId
      });
    }
    
    if (!sessionIdRef.current || !spaceId) {
      if (enableDebugLogs) {
        Logger.log('endSession: Missing required parameters, skipping', {
          sessionId: sessionIdRef.current,
          spaceId: spaceId
        });
      }
      return;
    }
    
    // Prevent multiple simultaneous calls to endSession
    if (isEndingSessionRef.current) {
      if (enableDebugLogs) {
        Logger.log('endSession: Already ending session, skipping duplicate call');
      }
      return;
    }

    try {
      isEndingSessionRef.current = true;
      
      // Track space exit event only once per session
      if (!spaceExitTrackedRef.current) {
        await trackAnalyticsEvent(spaceId, sessionIdRef.current, ANALYTICS_EVENT_TYPES.REACT.SPACE_EXIT, {
          userId: user?.uid,
          category: ANALYTICS_CATEGORIES.NAVIGATION,
          source: 'react',
          spaceId,
          timestamp: new Date().toISOString()
        });
        spaceExitTrackedRef.current = true;
        
        if (enableDebugLogs) {
          Logger.log(`📍 Analytics: Space exit tracked for session ${sessionIdRef.current}`);
        }
      } else {
        if (enableDebugLogs) {
          Logger.log(`📍 Analytics: Space exit already tracked for this session, skipping duplicate`);
        }
      }
      
      // Store sessionId for logging before clearing it
      const sessionIdToEnd = sessionIdRef.current;
      
      // End the session
      if (sessionIdToEnd && spaceId) {
        await endAnalyticsSession(spaceId, sessionIdToEnd);
        
        if (enableDebugLogs) {
          Logger.log(`Analytics session ended: ${sessionIdToEnd}`);
        }
      }
      
      sessionIdRef.current = null;
      setIsInitialized(false);
      setIsTracking(false);
      
      // Reset tracking flags for next session
      spaceEntryTrackedRef.current = false;
      spaceExitTrackedRef.current = false;
    } catch (error) {
      Logger.error('Failed to end analytics session:', error);
    } finally {
      isEndingSessionRef.current = false;
    }
  }, [spaceId, user?.uid, enableDebugLogs, trackAnalyticsEvent, endAnalyticsSession]);

  /**
   * Track a custom event
   * @param {string} eventType - The event type
   * @param {Object} eventData - Event-specific data
   * @returns {Promise<string|null>} - The event ID or null if failed
   */
  const track = useCallback(async (eventType, eventData = {}) => {
    if (!sessionIdRef.current || !spaceId || !isTracking) {
      if (enableDebugLogs) {
        Logger.warn('Cannot track event: No active analytics session');
      }
      return null;
    }

    try {
      const eventId = await trackAnalyticsEvent(spaceId, sessionIdRef.current, eventType, {
        userId: user?.uid,
        spaceId,
        timestamp: new Date().toISOString(),
        ...eventData
      });
      
      if (enableDebugLogs) {
        Logger.log(`Analytics event tracked: ${eventType}`, eventData);
      }
      
      return eventId;
    } catch (error) {
      Logger.error('Failed to track analytics event:', error);
      return null;
    }
  }, [spaceId, user?.uid, isTracking, enableDebugLogs]);

  /**
   * Track a video play event
   * @param {Object} videoData - Video-specific data
   * @returns {Promise<string|null>} - The event ID or null if failed
   */
  const trackVideoPlay = useCallback(async (videoData) => {
    if (!sessionIdRef.current || !spaceId || !isTracking) {
      if (enableDebugLogs) {
        Logger.warn('Cannot track video play: No active analytics session');
      }
      return null;
    }

    try {
      const eventId = await trackVideoPlayEvent(spaceId, sessionIdRef.current, user?.uid, videoData);
      
      if (enableDebugLogs) {
        Logger.log('Video play event tracked:', videoData);
      }
      
      return eventId;
    } catch (error) {
      Logger.error('Failed to track video play event:', error);
      return null;
    }
  }, [spaceId, user?.uid, isTracking, enableDebugLogs]);

  /**
   * Track a Unity event
   * @param {string} eventType - The Unity event type
   * @param {Object} eventData - Event-specific data
   * @returns {Promise<string|null>} - The event ID or null if failed
   */
  const trackUnityEvent = useCallback(async (eventType, eventData = {}) => {
    return track(eventType, {
      ...eventData,
      source: 'unity',
      category: eventData.category || ANALYTICS_CATEGORIES.USER_BEHAVIOR
    });
  }, [track]);

  /**
   * Track a React UI event
   * @param {string} eventType - The React event type
   * @param {Object} eventData - Event-specific data
   * @returns {Promise<string|null>} - The event ID or null if failed
   */
  const trackReactEvent = useCallback(async (eventType, eventData = {}) => {
    return track(eventType, {
      ...eventData,
      source: 'react',
      category: eventData.category || ANALYTICS_CATEGORIES.UI_INTERACTION
    });
  }, [track]);

  /**
   * Track a modal interaction
   * @param {string} action - 'open' or 'close'
   * @param {string} modalName - The name of the modal
   * @param {Object} additionalData - Additional data
   * @returns {Promise<string|null>} - The event ID or null if failed
   */
  const trackModal = useCallback(async (action, modalName, additionalData = {}) => {
    const eventType = action === 'open' 
      ? ANALYTICS_EVENT_TYPES.REACT.MODAL_OPEN 
      : ANALYTICS_EVENT_TYPES.REACT.MODAL_CLOSE;
    
    return trackReactEvent(eventType, {
      modalName,
      action,
      category: ANALYTICS_CATEGORIES.UI_INTERACTION,
      ...additionalData
    });
  }, [trackReactEvent]);

  /**
   * Restart the analytics session (useful after user login)
   */
  const restartSession = useCallback(async () => {
    if (sessionIdRef.current) {
      await endSession();
    }
    await initializeSession();
  }, [endSession, initializeSession]);

  return {
    // State
    isInitialized,
    isTracking,
    sessionId: sessionIdRef.current,
    
    // Core functions
    track,
    trackVideoPlay,
    trackUnityEvent,
    trackReactEvent,
    trackModal,
    
    // Session management
    initializeSession,
    endSession,
    restartSession,
    
    // Utilities
    isReady: isInitialized && isTracking && sessionIdRef.current !== null
  };
}; 