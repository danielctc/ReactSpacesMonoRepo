/**
 * Unity type definitions for React-Unity WebGL communication.
 */

/**
 * Unity provider configuration.
 */
export interface UnityConfig {
  loaderUrl: string;
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  streamingAssetsUrl?: string;
  companyName?: string;
  productName?: string;
  productVersion?: string;
}

/**
 * Unity provider state.
 */
export interface UnityProviderState {
  unityProvider: unknown;
  isLoaded: boolean;
  loadingProgression: number;
  error: Error | null;
  sendMessage: (gameObjectName: string, methodName: string, value?: unknown) => void;
  addEventListener: (eventName: string, callback: (...args: unknown[]) => void) => void;
  removeEventListener: (eventName: string, callback: (...args: unknown[]) => void) => void;
}

/**
 * Unity event data for Firebase user.
 */
export interface FirebaseUserData {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  rpmURL: string;
  firstName: string;
  lastName: string;
  Nickname: string;
  isGuest: boolean;
}

/**
 * Unity event for portal navigation.
 */
export interface PortalNavigateEvent {
  portalId: string;
  targetSpaceId: string;
  sourceSpaceId: string;
}

/**
 * Unity event for nameplate click.
 */
export interface NameplateClickEvent {
  playerName: string;
  playerId: string;
  uid?: string;
}

/**
 * Unity event for player instantiation.
 */
export interface PlayerInstantiatedEvent {
  playerId: string;
  isLocalPlayer: boolean;
}

/**
 * Unity event for player list update.
 */
export interface PlayerListUpdateEvent {
  players: UnityPlayerInfo[];
}

/**
 * Unity player info from Unity.
 */
export interface UnityPlayerInfo {
  playerId: string;
  playerName: string;
  uid?: string;
  isLocalPlayer: boolean;
}

/**
 * Unity media screen event.
 */
export interface MediaScreenEvent {
  screenId: string;
  imageUrl?: string;
  videoUrl?: string;
  action: 'load' | 'clear' | 'play' | 'pause';
}

/**
 * Unity catalogue item click event.
 */
export interface CatalogueItemClickEvent {
  itemId: string;
  itemName: string;
  position?: { x: number; y: number; z: number };
}

/**
 * Unity analytics event.
 */
export interface UnityAnalyticsEvent {
  eventType: string;
  category: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * WebGL settings passed to renderer.
 */
export interface WebGLRendererSettings {
  spaceID: string;
  urlLoadingBackground?: string;
  videoBackgroundUrl?: string;
  showAuthButton?: boolean;
  showDisruptiveLogo?: boolean;
  urlDisruptiveLogo?: string;
  showHelpButton?: boolean;
  enableVoiceChat?: boolean;
}
