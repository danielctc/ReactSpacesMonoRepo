/**
 * useVoiceChat
 *
 * Convenience hook wrapping useVoiceContext.
 * Maintains API compatibility with old Agora-based hook consumers.
 */

import type { VoiceContextValue } from '@disruptive-spaces/shared/types/voice-chat.types';

import { useVoiceContext } from '../providers/VoiceProvider';

export function useVoiceChat(): VoiceContextValue {
  return useVoiceContext();
}
