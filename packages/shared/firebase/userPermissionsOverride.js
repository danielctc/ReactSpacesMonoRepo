/**
 * ⚠️ SEVERE SECURITY RISK - DEVELOPMENT USE ONLY ⚠️
 * 
 * This file contains override functions that bypass normal security checks
 * and authorization controls. It is strictly for local development and testing.
 *
 * ⚠️ NEVER ENABLE THESE OVERRIDES IN PRODUCTION ⚠️
 * 
 * Enabling these overrides in production would:
 * 1. Grant unauthorized administrative access
 * 2. Allow users to bypass permission checks
 * 3. Create severe security vulnerabilities
 * 
 * The USE_PERMISSION_OVERRIDES flag in userPermissions.js MUST be set to false
 * in production environments.
 */

import { Logger } from '../logging/react-log';

/**
 * Override function for isSpaceOwner
 * Always returns true for testing purposes
 * 
 * @param {Object} user - The user object
 * @param {string} spaceId - The space ID
 * @returns {boolean} - Always true
 */
export const isSpaceOwner = (user, spaceId) => {
  Logger.log(`OVERRIDE: isSpaceOwner check for user ${user?.uid} and space ${spaceId} - Returning true`);
  return true;
};

/**
 * Override function for isSpaceHost
 * Always returns true for testing purposes
 * 
 * @param {Object} user - The user object
 * @param {string} spaceId - The space ID
 * @returns {boolean} - Always true
 */
export const isSpaceHost = (user, spaceId) => {
  console.log(`OVERRIDE: isSpaceHost check for user ${user?.uid} and space ${spaceId} - Returning true`);
  return true;
};

/**
 * Override function for userBelongsToGroup
 * Returns true for 'users' group, false for other groups
 * 
 * @param {string} userId - The user ID
 * @param {string} groupName - The group name
 * @returns {boolean} - True for 'users' group, false for others
 */
export const userBelongsToGroup = (userId, groupName) => {
  // Always return true for 'users' group
  if (groupName === 'users') {
    console.log(`OVERRIDE: userBelongsToGroup check for user ${userId} and group ${groupName} - Returning true`);
    return true;
  }
  
  // For admin groups, check if the user is in the list of admin UIDs
  if (groupName === 'disruptiveAdmin') {
    const adminUids = [
      'lppDQiMb3hhloApQ7llOtk5tckY2', // neil@pursey.net
      'XutdlDmDSncMBUw6vwlQGdkpjNr2', // tet@email.com
      'aMhQYu0ArucoNCc6pJJtyfRbn8k2', // josh@disruptive.live
      'fJVBogzjtTQqUHnYCYLhTt6jBW13', // andrew@andrew.com
      '9NrbbBoc2rOYQC3xAkRBDkig8eg1'  // andrew@disruptive.live
    ];
    
    const isAdmin = adminUids.includes(userId);
    console.log(`OVERRIDE: userBelongsToGroup check for user ${userId} and admin group ${groupName} - Returning ${isAdmin}`);
    return isAdmin;
  }
  
  // For other groups, return false
  console.log(`OVERRIDE: userBelongsToGroup check for user ${userId} and group ${groupName} - Returning false`);
  return false;
};

/**
 * Override function for userBelongsToSpaceGroup
 * Always returns true for testing purposes
 * 
 * @param {string} userId - The user ID
 * @param {string} spaceId - The space ID
 * @returns {boolean} - Always true
 */
export const userBelongsToSpaceGroup = (userId, spaceId) => {
  console.log(`OVERRIDE: userBelongsToSpaceGroup check for user ${userId} and space ${spaceId} - Returning true`);
  return true;
};

/**
 * Override function for isAdmin
 * Returns true only for specific admin UIDs
 * 
 * @param {Object} user - The user object
 * @returns {boolean} - True for admin UIDs, false for others
 */
export const isAdmin = (user) => {
  const adminUids = [
    'lppDQiMb3hhloApQ7llOtk5tckY2', // neil@pursey.net
    'XutdlDmDSncMBUw6vwlQGdkpjNr2', // tet@email.com
    'aMhQYu0ArucoNCc6pJJtyfRbn8k2', // josh@disruptive.live
    'fJVBogzjtTQqUHnYCYLhTt6jBW13', // andrew@andrew.com
    '9NrbbBoc2rOYQC3xAkRBDkig8eg1'  // andrew@disruptive.live
  ];
  
  const isAdmin = adminUids.includes(user?.uid);
  console.log(`OVERRIDE: isAdmin check for user ${user?.uid} - Returning ${isAdmin}`);
  return isAdmin;
};

/**
 * Override function for hasSpaceAccess
 * Always returns true for testing purposes
 * 
 * @param {Object} user - The user object
 * @param {string} spaceId - The space ID
 * @returns {boolean} - Always true
 */
export const hasSpaceAccess = (user, spaceId) => {
  console.log(`OVERRIDE: hasSpaceAccess check for user ${user?.uid} and space ${spaceId} - Returning true`);
  return true;
}; 