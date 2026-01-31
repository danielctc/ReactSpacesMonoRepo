import React from 'react';
import { Box } from '@chakra-ui/react';
import { FaWrench } from 'react-icons/fa';
import AuthenticationButton from '../../components/AuthenticationButton';
import ProfileButton from '../../components/ProfileButton';
import LiveStreamButton from '../../components/LiveStreamButton';
import { CanvasMainMenu } from '../../components/CanvasMainMenu';
import { AgoraProvider, VoiceButton, ScreenShareDisplay } from '../../voice-chat';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';

/**
 * OverlayControls - Top-right control buttons for WebGL.
 */
const OverlayControls = ({
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
    <Box
      position="absolute"
      zIndex="10"
      top={4}
      right={4}
      display="flex"
      alignItems="center"
      gap={2}
    >
      <AuthenticationButton />

      {/* Live Stream Button */}
      {user && <LiveStreamButton size="md" />}

      {/* Voice Chat */}
      {showVoiceChat && (
        <AgoraProvider
          appId={AGORA_APP_ID}
          channel={sessionId}
          uid={user?.uid}
          enabled={true}
        >
          <VoiceButton size="md" defaultMuted={true} joinOnClick={true} />
          <ScreenShareDisplay userNickname={userProfile?.Nickname} />
        </AgoraProvider>
      )}

      {/* Edit Mode Button */}
      {canEditSpace && (
        <Box
          as="button"
          onClick={onEditModeClick}
          aria-label="Edit Mode"
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="48px"
          height="48px"
          color="white"
          bg={
            isEditMode
              ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.45), rgba(0, 150, 255, 0.2), rgba(0, 0, 0, 0.35))'
              : 'linear-gradient(135deg, rgba(0, 0, 0, 0.5), rgba(20, 20, 20, 0.4))'
          }
          backdropFilter="blur(30px) saturate(200%) brightness(1.1)"
          _hover={{
            bg: isEditMode
              ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.55), rgba(0, 150, 255, 0.3), rgba(0, 0, 0, 0.45))'
              : 'linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(20, 20, 20, 0.5))',
            transform: 'scale(1.05)',
            backdropFilter: 'blur(35px) saturate(220%) brightness(1.15)',
          }}
          cursor="pointer"
          boxShadow={
            isEditMode
              ? '0 0 20px 2px rgba(0, 150, 255, 0.8), 0 0 40px 4px rgba(0, 150, 255, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.3)'
              : '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.2)'
          }
          transition="all 0.3s ease"
          border="1px solid"
          borderColor={isEditMode ? 'rgba(0, 150, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'}
          borderRadius="full"
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 'full',
            padding: '1px',
            background: isEditMode
              ? 'linear-gradient(135deg, rgba(0, 150, 255, 0.5), rgba(0, 200, 255, 0.2))'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }}
        >
          <FaWrench size="20px" />
        </Box>
      )}

      <ProfileButton />

      <Box position="relative" zIndex="9999">
        <CanvasMainMenu
          onTogglePlayerList={onTogglePlayerList}
          spaceID={spaceID}
          containerRef={unityContainerRef}
        />
      </Box>
    </Box>
  );
};

export default OverlayControls;
