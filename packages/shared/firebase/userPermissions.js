import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getAuth } from 'firebase/auth';
import { getUserProfileData } from './userFirestore';

// Import the override functions
import * as overrides from './userPermissionsOverride';

// OVERRIDE FLAG - Set to true to enable permission overrides
const USE_PERMISSION_OVERRIDES = true;

/**
 * Checks if a user is an owner of a specific space based on user groups
 * 
 * @param {Object} user - The user object from UserContext
 * @param {string} spaceId - The ID of the space to check
 * @returns {Promise<boolean>} - True if the user is an owner of the space
 */
export const isSpaceOwner = async (user, spaceId) => {
  // Use override if enabled
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.isSpaceOwner(user, spaceId);
  }
  
  if (!user || !user.uid) return false;
  
  try {
    // Check if user has groups property directly
    if (user.groups) {
      const ownerGroupId = `space_${spaceId}_owners`;
      const isOwner = user.groups.includes(ownerGroupId);
      if (isOwner) {
        console.log(`User ${user.uid} is an owner via groups property`);
        return true;
      }
    }
    
    // If not, try to get the current Firebase Auth user and check their token claims
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser && currentUser.uid === user.uid) {
      try {
        const idTokenResult = await currentUser.getIdTokenResult(true);
        const groups = idTokenResult.claims.groups || [];
        const ownerGroupId = `space_${spaceId}_owners`;
        const isOwner = groups.includes(ownerGroupId);
        if (isOwner) {
          console.log(`User ${user.uid} is an owner via Firebase token claims`);
          return true;
        }
      } catch (tokenError) {
        console.error("Error getting token result:", tokenError);
      }
    }
    
    // Only use dev admin UIDs if explicitly in development mode
    // This prevents incorrect role assignments in production
    if (typeof window !== 'undefined' && 
        window.ENABLE_DEV_ADMIN_OVERRIDE !== false && 
        (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost')) {
      // For development/testing, allow specific users to have owner access
      // This is a fallback when Firebase Auth custom claims are not set up
      const devAdminUids = [
        'lppDQiMb3hhloApQ7llOtk5tckY2', // neil@pursey.net
        'XutdlDmDSncMBUw6vwlQGdkpjNr2', // tet@email.com
        'aMhQYu0ArucoNCc6pJJtyfRbn8k2', // josh@disruptive.live
        'fJVBogzjtTQqUHnYCYLhTt6jBW13', // andrew@andrew.com
        '9NrbbBoc2rOYQC3xAkRBDkig8eg1'  // andrew@disruptive.live
      ];
      
      const isDevAdmin = devAdminUids.includes(user.uid);
      if (isDevAdmin) {
        console.log(`User ${user.uid} is an owner via dev admin override`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.error('Error checking space owner permissions:', error);
    return false;
  }
};

/**
 * Checks if a user is a host of a specific space based on user groups
 * 
 * @param {Object} user - The user object from UserContext
 * @param {string} spaceId - The ID of the space to check
 * @returns {Promise<boolean>} - True if the user is a host of the space
 */
export const isSpaceHost = async (user, spaceId) => {
  // Use override if enabled
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.isSpaceHost(user, spaceId);
  }
  
  if (!user || !user.uid) return false;
  
  try {
    // Check if user has groups property directly
    if (user.groups) {
      const hostGroupId = `space_${spaceId}_hosts`;
      return user.groups.includes(hostGroupId);
    }
    
    // If not, try to get the current Firebase Auth user and check their token claims
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser && currentUser.uid === user.uid) {
      const idTokenResult = await currentUser.getIdTokenResult(true);
      const groups = idTokenResult.claims.groups || [];
      const hostGroupId = `space_${spaceId}_hosts`;
      return groups.includes(hostGroupId);
    }
    
    return false;
  } catch (error) {
    Logger.error('Error checking space host permissions:', error);
    return false;
  }
};

/**
 * Checks if a user has any role (owner or host) in a specific space
 * 
 * @param {Object} user - The user object from UserContext
 * @param {string} spaceId - The ID of the space to check
 * @returns {Promise<boolean>} - True if the user has any role in the space
 */
export const hasSpaceAccess = async (user, spaceId) => {
  // Use override if enabled
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.hasSpaceAccess(user, spaceId);
  }
  
  if (!user || !user.uid) return false;
  
  try {
    const isOwner = await isSpaceOwner(user, spaceId);
    if (isOwner) return true;
    
    const isHost = await isSpaceHost(user, spaceId);
    return isHost;
  } catch (error) {
    Logger.error('Error checking space access permissions:', error);
    return false;
  }
};

/**
 * Checks if a user belongs to a specific group
 * @param {Object} user - The user object
 * @param {string} groupName - The name of the group to check
 * @returns {boolean} - True if the user belongs to the group, false otherwise
 */
export const userBelongsToGroup = async (userId, groupName) => {
  // Use override if enabled
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.userBelongsToGroup(userId, groupName);
  }
  
  try {
    // Add debug logging
    Logger.log(`userPermissions: Checking if user ${userId} belongs to group ${groupName}`);
    
    // TEMPORARY: For testing purposes, always return true for 'users' group
    if (groupName === 'users') {
      Logger.log(`userPermissions: TESTING MODE - Always allowing access to 'users' group for user ${userId}`);
      return true;
    }
    
    // First check if we have a user object with groups
    if (userId) {
      // Try to get the user profile data
      const userProfile = await getUserProfileData(userId);
      
      // Debug log the user profile
      Logger.log(`userPermissions: User profile for ${userId}:`, userProfile);
      
      // Check if the user has groups in their profile
      if (userProfile && userProfile.groups && Array.isArray(userProfile.groups)) {
        Logger.log(`userPermissions: User ${userId} has groups:`, userProfile.groups);
        
        if (userProfile.groups.includes(groupName)) {
          Logger.log(`userPermissions: User ${userId} belongs to group ${groupName} (from user document)`);
          return true;
        }
      } else {
        Logger.log(`userPermissions: User ${userId} has no groups or groups is not an array`);
      }
      
      // If we're checking for disruptiveAdmin, also check the token claims
      if (groupName === 'disruptiveAdmin') {
        try {
          // Get the current user's ID token
          const auth = getAuth();
          const currentUser = auth.currentUser;
          
          if (currentUser && currentUser.uid === userId) {
            const idTokenResult = await currentUser.getIdTokenResult();
            
            // Debug log the token claims
            Logger.log(`userPermissions: Token claims for ${userId}:`, idTokenResult.claims);
            
            // Check if the token has groups claim and if it includes the group
            if (idTokenResult.claims && 
                idTokenResult.claims.groups && 
                Array.isArray(idTokenResult.claims.groups) && 
                idTokenResult.claims.groups.includes(groupName)) {
              Logger.log(`userPermissions: User ${userId} belongs to group ${groupName} (from token claims)`);
              return true;
            }
          }
        } catch (tokenError) {
          Logger.error('userPermissions: Error checking token claims:', tokenError);
          // Continue with the function even if token check fails
        }
      }
    }
    
    Logger.log(`userPermissions: User ${userId} does not belong to group ${groupName}`);
    return false;
  } catch (error) {
    Logger.error('userPermissions: Error checking if user belongs to group:', error);
    return false;
  }
};

/**
 * Checks if a user belongs to a space-specific group (owner or host)
 * @param {string} userId - The user ID to check
 * @param {string} spaceId - The space ID
 * @returns {Promise<boolean>} - True if the user belongs to a space-specific group
 */
export const userBelongsToSpaceGroup = async (userId, spaceId) => {
  // Use override if enabled
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.userBelongsToSpaceGroup(userId, spaceId);
  }
  
  try {
    if (!userId || !spaceId) return false;
    
    // Get the user profile data
    const userProfile = await getUserProfileData(userId);
    
    // Check if the user has groups in their profile
    if (userProfile && userProfile.groups && Array.isArray(userProfile.groups)) {
      // Check for space-specific owner group
      const ownerGroupId = `space_${spaceId}_owners`;
      if (userProfile.groups.includes(ownerGroupId)) {
        Logger.log(`userPermissions: User ${userId} belongs to owner group for space ${spaceId}`);
        return true;
      }
      
      // Check for space-specific host group
      const hostGroupId = `space_${spaceId}_hosts`;
      if (userProfile.groups.includes(hostGroupId)) {
        Logger.log(`userPermissions: User ${userId} belongs to host group for space ${spaceId}`);
        return true;
      }
    }
    
    // Also check token claims for space-specific groups
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.uid === userId) {
        const idTokenResult = await currentUser.getIdTokenResult();
        
        if (idTokenResult.claims && idTokenResult.claims.groups && Array.isArray(idTokenResult.claims.groups)) {
          const ownerGroupId = `space_${spaceId}_owners`;
          const hostGroupId = `space_${spaceId}_hosts`;
          
          if (idTokenResult.claims.groups.includes(ownerGroupId) || 
              idTokenResult.claims.groups.includes(hostGroupId)) {
            Logger.log(`userPermissions: User ${userId} belongs to space group for space ${spaceId} (from token claims)`);
            return true;
          }
        }
      }
    } catch (tokenError) {
      Logger.error('userPermissions: Error checking token claims for space groups:', tokenError);
    }
    
    Logger.log(`userPermissions: User ${userId} does not belong to any space group for space ${spaceId}`);
    return false;
  } catch (error) {
    Logger.error('userPermissions: Error checking if user belongs to space group:', error);
    return false;
  }
}; 