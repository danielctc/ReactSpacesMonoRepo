const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { checkRateLimit, checkResourceRateLimit } = require('./rateLimiter');

// Set global options for all functions
setGlobalOptions({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 100,
});

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function to securely track analytics events
 * POST /trackAnalytics
 * Body: { spaceId, eventType, eventData, sessionId? }
 */
exports.trackAnalytics = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to track analytics');
  }

  const data = request.data;
  const { spaceId, eventType, eventData, sessionId } = data;
  const userId = request.auth.uid;

  // Validate required fields
  if (!spaceId || !eventType) {
    throw new HttpsError('invalid-argument', 'spaceId and eventType are required');
  }

  // Rate limiting: Check both user and space limits
  await checkRateLimit(userId, 'analytics', spaceId);
  await checkResourceRateLimit(spaceId, 'analytics');

  // Validate event type (prevent malicious event types)
  const validEventTypes = [
    'unity_video_play',
    'unity_portal_click',
    'unity_portal_navigate',
    'unity_media_screen_click',
    'unity_nameplate_click',
    'unity_object_interact',
    'unity_player_spawn',
    'unity_space_ready',
    'react_modal_open',
    'react_modal_close',
    'react_ui_click',
    'react_user_login',
    'react_user_logout',
    'react_space_enter',
    'react_space_exit',
    'react_chat_message',
    'react_video_click',
    'react_video_close',
    'react_button_click',
    'react_form_submit',
    'react_error_occurred'
  ];

  if (!validEventTypes.includes(eventType)) {
    throw new HttpsError('invalid-argument', 'Invalid event type');
  }

  try {
    // Server-side deduplication for space enter/exit events
    // Use a simpler approach that doesn't require composite indexes
    if (eventType === 'react_space_enter' || eventType === 'react_space_exit') {
      // Create a unique document ID based on user, event type, and rounded timestamp
      const roundedTime = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60 * 1000); // 5-minute buckets
      const dedupId = `${userId}_${eventType}_${roundedTime}`;
      
      // Check if this exact event was already processed
      const dedupRef = db.collection('spaces').doc(spaceId).collection('dedup').doc(dedupId);
      const dedupDoc = await dedupRef.get();
      
      if (dedupDoc.exists) {
        console.log(`Duplicate ${eventType} event detected for user ${userId} in space ${spaceId}, skipping`);
        return { success: true, eventId: null, duplicate: true };
      }
      
      // Mark this event as processed
      await dedupRef.set({
        userId,
        eventType,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        processed: true
      });
    }

    // Create event document
    const eventRef = db.collection('spaces').doc(spaceId).collection('analyticsEvents').doc();
    const eventDoc = {
      sessionId: sessionId || null,
      eventType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      userId,
      category: eventData.category || 'user_behavior',
      data: {
        ...eventData,
        // Server-side validation and sanitization
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        serverValidated: true
      },
      source: eventData.source || 'unknown'
    };

    await eventRef.set(eventDoc);

    // Update session if sessionId provided
    if (sessionId) {
      const sessionRef = db.collection('spaces').doc(spaceId).collection('analyticsSessions').doc(sessionId);
      await sessionRef.update({
        eventCount: admin.firestore.FieldValue.increment(1),
        lastActivityTime: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`Analytics event tracked: ${eventType} for user ${userId} in space ${spaceId}`);
    return { success: true, eventId: eventRef.id };

  } catch (error) {
    console.error('Error tracking analytics:', error);
    throw new HttpsError('internal', 'Failed to track analytics event');
  }
});

/**
 * Cloud Function to create analytics session
 * POST /createAnalyticsSession
 * Body: { spaceId, sessionData }
 */
exports.createAnalyticsSession = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to create analytics session');
  }

  const data = request.data;
  const { spaceId, sessionData } = data;
  const userId = request.auth.uid;

  if (!spaceId) {
    throw new HttpsError('invalid-argument', 'spaceId is required');
  }

  // Rate limiting: Prevent session spam
  await checkRateLimit(userId, 'sessionCreate', spaceId);

  try {
    const sessionRef = db.collection('spaces').doc(spaceId).collection('analyticsSessions').doc();
    const sessionDoc = {
      userId,
      spaceId,
      startTime: admin.firestore.FieldValue.serverTimestamp(),
      endTime: null,
      eventCount: 0,
      lastActivityTime: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      metadata: {
        ...sessionData,
        serverCreated: true
      }
    };

    await sessionRef.set(sessionDoc);

    console.log(`Analytics session created: ${sessionRef.id} for user ${userId} in space ${spaceId}`);
    return { success: true, sessionId: sessionRef.id };

  } catch (error) {
    console.error('Error creating analytics session:', error);
    throw new HttpsError('internal', 'Failed to create analytics session');
  }
});

/**
 * Cloud Function to end analytics session
 * POST /endAnalyticsSession
 * Body: { spaceId, sessionId }
 */
exports.endAnalyticsSession = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to end analytics session');
  }

  const data = request.data;
  const { spaceId, sessionId } = data;
  const userId = request.auth.uid;

  if (!spaceId || !sessionId) {
    throw new HttpsError('invalid-argument', 'spaceId and sessionId are required');
  }

  // Rate limiting: Use default limits
  await checkRateLimit(userId, 'default');

  try {
    const sessionRef = db.collection('spaces').doc(spaceId).collection('analyticsSessions').doc(sessionId);
    
    // Verify session belongs to user
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists || sessionDoc.data().userId !== userId) {
      throw new HttpsError('permission-denied', 'Session not found or access denied');
    }

    await sessionRef.update({
      endTime: admin.firestore.FieldValue.serverTimestamp(),
      isActive: false
    });

    console.log(`Analytics session ended: ${sessionId} for user ${userId} in space ${spaceId}`);
    return { success: true };

  } catch (error) {
    console.error('Error ending analytics session:', error);
    throw new HttpsError('internal', 'Failed to end analytics session');
  }
}); 