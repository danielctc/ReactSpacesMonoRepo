/**
 * Portal transition state management utility
 * Uses localStorage to persist portal navigation state across page transitions
 * Includes TTL-based expiration to prevent stale state
 */

const TRANSITION_KEY = 'portal_transition';
const TRANSITION_TTL = 30000; // 30 seconds

/**
 * Save portal transition state to localStorage
 *
 * @param {Object} data - Transition data
 * @param {string} data.fromSpaceId - ID of the space being left
 * @param {string} data.toSpaceId - ID of the destination space
 * @param {string} data.portalId - ID of the portal being used
 * @param {string} data.fromUrl - URL of the originating space
 * @returns {boolean} Success status
 */
export function saveTransition(data) {
  try {
    const transition = {
      fromSpaceId: data.fromSpaceId,
      toSpaceId: data.toSpaceId,
      portalId: data.portalId,
      fromUrl: data.fromUrl,
      timestamp: Date.now()
    };

    localStorage.setItem(TRANSITION_KEY, JSON.stringify(transition));
    return true;
  } catch (error) {
    // Handle localStorage errors (quota exceeded, incognito mode, etc.)
    console.error('Error saving portal transition:', error);
    return false;
  }
}

/**
 * Retrieve and validate portal transition state from localStorage
 * Returns null if no transition exists or if it has expired
 *
 * @returns {Object|null} Transition data or null if expired/missing
 */
export function getTransition() {
  try {
    const stored = localStorage.getItem(TRANSITION_KEY);

    if (!stored) {
      return null;
    }

    const transition = JSON.parse(stored);
    const now = Date.now();

    // Check if transition has expired
    if (now - transition.timestamp > TRANSITION_TTL) {
      clearTransition();
      return null;
    }

    return {
      fromSpaceId: transition.fromSpaceId,
      toSpaceId: transition.toSpaceId,
      portalId: transition.portalId,
      fromUrl: transition.fromUrl,
      timestamp: transition.timestamp
    };
  } catch (error) {
    // Handle JSON parse errors or localStorage access issues
    console.error('Error reading portal transition:', error);
    clearTransition(); // Clear corrupted data
    return null;
  }
}

/**
 * Remove portal transition data from localStorage
 * Safe to call even if no transition exists
 *
 * @returns {boolean} Success status
 */
export function clearTransition() {
  try {
    localStorage.removeItem(TRANSITION_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing portal transition:', error);
    return false;
  }
}

/**
 * Check if localStorage is available
 * Useful for SSR or environments where localStorage may not exist
 *
 * @returns {boolean} Whether localStorage is accessible
 */
export function isStorageAvailable() {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  saveTransition,
  getTransition,
  clearTransition,
  isStorageAvailable,
  TRANSITION_KEY,
  TRANSITION_TTL
};
