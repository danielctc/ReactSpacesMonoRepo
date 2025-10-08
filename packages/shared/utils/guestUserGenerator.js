/**
 * Guest User Generator
 * 
 * Utility functions for generating guest users with random usernames and RPM URLs
 * Guest users follow the format: Visitor_XXXX where XXXX is a random 4-digit number
 */

import { Logger } from '@disruptive-spaces/shared/logging/react-log';

// Pool of Ready Player Me URLs for random selection
const RPM_URL_POOL = [
    "https://models.readyplayer.me/682b6c39994f7261dd46350d.glb", // Test Avatar (requested by user)
    "https://models.readyplayer.me/67c8408d38f7924e15a8bd0a.glb", // Default Avatar 1
    "https://models.readyplayer.me/67c8576838e3cf57cc697c15.glb", // Default Avatar 2
    "https://models.readyplayer.me/67c884144c4878c55e515ff5.glb", // Default Avatar 3
    "https://models.readyplayer.me/67c885af25f4d62e75c0ff1e.glb", // Default Avatar 4
    "https://models.readyplayer.me/67c8860f4c4878c55e5189b6.glb", // Default Avatar 5
    "https://models.readyplayer.me/67c8869db6d0b438b7abd822.glb", // Default Avatar 6
    "https://models.readyplayer.me/67c886ed28ee0e0bfac89688.glb", // Default Avatar 7
    "https://models.readyplayer.me/67c88731795ea3e2e6ea84db.glb", // Default Avatar 8
    "https://models.readyplayer.me/67c8878b0cdc0f22383f0f8f.glb", // Default Avatar 9
];

/**
 * Generates a random 4-digit number for guest usernames
 * @returns {string} - 4-digit number as string
 */
const generateRandomDigits = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Generates a guest username in the format Visitor_XXXX
 * @returns {string} - Guest username
 */
export const generateGuestUsername = () => {
    const digits = generateRandomDigits();
    return `Visitor_${digits}`;
};

/**
 * Selects a random RPM URL from the pool
 * @returns {string} - Random RPM URL
 */
export const getRandomRpmUrl = () => {
    // For testing, always return the first URL (the test avatar)
    // TODO: Remove this after testing and restore random selection
    return RPM_URL_POOL[0]; // Always use the test avatar for now
    
    // Original random selection code (commented out for testing):
    // const randomIndex = Math.floor(Math.random() * RPM_URL_POOL.length);
    // return RPM_URL_POOL[randomIndex];
};

/**
 * Generates a temporary guest user ID
 * @returns {string} - Temporary guest UID
 */
export const generateGuestUID = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `guest_${timestamp}_${randomSuffix}`;
};

/**
 * Creates a complete guest user object
 * @param {string} spaceId - The space ID the guest is entering
 * @returns {Object} - Complete guest user object
 */
export const createGuestUser = (spaceId) => {
    const guestUID = generateGuestUID();
    const username = generateGuestUsername();
    const rpmURL = getRandomRpmUrl();
    const timestamp = new Date().toISOString();
    
    const guestUser = {
        uid: guestUID,
        email: null,
        emailVerified: false,
        name: username, // Add name field for Unity compatibility
        username: username,
        Nickname: username, // Use same as username for guests
        displayName: username,
        firstName: "Guest",
        lastName: "User",
        companyName: "",
        linkedInProfile: "",
        rpmURL: rpmURL,
        groups: ['guests'], // Special group for guest users
        created_on: timestamp,
        isGuest: true,
        guestSpaceId: spaceId,
        guestSessionStart: timestamp,
        height_cm: null
    };
    
    Logger.log('guestUserGenerator: Created guest user:', {
        uid: guestUID,
        username: username,
        rpmURL: rpmURL,
        spaceId: spaceId
    });
    
    // Enhanced debugging for online vs local differences
    Logger.log('guestUserGenerator: FULL guest user object:', guestUser);
    Logger.log('guestUserGenerator: Environment check - window.location:', window.location.href);
    Logger.log('guestUserGenerator: Nickname field:', guestUser.Nickname);
    Logger.log('guestUserGenerator: rpmURL field:', guestUser.rpmURL);
    
    return guestUser;
};

/**
 * Checks if a user object is a guest user
 * @param {Object} user - User object to check
 * @returns {boolean} - True if user is a guest
 */
export const isGuestUser = (user) => {
    return user && (user.isGuest === true || (user.uid && user.uid.startsWith('guest_')));
};

/**
 * Gets the session duration for a guest user in minutes
 * @param {Object} guestUser - Guest user object
 * @returns {number} - Session duration in minutes
 */
export const getGuestSessionDuration = (guestUser) => {
    if (!isGuestUser(guestUser) || !guestUser.guestSessionStart) {
        return 0;
    }
    
    const startTime = new Date(guestUser.guestSessionStart);
    const currentTime = new Date();
    const durationMs = currentTime - startTime;
    
    return Math.floor(durationMs / (1000 * 60)); // Convert to minutes
};

/**
 * Checks if a guest session has expired
 * @param {Object} guestUser - Guest user object
 * @param {number} timeoutMinutes - Session timeout in minutes (default: 60)
 * @returns {boolean} - True if session has expired
 */
export const isGuestSessionExpired = (guestUser, timeoutMinutes = 60) => {
    const sessionDuration = getGuestSessionDuration(guestUser);
    return sessionDuration >= timeoutMinutes;
};
