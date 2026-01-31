/**
 * User type definitions for the Spaces platform.
 */

/**
 * Public user profile data stored in Firestore.
 */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  Nickname: string;
  username: string;
  companyName?: string;
  linkedInProfile?: string;
  rpmURL: string;
  photoURL?: string;
  groups: string[];
  createdAt?: Date;
  lastUpdated?: Date;
}

/**
 * Private user data stored in users/{uid}/private/data subcollection.
 */
export interface UserPrivateData {
  email: string;
  emailVerified: boolean;
}

/**
 * Data required for user registration.
 */
export interface UserRegistrationData {
  firstName: string;
  lastName: string;
  Nickname: string;
  username?: string;
  companyName?: string;
  linkedInProfile?: string;
  rpmURL?: string;
}

/**
 * Firebase Auth user combined with Firestore profile.
 */
export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  profile?: UserProfile;
}

/**
 * User permission groups.
 */
export type UserGroup =
  | 'users'
  | 'disruptiveAdmin'
  | `space_${string}_owners`
  | `space_${string}_hosts`
  | string;

/**
 * User player data for Unity representation.
 */
export interface UnityPlayer {
  uid: string;
  playerName: string;
  playerId: string;
  isLocalPlayer: boolean;
  photoURL?: string;
}

/**
 * Nameplate click data from Unity.
 */
export interface NameplateData {
  playerName: string;
  playerId: string;
  uid?: string;
}
