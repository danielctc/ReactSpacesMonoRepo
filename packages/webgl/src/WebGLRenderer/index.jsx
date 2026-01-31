import React, { forwardRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Image, PortalManager, Text } from '@chakra-ui/react';
import { Unity } from 'react-unity-webgl';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';

// Hooks
import { useSendUnityEvent } from '../hooks/unityEvents';
import { useUnityOnPortalClick } from '../hooks/unityEvents/useUnityOnPortalClick';
import { useUnityOnPortalNavigate } from '../hooks/unityEvents/useUnityOnPortalNavigate';
import { useUnityMediaScreenImages } from '../hooks/unityEvents/useUnityMediaScreenImages';
import { useUnityThumbnails } from '../hooks/unityEvents/useUnityThumbnails';
import { useSpacePortals } from '../hooks/unityEvents/index';
import { useSpaceCatalogueItems } from '../hooks/unityEvents/useSpaceCatalogueItems';
import { useUnityOnCatalogueItemClick } from '../hooks/unityEvents/useUnityOnCatalogueItemClick';
import { useUnityAnalytics } from '../hooks/unityEvents/useUnityAnalytics';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { useAutoAvatarSync } from '../hooks/useAutoAvatarSync';

// Local hooks
import { useWebGLState, useKeyboardFocus, useAuthCheck, useEditMode } from './hooks';

// Components
import { OverlayControls, PortalPromptModal } from './components';
import LoaderProgress from '../components/Loader/LoaderProgress';
import HelpButton from '../components/HelpButton';
import FullScreenButton from '../components/FullScreenButton';
import VideoPlayer from '../components/VideoPlayer';
import NameplateModal from '../components/NameplateModal';
import UnityPlayerList from '../components/UnityPlayerList';
import MediaScreenController from '../components/MediaScreenController';
import PersistentBackground from '../components/PersistentBackground';
import PersistentLoader from '../components/PersistentLoader';
import SignIn from '@disruptive-spaces/shared/components/auth/SignIn';
import PortalEditor from '../components/PortalEditor';
import PortalController from '../components/PortalController';
import CatalogueItemModalHandler from '../components/CatalogueItemModalHandler';
import ContentAdminModal from '../components/ContentAdminModal';
import WebGLChatWindow from '../components/chat/WebGLChatWindow';

/**
 * WebGLRenderer - Main Unity WebGL rendering component.
 * Refactored from 1046 lines to modular hooks and components.
 */
const WebGLRenderer = forwardRef(({ settings }, ref) => {
  const spaceID = settings.spaceID || 'default';

  // Core state hook
  const {
    unityProvider,
    isLoaded,
    error,
    isFirstSceneLoaded,
    fadeStyles,
    devicePixelRatio,
    players,
    localPlayer,
    isPlayerInstantiated,
    isPlayerListVisible,
    setIsPlayerListVisible,
    handlePlayerListToggle,
    nameplateData,
    resetNameplateData,
    sessionId,
    unityContainerRef,
  } = useWebGLState(spaceID);

  // Keyboard focus hook
  const { isModalOpen, setIsModalOpen } = useKeyboardFocus(isLoaded, unityProvider, nameplateData);

  // Auth hook
  const { user, userProfile, canEditSpace, showSignInModal, setShowSignInModal } = useAuthCheck(
    spaceID,
    error,
    setIsModalOpen
  );

  // Edit mode hook
  const {
    isEditMode,
    setIsEditMode,
    isContentAdminOpen,
    handleEditModeButtonClick,
    handleCloseContentAdmin,
  } = useEditMode(canEditSpace, setIsModalOpen);

  // Unity messaging
  const sendUnityEvent = useSendUnityEvent();

  // Portal hooks
  useUnityOnPortalNavigate();
  useSpacePortals(spaceID);
  const { clickedPortal, clearClickedPortal } = useUnityOnPortalClick();
  const [isPortalEditorOpen, setIsPortalEditorOpen] = useState(false);
  const [showPortalPrompt, setShowPortalPrompt] = useState(false);
  const [targetSpaceName, setTargetSpaceName] = useState('');
  const [targetSpaceSlug, setTargetSpaceSlug] = useState('');

  // Analytics
  useUnityAnalytics(spaceID, { enableDebugLogs: true });
  const { trackUnityEvent } = useAnalytics(spaceID, { enableDebugLogs: true });

  // Media hooks
  useUnityMediaScreenImages();
  useUnityThumbnails();

  // Catalogue hooks
  useSpaceCatalogueItems(spaceID);
  const { clickedItem, clearClickedItem } = useUnityOnCatalogueItemClick();

  // Auto-sync avatar to Unity on player spawn
  useAutoAvatarSync();

  // Fullscreen setup
  const { setFullscreenRef, fullscreenRef } = useFullscreenContext();

  useEffect(() => {
    setFullscreenRef(ref.current);
  }, [ref, setFullscreenRef]);

  // Handle user data sending to Unity
  useEffect(() => {
    const handleSendUserToUnity = (userData) => {
      sendUnityEvent('FirebaseUserFromReact', userData);
    };

    eventBus.subscribe(EventNames.sendUserToUnity, handleSendUserToUnity);
    return () => eventBus.unsubscribe(EventNames.sendUserToUnity, handleSendUserToUnity);
  }, [sendUnityEvent]);

  // Portal click handling
  useEffect(() => {
    async function resolveTargetSpaceName() {
      setTargetSpaceName('');
      setTargetSpaceSlug('');
      if (clickedPortal && !isEditMode) {
        let targetSpaceId = clickedPortal.targetSpaceId;

        if (!targetSpaceId && clickedPortal.portalId) {
          try {
            const portalDocRef = doc(db, 'spaces', spaceID, 'portals', clickedPortal.portalId);
            const portalDocSnap = await getDoc(portalDocRef);
            if (portalDocSnap.exists()) {
              targetSpaceId = portalDocSnap.data().targetSpaceId;
            }
          } catch (err) {
            // fallback
          }
        }

        if (targetSpaceId) {
          try {
            const spaceData = await getSpaceItem(targetSpaceId);
            setTargetSpaceName(spaceData?.name || targetSpaceId);
            setTargetSpaceSlug(spaceData?.slug || '');
            setShowPortalPrompt(true);
          } catch (err) {
            setTargetSpaceName(targetSpaceId);
            setTargetSpaceSlug('');
            setShowPortalPrompt(true);
          }
        } else {
          setShowPortalPrompt(true);
        }
      }
    }

    if (clickedPortal && isEditMode) {
      setIsPortalEditorOpen(true);
    }
    if (clickedPortal && !isEditMode) {
      resolveTargetSpaceName();
    }
  }, [clickedPortal, isEditMode, spaceID]);

  const handleClosePortalEditor = () => {
    setIsPortalEditorOpen(false);
    clearClickedPortal();
  };

  const handleClosePortalPrompt = () => {
    setShowPortalPrompt(false);
    clearClickedPortal();
    setTargetSpaceName('');
    setTargetSpaceSlug('');
  };

  const handleConfirmPortal = async () => {
    if (clickedPortal && user) {
      let targetSpaceId = null;
      if (clickedPortal.portalId) {
        const parts = clickedPortal.portalId.split('_');
        if (parts.length >= 3) {
          targetSpaceId = parts[2];
        }
      }

      await trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.PORTAL_NAVIGATE, {
        category: ANALYTICS_CATEGORIES.NAVIGATION,
        portalId: clickedPortal.portalId,
        targetSpaceId,
        sourceSpaceId: spaceID,
        targetSpaceName,
        targetSpaceSlug,
        isEditMode: false,
        navigationType: 'confirmed',
        timestamp: new Date().toISOString(),
      });
    }

    if (targetSpaceSlug) {
      window.open(`https://www.spacesmetaverse.com/w/${targetSpaceSlug}`, '_blank', 'noopener');
    }

    handleClosePortalPrompt();
  };

  // Voice chat check
  const showVoiceChat = user && settings.enableVoiceChat;

  return (
    <Box className="webgl-renderer">
      {/* Background */}
      {settings.urlLoadingBackground && (
        <PersistentBackground
          backgroundUrl={settings.urlLoadingBackground}
          videoBackgroundUrl={settings.videoBackgroundUrl}
          containerRef={unityContainerRef}
        />
      )}

      {/* Loader */}
      {!showSignInModal && <PersistentLoader containerRef={unityContainerRef} />}

      {/* Sign In Overlay */}
      {showSignInModal && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          zIndex="100"
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          <SignIn
            mode="button"
            label="Sign In"
            initialIsOpen={true}
            buttonProps={{ size: 'lg', colorScheme: 'blue' }}
          />
        </Box>
      )}

      {/* Catalogue Modal Handler */}
      <CatalogueItemModalHandler spaceId={spaceID} isEditMode={isEditMode} />

      {/* Content Admin Modal */}
      <ContentAdminModal
        isOpen={isContentAdminOpen}
        onClose={handleCloseContentAdmin}
        settings={{ spaceID }}
      />

      <PortalManager containerRef={fullscreenRef.current ? fullscreenRef : document.body}>
        <div
          ref={ref}
          style={{ width: '100%', height: '100%', aspectRatio: 'auto', position: 'absolute' }}
        >
          {/* Overlay Controls */}
          <OverlayControls
            user={user}
            userProfile={userProfile}
            sessionId={sessionId}
            spaceID={spaceID}
            canEditSpace={canEditSpace}
            isEditMode={isEditMode}
            showVoiceChat={showVoiceChat}
            unityContainerRef={unityContainerRef}
            onEditModeClick={handleEditModeButtonClick}
            onTogglePlayerList={handlePlayerListToggle}
          />

          {/* Unity Container */}
          <Box
            ref={unityContainerRef}
            position="relative"
            overflow="hidden"
            width="100%"
            height="100%"
            bgRepeat="no-repeat"
            bgSize="cover"
            bgPosition="center"
            bgColor="#666666"
          >
            {/* Frosted glass overlay */}
            <Box
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              backdropFilter="blur(8px)"
              backgroundColor="rgba(255, 255, 255, 0.1)"
              zIndex="0"
            />

            {/* Unity display */}
            <Box {...fadeStyles} width="100%" height="100%" position="absolute" zIndex="1">
              {unityProvider && !showSignInModal ? (
                <Unity
                  unityProvider={unityProvider}
                  style={{ width: '100%', height: '100%' }}
                  devicePixelRatio={devicePixelRatio}
                  tabIndex={1}
                />
              ) : (
                <Box
                  width="100%"
                  height="100%"
                  backgroundColor="#333"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {showSignInModal && (
                    <Text color="white" fontSize="lg">
                      Authentication Required
                    </Text>
                  )}
                </Box>
              )}
            </Box>

            {/* Hidden loader */}
            <Box
              position="absolute"
              zIndex="6"
              width="100%"
              height="100%"
              style={{ display: 'none' }}
            >
              <LoaderProgress />
            </Box>
          </Box>

          {/* Logo */}
          <Box
            {...fadeStyles}
            position="absolute"
            zIndex="2"
            top={4}
            left={4}
            display="flex"
            alignItems="flex-start"
            gap={3}
            height="50px"
          >
            {settings.showDisruptiveLogo && (
              <Image src={settings.urlDisruptiveLogo} width="100px" alt="Disruptive Logo" />
            )}
          </Box>

          {/* Bottom right controls */}
          <Box
            {...fadeStyles}
            position="absolute"
            zIndex="2"
            bottom={4}
            right={4}
            display="flex"
            alignItems="flex-start"
            gap={3}
          >
            {settings.showHelpButton && <HelpButton />}
            <FullScreenButton />
          </Box>

          <VideoPlayer />

          <NameplateModal
            isOpen={nameplateData !== null}
            onClose={resetNameplateData}
            playerName={nameplateData?.playerName || 'Unknown Player'}
            playerId={nameplateData?.playerId || 'Unknown ID'}
            uid={nameplateData?.uid}
          />

          <UnityPlayerList
            isVisible={isPlayerListVisible}
            onToggleVisibility={setIsPlayerListVisible}
            spaceID={spaceID}
          />

          <MediaScreenController />

          {/* Portal Editor */}
          <Box position="absolute" top={4} right={4} zIndex={1000}>
            {isPortalEditorOpen && clickedPortal && (
              <PortalEditor
                isOpen={isPortalEditorOpen}
                onClose={handleClosePortalEditor}
                portal={clickedPortal}
                spaceId={spaceID}
              />
            )}
          </Box>

          {/* Portal Prompt Modal */}
          {!isEditMode && showPortalPrompt && (
            <PortalPromptModal
              isOpen={showPortalPrompt}
              onClose={handleClosePortalPrompt}
              targetSpaceName={targetSpaceName}
              targetSpaceSlug={targetSpaceSlug}
              onConfirm={handleConfirmPortal}
            />
          )}

          <PortalController />

          <WebGLChatWindow spaceID={spaceID} isVisible={!showSignInModal && user} />
        </div>
      </PortalManager>
    </Box>
  );
});

WebGLRenderer.displayName = 'WebGLRenderer';

WebGLRenderer.propTypes = {
  settings: PropTypes.shape({
    urlLoadingBackground: PropTypes.string,
    videoBackgroundUrl: PropTypes.string,
    showAuthButton: PropTypes.bool,
    showDisruptiveLogo: PropTypes.bool,
    urlDisruptiveLogo: PropTypes.string,
    showHelpButton: PropTypes.bool,
    enableVoiceChat: PropTypes.bool,
    spaceID: PropTypes.string,
  }),
};

export default WebGLRenderer;
