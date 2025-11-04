const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Rate limiting configuration for different function types
 */
const RATE_LIMITS = {
  analytics: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute per user
    maxRequestsPerSpace: 500 // 500 requests per minute per space
  },
  chatCleanup: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5 // 5 requests per hour (even for admins)
  },
  sessionCreate: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10 // 10 new sessions per minute per user
  },
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // 60 requests per minute
  }
};

/**
 * Check rate limit for a user action
 * Uses Firestore to track request counts in time windows
 * 
 * @param {string} userId - The user ID to check
 * @param {string} actionType - Type of action (e.g., 'analytics', 'chatCleanup')
 * @param {string} resourceId - Optional resource ID (e.g., spaceId) for resource-specific limits
 * @returns {Promise<void>} - Throws HttpsError if rate limit exceeded
 */
async function checkRateLimit(userId, actionType, resourceId = null) {
  const config = RATE_LIMITS[actionType] || RATE_LIMITS.default;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Create a unique identifier for this rate limit check
  const limitKey = resourceId 
    ? `${userId}_${actionType}_${resourceId}`
    : `${userId}_${actionType}`;
  
  const rateLimitRef = db.collection('rateLimits').doc(limitKey);
  
  try {
    // Use a transaction to ensure atomic read-modify-write
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      
      if (!doc.exists) {
        // First request in this window
        transaction.set(rateLimitRef, {
          userId,
          actionType,
          resourceId,
          requests: [{
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            timestampMs: now
          }],
          windowStart: now,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      
      const data = doc.data();
      
      // Filter requests within the current window
      const recentRequests = (data.requests || []).filter(req => {
        const reqTime = req.timestampMs || 0;
        return reqTime > windowStart;
      });
      
      // Check if limit exceeded
      if (recentRequests.length >= config.maxRequests) {
        const oldestRequest = recentRequests[0]?.timestampMs || now;
        const waitTimeMs = config.windowMs - (now - oldestRequest);
        const waitTimeSec = Math.ceil(waitTimeMs / 1000);
        
        throw new HttpsError(
          'resource-exhausted',
          `Rate limit exceeded. Please wait ${waitTimeSec} seconds before trying again. ` +
          `(Limit: ${config.maxRequests} requests per ${config.windowMs / 1000} seconds)`
        );
      }
      
      // Add new request to the list
      recentRequests.push({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        timestampMs: now
      });
      
      // Update the document
      transaction.update(rateLimitRef, {
        requests: recentRequests,
        windowStart: now,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    console.log(`Rate limit check passed for user ${userId}, action: ${actionType}`);
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error checking rate limit:', error);
    // Don't block requests if rate limiting fails - log and continue
    console.warn('Rate limiting check failed, allowing request to proceed');
  }
}

/**
 * Check rate limit for a resource (e.g., space) regardless of user
 * Useful for preventing abuse on specific resources
 * 
 * @param {string} resourceId - The resource ID to check (e.g., spaceId)
 * @param {string} actionType - Type of action
 * @returns {Promise<void>} - Throws HttpsError if rate limit exceeded
 */
async function checkResourceRateLimit(resourceId, actionType) {
  const config = RATE_LIMITS[actionType] || RATE_LIMITS.default;
  
  // Use maxRequestsPerSpace if available, otherwise use maxRequests
  const maxRequests = config.maxRequestsPerSpace || config.maxRequests * 10;
  
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  const limitKey = `resource_${resourceId}_${actionType}`;
  const rateLimitRef = db.collection('rateLimits').doc(limitKey);
  
  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      
      if (!doc.exists) {
        transaction.set(rateLimitRef, {
          resourceId,
          actionType,
          requests: [{
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            timestampMs: now
          }],
          windowStart: now,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      
      const data = doc.data();
      const recentRequests = (data.requests || []).filter(req => {
        const reqTime = req.timestampMs || 0;
        return reqTime > windowStart;
      });
      
      if (recentRequests.length >= maxRequests) {
        const oldestRequest = recentRequests[0]?.timestampMs || now;
        const waitTimeMs = config.windowMs - (now - oldestRequest);
        const waitTimeSec = Math.ceil(waitTimeMs / 1000);
        
        throw new HttpsError(
          'resource-exhausted',
          `Resource rate limit exceeded. This resource is receiving too many requests. ` +
          `Please wait ${waitTimeSec} seconds. ` +
          `(Limit: ${maxRequests} requests per ${config.windowMs / 1000} seconds)`
        );
      }
      
      recentRequests.push({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        timestampMs: now
      });
      
      transaction.update(rateLimitRef, {
        requests: recentRequests,
        windowStart: now,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error checking resource rate limit:', error);
    console.warn('Resource rate limiting check failed, allowing request to proceed');
  }
}

/**
 * Clean up old rate limit documents
 * Should be called periodically (e.g., via scheduled function)
 * 
 * @param {number} maxAgeMs - Maximum age of rate limit documents to keep (default: 1 hour)
 * @returns {Promise<number>} - Number of documents deleted
 */
async function cleanupRateLimits(maxAgeMs = 60 * 60 * 1000) {
  const cutoffTime = Date.now() - maxAgeMs;
  
  const snapshot = await db.collection('rateLimits')
    .where('windowStart', '<', cutoffTime)
    .limit(500)
    .get();
  
  if (snapshot.empty) {
    return 0;
  }
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Cleaned up ${snapshot.size} old rate limit documents`);
  
  return snapshot.size;
}

module.exports = {
  checkRateLimit,
  checkResourceRateLimit,
  cleanupRateLimits,
  RATE_LIMITS
};


