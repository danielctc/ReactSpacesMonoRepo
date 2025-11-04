/**
 * Client-side rate limiting utility
 * Uses localStorage to track request timestamps and enforce rate limits
 * 
 * Note: This is a client-side protection only. Server-side rate limiting
 * should always be implemented as the primary defense.
 */

const RATE_LIMIT_STORAGE_KEY = 'rateLimits';

/**
 * Rate limit configurations for different actions
 */
const RATE_LIMITS = {
  guestUserCreate: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 10 // 10 guest user creations per minute (allows space switching/refreshing)
  },
  fileUpload: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 10 // 10 file uploads per minute
  },
  chatMessage: {
    windowMs: 10 * 1000, // 10 seconds
    maxAttempts: 20 // 20 messages per 10 seconds
  },
  spaceJoin: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 5 // 5 space joins per minute
  }
};

/**
 * Get stored rate limit data from localStorage
 * @returns {Object} Rate limit data
 */
function getRateLimitData() {
  try {
    const data = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading rate limit data:', error);
    return {};
  }
}

/**
 * Save rate limit data to localStorage
 * @param {Object} data - Rate limit data to save
 */
function saveRateLimitData(data) {
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving rate limit data:', error);
  }
}

/**
 * Check if an action is rate limited
 * 
 * @param {string} actionType - Type of action (e.g., 'guestUserCreate', 'fileUpload')
 * @param {string} identifier - Optional identifier for the action (e.g., spaceId)
 * @returns {Object} { allowed: boolean, retryAfter: number|null, message: string|null }
 */
export function checkClientRateLimit(actionType, identifier = '') {
  const config = RATE_LIMITS[actionType];
  
  if (!config) {
    console.warn(`No rate limit config for action type: ${actionType}`);
    return { allowed: true, retryAfter: null, message: null };
  }
  
  const now = Date.now();
  const key = identifier ? `${actionType}_${identifier}` : actionType;
  
  const rateLimitData = getRateLimitData();
  const actionData = rateLimitData[key] || { attempts: [] };
  
  // Filter out attempts outside the current window
  const windowStart = now - config.windowMs;
  const recentAttempts = actionData.attempts.filter(timestamp => timestamp > windowStart);
  
  // Check if limit exceeded
  if (recentAttempts.length >= config.maxAttempts) {
    const oldestAttempt = recentAttempts[0];
    const retryAfter = Math.ceil((oldestAttempt + config.windowMs - now) / 1000);
    
    return {
      allowed: false,
      retryAfter,
      message: `Too many attempts. Please wait ${retryAfter} seconds before trying again.`
    };
  }
  
  // Record this attempt
  recentAttempts.push(now);
  rateLimitData[key] = { attempts: recentAttempts };
  saveRateLimitData(rateLimitData);
  
  return { allowed: true, retryAfter: null, message: null };
}

/**
 * Clear rate limit data for a specific action
 * Useful for testing or manual reset
 * 
 * @param {string} actionType - Type of action to clear
 * @param {string} identifier - Optional identifier
 */
export function clearClientRateLimit(actionType, identifier = '') {
  const key = identifier ? `${actionType}_${identifier}` : actionType;
  const rateLimitData = getRateLimitData();
  delete rateLimitData[key];
  saveRateLimitData(rateLimitData);
}

/**
 * Clear all rate limit data
 * Useful for logout or session cleanup
 */
export function clearAllClientRateLimits() {
  try {
    localStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing rate limit data:', error);
  }
}

/**
 * Get remaining attempts for an action
 * 
 * @param {string} actionType - Type of action
 * @param {string} identifier - Optional identifier
 * @returns {number} Number of remaining attempts
 */
export function getRemainingAttempts(actionType, identifier = '') {
  const config = RATE_LIMITS[actionType];
  
  if (!config) {
    return 0;
  }
  
  const now = Date.now();
  const key = identifier ? `${actionType}_${identifier}` : actionType;
  
  const rateLimitData = getRateLimitData();
  const actionData = rateLimitData[key] || { attempts: [] };
  
  const windowStart = now - config.windowMs;
  const recentAttempts = actionData.attempts.filter(timestamp => timestamp > windowStart);
  
  return Math.max(0, config.maxAttempts - recentAttempts.length);
}

/**
 * Hook for React components to check rate limits
 * 
 * @param {string} actionType - Type of action
 * @param {string} identifier - Optional identifier
 * @returns {Function} Function to check if action is allowed
 */
export function useClientRateLimit(actionType, identifier = '') {
  return () => checkClientRateLimit(actionType, identifier);
}

export default {
  checkClientRateLimit,
  clearClientRateLimit,
  clearAllClientRateLimits,
  getRemainingAttempts,
  useClientRateLimit,
  RATE_LIMITS
};


