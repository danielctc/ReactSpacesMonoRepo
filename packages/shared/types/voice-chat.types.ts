/**
 * Voice chat type definitions.
 * Consumed by VoiceProvider (webgl) and UI components.
 * Voice runs in Unity via Normcore — React controls UI only.
 */

export interface VoiceUser {
  userId: string;
  nickname: string;
  isMuted: boolean;
  isSpeaking: boolean;
  volume: number;
}

export interface VoiceState {
  isMuted: boolean;
  isSpeaking: boolean;
  connectedUsers: VoiceUser[];
  voiceDisabled: boolean;
  isConnected: boolean;
  micDeviceId: string | null;
}

export interface VoiceActions {
  toggleMute: () => void;
  setMicDevice: (deviceId: string) => void;
}

export interface VoiceContextValue extends VoiceState, VoiceActions {}

/** Unity → React event payloads */
export interface NormcoreVoiceStatePayload {
  isMuted: boolean;
  connectedUsers: VoiceUser[];
}

export interface NormcoreUserSpeakingPayload {
  userId: string;
  volume: number;
}
