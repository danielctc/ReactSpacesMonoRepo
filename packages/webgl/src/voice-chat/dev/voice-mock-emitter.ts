/**
 * voice-mock-emitter
 *
 * Simulates Unity Normcore voice events for local development.
 * Dispatches mock NormcoreVoiceStateChanged and NormcoreUserSpeaking events.
 */

import type {
  VoiceUser,
  NormcoreVoiceStatePayload,
  NormcoreUserSpeakingPayload,
} from '@disruptive-spaces/shared/types/voice-chat.types';

const MOCK_USERS: VoiceUser[] = [
  {
    userId: 'mock-user-1',
    nickname: 'Alice',
    isMuted: false,
    isSpeaking: false,
    volume: 0,
  },
  {
    userId: 'mock-user-2',
    nickname: 'Bob',
    isMuted: false,
    isSpeaking: false,
    volume: 0,
  },
  {
    userId: 'mock-user-3',
    nickname: 'Charlie',
    isMuted: true,
    isSpeaking: false,
    volume: 0,
  },
];

let intervalId: ReturnType<typeof setInterval> | null = null;
let currentUsers = [...MOCK_USERS];

export function startVoiceMockEmitter() {
  if (intervalId) {
    console.warn('[VoiceMockEmitter] Already running');
    return;
  }

  console.log('[VoiceMockEmitter] Starting mock voice events');

  // Initial state
  const initialPayload: NormcoreVoiceStatePayload = {
    isMuted: false,
    connectedUsers: currentUsers,
  };

  window.dispatchEvent(
    new CustomEvent('NormcoreVoiceStateChanged', {
      detail: initialPayload,
    })
  );

  // Simulate speaking events every 2 seconds
  intervalId = setInterval(() => {
    // Randomly pick a user
    const randomIndex = Math.floor(Math.random() * currentUsers.length);
    const randomUser = currentUsers[randomIndex];

    // Toggle speaking state
    const isSpeaking = Math.random() > 0.5;
    const volume = isSpeaking ? Math.random() * 100 : 0;

    const speakingPayload: NormcoreUserSpeakingPayload = {
      userId: randomUser.userId,
      volume,
    };

    window.dispatchEvent(
      new CustomEvent('NormcoreUserSpeaking', {
        detail: speakingPayload,
      })
    );

    console.log(
      `[VoiceMockEmitter] ${randomUser.nickname} ${isSpeaking ? 'speaking' : 'stopped'} (volume: ${volume.toFixed(2)})`
    );
  }, 2000);

  // Listen for React → Unity commands and log them
  const handleToggleMic = () => {
    console.log('[VoiceMockEmitter] Received: ToggleNormcoreMic');
    // In real Unity, this would toggle the mic. Here we just log.
  };

  const handleSetMicDevice = (event: Event) => {
    const customEvent = event as CustomEvent<{ deviceId: string }>;
    console.log('[VoiceMockEmitter] Received: SetNormcoreMicDevice', customEvent.detail);
  };

  window.addEventListener('ToggleNormcoreMic', handleToggleMic);
  window.addEventListener('SetNormcoreMicDevice', handleSetMicDevice);

  // Store cleanup listeners
  interface WindowWithCleanup extends Window {
    __voiceMockEmitterCleanup?: () => void;
  }
  (window as WindowWithCleanup).__voiceMockEmitterCleanup = () => {
    window.removeEventListener('ToggleNormcoreMic', handleToggleMic);
    window.removeEventListener('SetNormcoreMicDevice', handleSetMicDevice);
  };
}

export function stopVoiceMockEmitter() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[VoiceMockEmitter] Stopped');
  }

  // Clean up listeners
  interface WindowWithCleanup extends Window {
    __voiceMockEmitterCleanup?: () => void;
  }
  const cleanupWindow = window as WindowWithCleanup;
  if (typeof cleanupWindow.__voiceMockEmitterCleanup === 'function') {
    cleanupWindow.__voiceMockEmitterCleanup();
    delete cleanupWindow.__voiceMockEmitterCleanup;
  }

  currentUsers = [...MOCK_USERS];
}
