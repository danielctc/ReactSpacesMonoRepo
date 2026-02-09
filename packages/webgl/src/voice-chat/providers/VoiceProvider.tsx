/**
 * VoiceProvider
 *
 * React context provider for Normcore voice chat.
 * Listens for Unity events and dispatches React→Unity commands.
 * Runs mock emitter in devMode for local testing without Unity.
 */

import type { ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type {
  NormcoreUserSpeakingPayload,
  NormcoreVoiceStatePayload,
  VoiceContextValue,
  VoiceUser,
} from '@disruptive-spaces/shared/types/voice-chat.types';

import { startVoiceMockEmitter, stopVoiceMockEmitter } from '../dev/voice-mock-emitter';

export const VoiceContext = createContext<VoiceContextValue | null>(null);

interface VoiceProviderProps {
  children: ReactNode;
  devMode?: boolean;
}

export function VoiceProvider({ children, devMode = false }: VoiceProviderProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<VoiceUser[]>([]);
  const [voiceDisabled, setVoiceDisabled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [micDeviceId, setMicDeviceId] = useState<string | null>(null);

  // Handle Unity → React: voice state changed
  useEffect(() => {
    const handleVoiceStateChanged = (event: Event) => {
      const customEvent = event as CustomEvent<NormcoreVoiceStatePayload>;
      const { isMuted: newMuted, connectedUsers: newUsers } = customEvent.detail;

      setIsMuted(newMuted);
      setConnectedUsers(newUsers);
      setIsConnected(newUsers.length > 0);
    };

    window.addEventListener('NormcoreVoiceStateChanged', handleVoiceStateChanged);
    return () => {
      window.removeEventListener('NormcoreVoiceStateChanged', handleVoiceStateChanged);
    };
  }, []);

  // Handle Unity → React: user speaking state
  useEffect(() => {
    const handleUserSpeaking = (event: Event) => {
      const customEvent = event as CustomEvent<NormcoreUserSpeakingPayload>;
      const { userId, volume } = customEvent.detail;

      setConnectedUsers(prev =>
        prev.map(user =>
          user.userId === userId
            ? { ...user, isSpeaking: volume > 0, volume }
            : user
        )
      );
    };

    window.addEventListener('NormcoreUserSpeaking', handleUserSpeaking);
    return () => {
      window.removeEventListener('NormcoreUserSpeaking', handleUserSpeaking);
    };
  }, []);

  // React → Unity: toggle mic mute
  const toggleMute = useCallback(() => {
    window.dispatchEvent(new CustomEvent('ToggleNormcoreMic'));
  }, []);

  // React → Unity: set mic device
  const setMicDevice = useCallback((deviceId: string) => {
    setMicDeviceId(deviceId);
    window.dispatchEvent(
      new CustomEvent('SetNormcoreMicDevice', {
        detail: { deviceId },
      })
    );
  }, []);

  // Start mock emitter in dev mode
  useEffect(() => {
    if (devMode) {
      startVoiceMockEmitter();
      return () => {
        stopVoiceMockEmitter();
      };
    }
  }, [devMode]);

  const value: VoiceContextValue = {
    isMuted,
    isSpeaking,
    connectedUsers,
    voiceDisabled,
    isConnected,
    micDeviceId,
    toggleMute,
    setMicDevice,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

const defaultVoiceContext: VoiceContextValue = {
  isMuted: true,
  isSpeaking: false,
  connectedUsers: [],
  voiceDisabled: true,
  isConnected: false,
  micDeviceId: null,
  toggleMute: () => {},
  setMicDevice: () => {},
};

export function useVoiceContext(): VoiceContextValue {
  const context = useContext(VoiceContext);
  return context ?? defaultVoiceContext;
}
