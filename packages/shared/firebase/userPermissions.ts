/**
 * User permissions and group membership checks.
 * @module userPermissions
 */

import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getAuth, type User as FirebaseUser } from 'firebase/auth';
import { getUserProfileData } from './userFirestore';
import * as overrides from './userPermissionsOverride';
import type { UserProfile } from '../types/user.types';

/**
 * Minimal user interface for permission checks.
 */
interface PermissionUser {
  uid: string;
  groups?: string[];
}

// SECURITY WARNING: Permission overrides should NEVER be enabled in production
const USE_PERMISSION_OVERRIDES =
  typeof overrides.isDevelopmentEnvironment === 'function'
    ? overrides.isDevelopmentEnvironment()
    : false;

if (USE_PERMISSION_OVERRIDES) {
  Logger.warn(
    '⚠️ SECURITY WARNING: Permission overrides are ENABLED. This should only happen in development.'
  );
}

/**
 * Checks if a user is an owner of a specific space based on user groups.
 *
 * @param user - The user object from UserContext
 * @param spaceId - The ID of the space to check
 * @returns True if the user is an owner of the space
 */
export const isSpaceOwner = async (
  user: PermissionUser | null | undefined,
  spaceId: string
): Promise<boolean> => {
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.isSpaceOwner(user, spaceId);
  }

  if (!user?.uid) return false;

  try {
    if (user.groups) {
      const ownerGroupId = `space_${spaceId}_owners`;
      if (user.groups.includes(ownerGroupId)) {
        return true;
      }
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser && currentUser.uid === user.uid) {
      try {
        const idTokenResult = await currentUser.getIdTokenResult(true);
        const groups = (idTokenResult.claims.groups as string[]) || [];
        const ownerGroupId = `space_${spaceId}_owners`;
        if (groups.includes(ownerGroupId)) {
          return true;
        }
      } catch (tokenError) {
        console.error('Error getting token result:', tokenError);
      }
    }

    return false;
  } catch (error) {
    Logger.error('Error checking space owner permissions:', error);
    return false;
  }
};

/**
 * Checks if a user is a host of a specific space based on user groups.
 *
 * @param user - The user object from UserContext
 * @param spaceId - The ID of the space to check
 * @returns True if the user is a host of the space
 */
export const isSpaceHost = async (
  user: PermissionUser | null | undefined,
  spaceId: string
): Promise<boolean> => {
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.isSpaceHost(user, spaceId);
  }

  if (!user?.uid) return false;

  try {
    if (user.groups) {
      const hostGroupId = `space_${spaceId}_hosts`;
      return user.groups.includes(hostGroupId);
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser && currentUser.uid === user.uid) {
      const idTokenResult = await currentUser.getIdTokenResult(true);
      const groups = (idTokenResult.claims.groups as string[]) || [];
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
 * Checks if a user has any role (owner or host) in a specific space.
 *
 * @param user - The user object from UserContext
 * @param spaceId - The ID of the space to check
 * @returns True if the user has any role in the space
 */
export const hasSpaceAccess = async (
  user: PermissionUser | null | undefined,
  spaceId: string
): Promise<boolean> => {
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.hasSpaceAccess(user, spaceId);
  }

  if (!user?.uid) return false;

  try {
    const isOwner = await isSpaceOwner(user, spaceId);
    if (isOwner) return true;

    return await isSpaceHost(user, spaceId);
  } catch (error) {
    Logger.error('Error checking space access permissions:', error);
    return false;
  }
};

/**
 * Checks if a user belongs to a specific group.
 *
 * @param userId - The user ID to check
 * @param groupName - The name of the group to check
 * @returns True if the user belongs to the group
 */
export const userBelongsToGroup = async (
  userId: string | null | undefined,
  groupName: string
): Promise<boolean> => {
  if (USE_PERMISSION_OVERRIDES) {
    return overrides.userBelongsToGroup(userId, groupName);
  }

  try {
    Logger.log(`userPermissions: Checking if user ${userId} belongs to group ${groupName}`);

    // TEMPORARY: For testing purposes, always return true for 'users' group
    if (groupName === 'users') {
      Logger.log(
        `userPermissions: TESTING MODE - Always allowing access to 'users' group for user ${userId}`
      );
      return true;
    }

    if (userId) {
      const userProfile = (await getUserProfileData(userId)) as UserProfile | null;

      Logger.log(`userPermissions: User profile for ${userId}:`, userProfile);

      if (userProfile?.groups && Array.isArray(userProfile.groups)) {
        Logger.log(`userPermissions: User ${userId} has groups:`, userProfile.groups);

        if (userProfile.groups.includes(groupName)) {
          Logger.log(
            `userPermissions: User ${userId} belongs to group ${groupName} (from user document)`
          );
          return true;
        }
      } else {
        Logger.log(`userPermissions: User ${userId} has no groups or groups is not an array`);
      }

      // Check token claims for disruptiveAdmin
      if (groupName === 'disruptiveAdmin') {
        try {
          const auth = getAuth();
          const currentUser = auth.currentUser;

          if (currentUser && currentUser.uid === userId) {
            const idTokenResult = await currentUser.getIdTokenResult();

            Logger.log(`userPermissions: Token claims for ${userId}:`, idTokenResult.claims);

            const tokenGroups = idTokenResult.claims.groups;
            if (tokenGroups && Array.isArray(tokenGroups) && tokenGroups.includes(groupName)) {
              Logger.log(
                `userPermissions: User ${userId} belongs to group ${groupName} (from token claims)`
              );
              return true;
            }
          }
        } catch (tokenError) {
          Logger.error('userPermissions: Error checking token claims:', tokenError);
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
 * Checks if a user belongs to a space-specific group (owner or host).
 *
 * @param userId - The user ID to check
 * @param spaceId - The space ID
 * @returns True if the user belongs to a space-specific group
 */
export const userBelongsToSpaceGroup = async (
  userId: string | null | undefined,
  spaceId: string
): Promise<boolean> => {
  try {
    if (!userId || !spaceId) return false;

    const userProfile = (await getUserProfileData(userId)) as UserProfile | null;

    if (userProfile?.groups && Array.isArray(userProfile.groups)) {
      const ownerGroupId = `space_${spaceId}_owners`;
      if (userProfile.groups.includes(ownerGroupId)) {
        Logger.log(`userPermissions: User ${userId} belongs to owner group for space ${spaceId}`);
        return true;
      }

      const hostGroupId = `space_${spaceId}_hosts`;
      if (userProfile.groups.includes(hostGroupId)) {
        Logger.log(`userPermissions: User ${userId} belongs to host group for space ${spaceId}`);
        return true;
      }
    }

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.uid === userId) {
        const idTokenResult = await currentUser.getIdTokenResult();

        const tokenGroups = idTokenResult.claims.groups;
        if (tokenGroups && Array.isArray(tokenGroups)) {
          const ownerGroupId = `space_${spaceId}_owners`;
          const hostGroupId = `space_${spaceId}_hosts`;

          if (tokenGroups.includes(ownerGroupId) || tokenGroups.includes(hostGroupId)) {
            Logger.log(
              `userPermissions: User ${userId} belongs to space group for space ${spaceId} (from token claims)`
            );
            return true;
          }
        }
      }
    } catch (tokenError) {
      Logger.error('userPermissions: Error checking token claims for space groups:', tokenError);
    }

    Logger.log(
      `userPermissions: User ${userId} does not belong to any space group for space ${spaceId}`
    );
    return false;
  } catch (error) {
    Logger.error('userPermissions: Error checking if user belongs to space group:', error);
    return false;
  }
};
