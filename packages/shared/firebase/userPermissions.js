import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getAuth } from 'firebase/auth';

/**
 * Checks if a user is an owner of a specific space based on user groups
 * 
 * @param {Object} user - The user object from UserContext
 * @param {string} spaceId - The ID of the space to check
 * @returns {Promise<boolean>} - True if the user is an owner of the space
 */
export const isSpaceOwner = async (user, spaceId) => {
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
 * Checks if the user belongs to a specific group
 * 
 * @param {Object} user - The user object from UserContext
 * @param {string} groupId - The ID of the group to check
 * @returns {Promise<boolean>} - True if the user belongs to the group
 */
export const userBelongsToGroup = async (user, groupId) => {
  if (!user || !user.uid) return false;
  
  try {
    // Check if user has groups property directly
    if (user.groups) {
      return user.groups.includes(groupId);
    }
    
    // If not, try to get the current Firebase Auth user and check their token claims
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (currentUser && currentUser.uid === user.uid) {
      const idTokenResult = await currentUser.getIdTokenResult(true);
      const groups = idTokenResult.claims.groups || [];
      return groups.includes(groupId);
    }
    
    return false;
  } catch (error) {
    Logger.error('Error checking group membership:', error);
    return false;
  }
}; 