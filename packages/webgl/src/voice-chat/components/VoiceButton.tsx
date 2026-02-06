/**
 * VoiceButton
 *
 * DaisyUI button for toggling microphone mute state.
 * Shows visual feedback for muted/unmuted/speaking states.
 */

import React from 'react';
import { useVoiceChat } from '../hooks/useVoiceChat';

export function VoiceButton() {
  const { isMuted, isConnected, voiceDisabled, toggleMute } = useVoiceChat();

  const isLoading = !isConnected && !voiceDisabled;
  const isDisabled = voiceDisabled;

  // Mic icon SVG
  const MicIcon = ({ muted }: { muted: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      {muted && (
        <>
          <line x1="3" y1="3" x2="21" y2="21" className="stroke-red-500" strokeWidth="3" />
        </>
      )}
    </svg>
  );

  const tooltipText = isDisabled
    ? 'Voice disabled'
    : isLoading
    ? 'Connecting...'
    : isMuted
    ? 'Unmute microphone'
    : 'Mute microphone';

  const buttonClass = `btn btn-circle btn-ghost ${
    isMuted ? 'text-red-500 hover:text-red-600' : 'text-green-500 hover:text-green-600'
  }`;

  return (
    <div className="tooltip" data-tip={tooltipText}>
      <button
        type="button"
        className={buttonClass}
        onClick={toggleMute}
        disabled={isDisabled}
        aria-label={tooltipText}
      >
        {isLoading ? (
          <span className="loading loading-spinner loading-md"></span>
        ) : (
          <MicIcon muted={isMuted} />
        )}
      </button>
    </div>
  );
}
