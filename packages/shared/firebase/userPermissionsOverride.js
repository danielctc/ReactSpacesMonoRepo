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

import { Logger } from '@disruptive-spaces/shared/logging/react-log';

// ⚠️⚠️⚠️ SECURITY WARNING ⚠️⚠️⚠️
// Permission overrides should NEVER be used in production environments
// These functions bypass normal security checks and are intended ONLY for local development

// Store development admin UIDs in a single place for easier management
// In production, this list should be empty or the entire file should be disabled
const DEVELOPMENT_ADMIN_UIDS = [];

// For local development, you can add your UID here during development
// DO NOT commit your real UID to version control
// Example: 
// DEVELOPMENT_ADMIN_UIDS.push('your-firebase-uid-for-testing');

// Add more robust environment detection
export const isDevelopmentEnvironment = () => {
  // Check multiple conditions to ensure we're in a safe development environment
  const isDev = typeof process !== 'undefined' && 
                process.env && 
                process.env.NODE_ENV === 'development';
  
  const isLocalhost = typeof window !== 'undefined' && 
                      (window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1');
  
  // Additional safeguard: check for development-specific query param
  const hasDevFlag = typeof window !== 'undefined' && 
                     new URLSearchParams(window.location.search).has('dev_mode');
  
  // All conditions must be true for overrides to be enabled
  return isDev && isLocalhost && hasDevFlag;
};

/**
 * Override function for isSpaceOwner
 * Always returns true for testing purposes
 * 
 * @param {Object} user - The user object
 * @param {string} spaceId - The space ID
 * @returns {boolean} - Always true
 */
export const isSpaceOwner = (user, spaceId) => {
  if (!isDevelopmentEnvironment()) {
    Logger.warn('⚠️ SECURITY WARNING: Permission override attempted outside of development environment');
    return false;
  }
  
  Logger.warn(`⚠️ SECURITY OVERRIDE: Bypassing space owner check for user ${user?.uid} and space ${spaceId}`);
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
  if (!isDevelopmentEnvironment()) {
    Logger.warn('⚠️ SECURITY WARNING: Permission override attempted outside of development environment');
    return false;
  }
  
  Logger.warn(`⚠️ SECURITY OVERRIDE: Bypassing space host check for user ${user?.uid} and space ${spaceId}`);
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
  if (!isDevelopmentEnvironment()) {
    Logger.warn('⚠️ SECURITY WARNING: Permission override attempted outside of development environment');
    return false;
  }
  
  Logger.warn(`⚠️ SECURITY OVERRIDE: Bypassing group membership check for user ${userId} and group ${groupName}`);
  // Always return true for 'users' group
  if (groupName === 'users') {
    console.log(`OVERRIDE: userBelongsToGroup check for user ${userId} and group ${groupName} - Returning true`);
    return true;
  }
  
  // For admin groups, check if the user is in the list of admin UIDs
  if (groupName === 'disruptiveAdmin') {
    const isAdmin = DEVELOPMENT_ADMIN_UIDS.includes(userId);
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
  const isAdmin = DEVELOPMENT_ADMIN_UIDS.includes(user?.uid);
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
  if (!isDevelopmentEnvironment()) {
    Logger.warn('⚠️ SECURITY WARNING: Permission override attempted outside of development environment');
    return false;
  }
  
  Logger.warn(`⚠️ SECURITY OVERRIDE: Bypassing space access check for user ${user?.uid} and space ${spaceId}`);
  return true;
}; 