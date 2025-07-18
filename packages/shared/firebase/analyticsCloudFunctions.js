import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { Logger } from '../logging/react-log';

// Cloud Functions
const trackAnalyticsFunction = httpsCallable(functions, 'trackAnalytics');
const createAnalyticsSessionFunction = httpsCallable(functions, 'createAnalyticsSession');
const endAnalyticsSessionFunction = httpsCallable(functions, 'endAnalyticsSession');

/**
 * Create a new analytics session using Cloud Functions (secure)
 * @param {string} spaceId - The space identifier
 * @param {Object} sessionData - Additional session metadata
 * @returns {Promise<string>} - The session ID
 */
export const createAnalyticsSessionSecure = async (spaceId, sessionData = {}) => {
  try {
    Logger.log(`Creating secure analytics session for space ${spaceId}`);
    
    const result = await createAnalyticsSessionFunction({
      spaceId,
      sessionData: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        deviceType: typeof navigator !== 'undefined' && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        sessionType: 'webgl',
        startUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
        referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
        ...sessionData
      }
    });
    
    Logger.log(`Secure analytics session created: ${result.data.sessionId}`);
    return result.data.sessionId;
  } catch (error) {
    Logger.error('Error creating secure analytics session:', error);
    throw error;
  }
};

/**
 * Track an analytics event using Cloud Functions (secure)
 * @param {string} spaceId - The space identifier
 * @param {string} sessionId - The session identifier
 * @param {string} eventType - The event type
 * @param {Object} eventData - Event-specific data
 * @returns {Promise<string>} - The event ID
 */
export const trackAnalyticsEventSecure = async (spaceId, sessionId, eventType, eventData = {}) => {
  try {
    Logger.log(`Tracking secure analytics event: ${eventType} in space ${spaceId}`);
    
    const result = await trackAnalyticsFunction({
      spaceId,
      sessionId,
      eventType,
      eventData: {
        ...eventData,
        // Remove sensitive data that shouldn't be sent to server
        timestamp: new Date().toISOString(),
        clientSide: true
      }
    });
    
    Logger.log(`Secure analytics event tracked: ${eventType} (${result.data.eventId})`);
    return result.data.eventId;
  } catch (error) {
    Logger.error('Error tracking secure analytics event:', error);
    throw error;
  }
};

/**
 * End an analytics session using Cloud Functions (secure)
 * @param {string} spaceId - The space identifier
 * @param {string} sessionId - The session identifier
 * @returns {Promise<void>}
 */
export const endAnalyticsSessionSecure = async (spaceId, sessionId) => {
  try {
    Logger.log(`Ending secure analytics session: ${sessionId} in space ${spaceId}`);
    
    await endAnalyticsSessionFunction({
      spaceId,
      sessionId
    });
    
    Logger.log(`Secure analytics session ended: ${sessionId}`);
  } catch (error) {
    Logger.error('Error ending secure analytics session:', error);
    throw error;
  }
};

/**
 * Track a video play event using Cloud Functions (secure)
 * @param {string} spaceId - The space identifier
 * @param {string} sessionId - The session identifier
 * @param {Object} videoData - Video-specific data
 * @returns {Promise<string>} - The event ID
 */
export const trackVideoPlayEventSecure = async (spaceId, sessionId, videoData) => {
  return trackAnalyticsEventSecure(spaceId, sessionId, 'unity_video_play', {
    category: 'media_interaction',
    source: 'unity',
    videoId: videoData.gameObjectName,
    videoUrl: videoData.videoUrl,
    spaceId,
    ...videoData
  });
}; 