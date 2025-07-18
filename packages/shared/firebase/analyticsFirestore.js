import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Logger } from '../logging/react-log';
import { 
  createAnalyticsSessionSecure, 
  trackAnalyticsEventSecure, 
  endAnalyticsSessionSecure 
} from './analyticsCloudFunctions';

// Analytics event types
export const ANALYTICS_EVENT_TYPES = {
  // Unity-side events
  UNITY: {
    VIDEO_PLAY: 'unity_video_play',
    VIDEO_PAUSE: 'unity_video_pause',
    VIDEO_COMPLETE: 'unity_video_complete',
    PORTAL_CLICK: 'unity_portal_click',
    PORTAL_NAVIGATE: 'unity_portal_navigate',
    MEDIA_SCREEN_CLICK: 'unity_media_screen_click',
    NAMEPLATE_CLICK: 'unity_nameplate_click',
    OBJECT_INTERACT: 'unity_object_interact',
    PLAYER_MOVE: 'unity_player_move',
    PLAYER_SPAWN: 'unity_player_spawn',
    SPACE_LOAD: 'unity_space_load',
    SPACE_READY: 'unity_space_ready'
  },
  
  // React-side events
  REACT: {
    MODAL_OPEN: 'react_modal_open',
    MODAL_CLOSE: 'react_modal_close',
    UI_CLICK: 'react_ui_click',
    USER_LOGIN: 'react_user_login',
    USER_LOGOUT: 'react_user_logout',
    SPACE_ENTER: 'react_space_enter',
    SPACE_EXIT: 'react_space_exit',
    CHAT_MESSAGE: 'react_chat_message',
    UPLOAD_START: 'react_upload_start',
    UPLOAD_COMPLETE: 'react_upload_complete',
    SETTINGS_CHANGE: 'react_settings_change'
  }
};

// Analytics categories
export const ANALYTICS_CATEGORIES = {
  NAVIGATION: 'navigation',
  MEDIA_INTERACTION: 'media_interaction',
  SOCIAL_INTERACTION: 'social_interaction',
  UI_INTERACTION: 'ui_interaction',
  SYSTEM_EVENT: 'system_event',
  USER_BEHAVIOR: 'user_behavior',
  CONTENT_INTERACTION: 'content_interaction',
  PERFORMANCE: 'performance'
};

/**
 * Create a new analytics session for a user in a space
 * Uses secure Cloud Functions for server-side validation
 * @param {string} spaceId - The space identifier
 * @param {string} userId - The user identifier (not needed as it's retrieved from auth)
 * @param {Object} sessionData - Additional session metadata
 * @returns {Promise<string>} - The session ID
 */
export const createAnalyticsSession = async (spaceId, userId, sessionData = {}) => {
  try {
    Logger.log(`Creating secure analytics session for user ${userId} in space ${spaceId}`);
    return await createAnalyticsSessionSecure(spaceId, sessionData);
  } catch (error) {
    Logger.error('Error creating analytics session:', error);
    throw error;
  }
};

/**
 * Track an analytics event
 * Uses secure Cloud Functions for server-side validation
 * @param {string} spaceId - The space identifier
 * @param {string} sessionId - The session identifier
 * @param {string} eventType - The event type from ANALYTICS_EVENT_TYPES
 * @param {Object} eventData - Event-specific data
 * @returns {Promise<string>} - The event ID
 */
export const trackAnalyticsEvent = async (spaceId, sessionId, eventType, eventData = {}) => {
  try {
    Logger.log(`Tracking secure analytics event: ${eventType} in space ${spaceId}`);
    return await trackAnalyticsEventSecure(spaceId, sessionId, eventType, eventData);
  } catch (error) {
    Logger.error('Error tracking analytics event:', error);
    throw error;
  }
};

/**
 * End an analytics session
 * Uses secure Cloud Functions for server-side validation
 * @param {string} spaceId - The space identifier
 * @param {string} sessionId - The session identifier
 * @returns {Promise<void>}
 */
export const endAnalyticsSession = async (spaceId, sessionId) => {
  try {
    Logger.log(`Ending secure analytics session: ${sessionId} in space ${spaceId}`);
    await endAnalyticsSessionSecure(spaceId, sessionId);
  } catch (error) {
    Logger.error('Error ending analytics session:', error);
    throw error;
  }
};

/**
 * Get analytics events for a space
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of analytics events
 */
export const getSpaceAnalytics = async (spaceId, options = {}) => {
  try {
    Logger.log(`Getting analytics for space: ${spaceId}`);
    
    const {
      eventType = null,
      category = null,
      userId = null,
      startDate = null,
      endDate = null,
      limitResults = 100
    } = options;
    
    let analyticsQuery = collection(db, 'spaces', spaceId, 'analyticsEvents');
    
    // Build query constraints
    const constraints = [orderBy('timestamp', 'desc')];
    
    if (eventType) {
      constraints.push(where('eventType', '==', eventType));
    }
    
    if (category) {
      constraints.push(where('category', '==', category));
    }
    
    if (userId) {
      constraints.push(where('userId', '==', userId));
    }
    
    constraints.push(limit(limitResults));
    
    analyticsQuery = query(analyticsQuery, ...constraints);
    
    const querySnapshot = await getDocs(analyticsQuery);
    const events = [];
    
    querySnapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    Logger.log(`Retrieved ${events.length} analytics events for space ${spaceId}`);
    return events;
  } catch (error) {
    Logger.error('Error getting space analytics:', error);
    throw error;
  }
};

/**
 * Get analytics sessions for a space
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of analytics sessions
 */
export const getSpaceAnalyticsSessions = async (spaceId, options = {}) => {
  try {
    Logger.log(`Getting analytics sessions for space: ${spaceId}`);
    
    const {
      userId = null,
      isActive = null,
      limitResults = 50
    } = options;
    
    let sessionsQuery = collection(db, 'spaces', spaceId, 'analyticsSessions');
    
    // Build query constraints
    const constraints = [orderBy('startTime', 'desc')];
    
    if (userId) {
      constraints.push(where('userId', '==', userId));
    }
    
    if (isActive !== null) {
      constraints.push(where('isActive', '==', isActive));
    }
    
    constraints.push(limit(limitResults));
    
    sessionsQuery = query(sessionsQuery, ...constraints);
    
    const querySnapshot = await getDocs(sessionsQuery);
    const sessions = [];
    
    querySnapshot.forEach(doc => {
      sessions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    Logger.log(`Retrieved ${sessions.length} analytics sessions for space ${spaceId}`);
    return sessions;
  } catch (error) {
    Logger.error('Error getting space analytics sessions:', error);
    throw error;
  }
};

/**
 * Track a video play event specifically
 * Uses secure Cloud Functions for server-side validation
 * @param {string} spaceId - The space identifier
 * @param {string} sessionId - The session identifier
 * @param {string} userId - The user identifier
 * @param {Object} videoData - Video-specific data
 * @returns {Promise<string>} - The event ID
 */
export const trackVideoPlayEvent = async (spaceId, sessionId, userId, videoData) => {
  return trackAnalyticsEvent(spaceId, sessionId, ANALYTICS_EVENT_TYPES.UNITY.VIDEO_PLAY, {
    userId,
    category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
    source: 'unity',
    videoId: videoData.gameObjectName,
    videoUrl: videoData.videoUrl,
    spaceId,
    ...videoData
  });
};

/**
 * Get video analytics for a space
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of video analytics events
 */
export const getVideoAnalytics = async (spaceId, options = {}) => {
  return getSpaceAnalytics(spaceId, {
    ...options,
    category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
    eventType: ANALYTICS_EVENT_TYPES.UNITY.VIDEO_PLAY
  });
};

/**
 * Get portal analytics for a space
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of portal analytics events
 */
export const getPortalAnalytics = async (spaceId, options = {}) => {
  return getSpaceAnalytics(spaceId, {
    ...options,
    category: ANALYTICS_CATEGORIES.NAVIGATION,
    eventType: ANALYTICS_EVENT_TYPES.UNITY.PORTAL_CLICK
  });
};

/**
 * Get portal navigation analytics for a space
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of portal navigation events
 */
export const getPortalNavigationAnalytics = async (spaceId, options = {}) => {
  return getSpaceAnalytics(spaceId, {
    ...options,
    category: ANALYTICS_CATEGORIES.NAVIGATION,
    eventType: ANALYTICS_EVENT_TYPES.UNITY.PORTAL_NAVIGATE
  });
};

/**
 * Get all portal-related analytics for a space (clicks + navigation)
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of all portal-related events
 */
export const getAllPortalAnalytics = async (spaceId, options = {}) => {
  try {
    Logger.log(`Getting all portal analytics for space: ${spaceId}`);
    
    const [clickEvents, navigationEvents] = await Promise.all([
      getPortalAnalytics(spaceId, options),
      getPortalNavigationAnalytics(spaceId, options)
    ]);
    
    // Combine and sort by timestamp
    const allEvents = [...clickEvents, ...navigationEvents].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    Logger.log(`Retrieved ${allEvents.length} portal events for space ${spaceId}`);
    return allEvents;
  } catch (error) {
    Logger.error('Error getting all portal analytics:', error);
    throw error;
  }
};

/**
 * Batch track multiple events efficiently
 * @param {string} spaceId - The space identifier
 * @param {Array} events - Array of events to track
 * @returns {Promise<void>}
 */
export const batchTrackEvents = async (spaceId, events) => {
  try {
    Logger.log(`Batch tracking ${events.length} events for space ${spaceId}`);
    
    const batch = writeBatch(db);
    
    events.forEach(event => {
      const eventRef = doc(collection(db, 'spaces', spaceId, 'analyticsEvents'));
      batch.set(eventRef, {
        ...event,
        timestamp: serverTimestamp()
      });
    });
    
    await batch.commit();
    Logger.log(`Batch tracked ${events.length} events successfully`);
  } catch (error) {
    Logger.error('Error batch tracking events:', error);
    throw error;
  }
}; 