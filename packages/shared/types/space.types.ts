/**
 * Space type definitions for the Spaces platform.
 */

/**
 * WebGL build configuration for Unity.
 */
export interface WebGLBuildConfig {
  loaderUrl: string;
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl?: string;
  name?: string;
  description?: string;
}

/**
 * Space settings for permissions and access control.
 */
export interface SpaceSettings {
  isPublic: boolean;
  accessibleToAllUsers: boolean;
  allowGuestUsers: boolean;
  hideGuestSignInButton?: boolean;
  voiceDisabled: boolean;
  textChatDisabled: boolean;
}

/**
 * Space branding/appearance settings.
 */
export interface SpaceBranding {
  logoUrl?: string;
  logoGsUrl?: string;
  backgroundUrl?: string;
  backgroundGsUrl?: string;
  videoBackgroundUrl?: string;
  videoBackgroundGsUrl?: string;
}

/**
 * Space streaming configuration.
 */
export interface SpaceStreamingConfig {
  streamingEnabled: boolean;
  hlsStreamUrl?: string;
  rtmpUrl?: string;
  streamKey?: string;
}

/**
 * Space override/custom settings.
 */
export interface SpaceOverrideConfig {
  overrideEnabled: boolean;
  customPlayers?: string[];
}

/**
 * Complete space data from Firestore.
 */
export interface Space extends SpaceSettings, SpaceBranding, SpaceStreamingConfig, SpaceOverrideConfig, WebGLBuildConfig {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  webglBuildId?: string;

  // User permissions
  usersAllowed: string[];
  userAdmin: string[];
  usersModerators: string[];
  bannedUsers?: string[];

  // Timestamps
  createdAt?: Date;
  lastUpdated?: Date;
}

/**
 * Space item summary for lists.
 */
export interface SpaceSummary {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  logoUrl?: string;
  isPublic: boolean;
}

/**
 * Portal data for space navigation.
 */
export interface SpacePortal {
  portalId: string;
  targetSpaceId: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  displayName?: string;
  isActive: boolean;
}

/**
 * Media screen data for Unity.
 */
export interface MediaScreen {
  id: string;
  screenId: string;
  imageUrl?: string;
  videoUrl?: string;
  isActive: boolean;
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Catalogue item for spaces.
 */
export interface CatalogueItem {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  modelUrl?: string;
  price?: number;
  isActive: boolean;
}
