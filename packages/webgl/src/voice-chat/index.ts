/**
 * Voice Chat Module
 *
 * Exports Normcore voice chat components, hooks, and providers.
 * Uses Unity WebGL messaging bridge for voice functionality.
 */

export { VoiceButton } from './components/VoiceButton';
export { startVoiceMockEmitter, stopVoiceMockEmitter } from './dev/voice-mock-emitter';
export { useVoiceChat } from './hooks/useVoiceChat';
export { VoiceContext, VoiceProvider, useVoiceContext } from './providers/VoiceProvider';

// Re-export types for convenience
export type {
  NormcoreUserSpeakingPayload,
  NormcoreVoiceStatePayload,
  VoiceActions,
  VoiceContextValue,
  VoiceState,
  VoiceUser,
} from '@disruptive-spaces/shared/types/voice-chat.types';
