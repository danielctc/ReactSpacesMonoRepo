/**
 * OverlayControls - Top-right control buttons for WebGL.
 *
 * Integrates voice chat and screen sharing providers with authentication
 * and space management controls.
 */

import React from 'react';
import { FaWrench } from 'react-icons/fa';
import AuthenticationButton from '../../components/AuthenticationButton';
import ProfileButton from '../../components/ProfileButton';
import LiveStreamButton from '../../components/LiveStreamButton';
import { CanvasMainMenu } from '../../components/CanvasMainMenu';
import { VoiceProvider, VoiceButton } from '../../voice-chat';
import { ScreenShareProvider, ScreenShareDisplay } from '../../screen-share';

interface OverlayControlsProps {
  user: {
    uid: string;
    [key: string]: unknown;
  } | null;
  userProfile?: {
    Nickname?: string;
    [key: string]: unknown;
  } | null;
  sessionId: string;
  spaceID: string;
  canEditSpace: boolean;
  isEditMode: boolean;
  showVoiceChat: boolean;
  unityContainerRef: React.RefObject<HTMLDivElement>;
  onEditModeClick: () => void;
  onTogglePlayerList: () => void;
}

const OverlayControls: React.FC<OverlayControlsProps> = ({
  user,
  userProfile,
  sessionId,
  spaceID,
  canEditSpace,
  isEditMode,
  showVoiceChat,
  unityContainerRef,
  onEditModeClick,
  onTogglePlayerList,
}) => {
  return (
    <div className="absolute z-[100] top-4 right-4 flex items-center gap-2 pointer-events-auto">
      <AuthenticationButton />

      {/* Live Stream Button */}
      {user && <LiveStreamButton size="md" />}

      {/* Voice Chat & Screen Share */}
      {showVoiceChat && (
        <VoiceProvider devMode={true}>
          <ScreenShareProvider>
            <VoiceButton />
            <ScreenShareDisplay />
          </ScreenShareProvider>
        </VoiceProvider>
      )}

      {/* Edit Mode Button */}
      {canEditSpace && (
        <button
          onClick={onEditModeClick}
          aria-label="Edit Mode"
          className={`
            btn btn-circle btn-ghost
            relative w-12 h-12
            text-white
            backdrop-blur-[30px] backdrop-saturate-200 backdrop-brightness-110
            transition-all duration-300 ease-in-out
            border
            ${
              isEditMode
                ? 'bg-gradient-to-br from-black/45 via-sky-500/20 to-black/35 border-sky-500/40 shadow-[0_0_20px_2px_rgba(0,150,255,0.8),0_0_40px_4px_rgba(0,150,255,0.4)]'
                : 'bg-gradient-to-br from-black/50 to-neutral-900/40 border-white/20 shadow-[0_4px_15px_rgba(0,0,0,0.3)]'
            }
            hover:scale-105 hover:backdrop-blur-[35px] hover:backdrop-saturate-[220%] hover:backdrop-brightness-115
            ${
              isEditMode
                ? 'hover:from-black/55 hover:via-sky-500/30 hover:to-black/45'
                : 'hover:from-black/60 hover:to-neutral-900/50'
            }
            before:content-[''] before:absolute before:inset-0 before:rounded-full before:p-[1px]
            before:pointer-events-none
            ${
              isEditMode
                ? 'before:bg-gradient-to-br before:from-sky-500/50 before:to-sky-400/20'
                : 'before:bg-gradient-to-br before:from-white/30 before:to-white/10'
            }
            before:[mask-composite:exclude] before:[-webkit-mask-composite:xor]
            before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]
            before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]
          `}
          style={{
            boxShadow: isEditMode
              ? '0 0 20px 2px rgba(0, 150, 255, 0.8), 0 0 40px 4px rgba(0, 150, 255, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.3)'
              : '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.2)',
          }}
        >
          <FaWrench size="20px" />
        </button>
      )}

      <ProfileButton />

      <div className="relative z-[200]">
        <CanvasMainMenu
          onTogglePlayerList={onTogglePlayerList}
          spaceID={spaceID}
          containerRef={unityContainerRef}
        />
      </div>
    </div>
  );
};

export default OverlayControls;
