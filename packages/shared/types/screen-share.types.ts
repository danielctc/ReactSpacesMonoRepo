/**
 * Screen share type definitions.
 * Browser-native WebRTC screen capture.
 * POC: local stream only, no peer connections.
 */

export interface ScreenShareState {
  isSharing: boolean;
  localStream: MediaStream | null;
}

export interface ScreenShareActions {
  startSharing: () => Promise<void>;
  stopSharing: () => void;
}

export interface ScreenShareContextValue extends ScreenShareState, ScreenShareActions {}
