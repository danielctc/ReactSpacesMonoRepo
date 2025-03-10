import React, { forwardRef, useEffect, useState, useContext, useMemo, useRef, useCallback, createContext } from 'react';
import PropTypes from 'prop-types';
import { Box, Image, PortalManager, Text, Heading } from "@chakra-ui/react";
import { Unity } from "react-unity-webgl";
import { useUnity } from "./providers/UnityProvider";
import { useSendUnityEvent, useUnityOnFirstSceneLoaded, useUnityOnRequestUser, useUnityOnNameplateClick } from "./hooks/unityEvents";
import { useFadeStyles } from "./hooks/useFadeStyles";
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import TestModalTrigger from "./components/TestModalTrigger";
import LoaderProgress from "./components/Loader/LoaderProgress";
import AuthenticationButton from "./components/AuthenticationButton";
import HelpButton from "./components/HelpButton";
import ProfileButton from "./components/ProfileButton";
import FullScreenButton from "./components/FullScreenButton";
import SendThumbnailUrlToUnity from "./components/EventTests/SendThumbnailUrlToUnity";
import VideoPlayer from "./components/VideoPlayer";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import NameplateModal from "./components/NameplateModal";
import UnityPlayerList from "./components/UnityPlayerList";
import { CanvasMainMenu } from "./components/CanvasMainMenu";
import { useUnityPlayerList } from "./hooks/unityEvents/useUnityPlayerList";
import { AgoraProvider, VoiceButton, ScreenShareDisplay, useVoiceChat } from './voice-chat';

// Get Agora App ID from environment variable
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || "";

const WebGLRenderer = forwardRef(({ settings }, ref) => {
  const { unityProvider, isLoaded } = useUnity();
  const isFirstSceneLoaded = useUnityOnFirstSceneLoaded();
  const unityOnRequestUser = useUnityOnRequestUser();
  const sendUnityEvent = useSendUnityEvent();
  const fadeStyles = useFadeStyles(isFirstSceneLoaded);
  const { user } = useContext(UserContext);
  const [isUnityReady, setIsUnityReady] = useState(false);
  const [devicePixelRatio, setDevicePixelRatio] = useState(window.devicePixelRatio);
  const [nameplateData, resetNameplateData] = useUnityOnNameplateClick();
  const players = useUnityPlayerList();
  const localPlayer = players.find(player => player.isLocalPlayer);
  const [isPlayerListVisible, setIsPlayerListVisible] = useState(true);
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(true); // Default to true to ensure voice chat works
  
  // State to track if Edit Mode is active
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Get spaceID from settings or default
  const spaceID = settings.spaceID || 'default';
  
  // Get sessionId from URL or default to spaceID
  const sessionId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('sessionId');
    const result = sessionIdFromUrl || spaceID;
    console.log("WebGLRenderer: Using session ID:", result);
    return result;
  }, [spaceID]);
  
  // Fetch user profile data
  const [userProfile, setUserProfile] = useState(null);
  
  useEffect(() => {
    if (user?.uid) {
      getUserProfileData(user.uid).then(profile => {
        setUserProfile(profile);
        console.log("WebGLRenderer: User profile loaded:", profile?.Nickname || "Unknown");
      }).catch(err => {
        console.error("Error fetching user profile:", err);
      });
    }
  }, [user?.uid]);
  
  // Handle player instantiation
  useEffect(() => {
    console.log("WebGLRenderer: Setting up player instantiation listener");
    
    const handlePlayerInstantiated = () => {
      console.log("WebGLRenderer: Player instantiated event received");
      setIsPlayerInstantiated(true);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent("PlayerInstantiated"));
      
      // Set window flag for other components
      window.isPlayerInstantiated = true;
    };
    
    // Check if we already have a player instantiated flag from a previous mount
    if (window.isPlayerInstantiated) {
      console.log("WebGLRenderer: Player was already instantiated from previous mount");
      setIsPlayerInstantiated(true);
    }
    
    eventBus.subscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
    
    // Force player instantiation after a timeout if it hasn't happened yet
    const timeoutId = setTimeout(() => {
      if (!isPlayerInstantiated) {
        console.log("WebGLRenderer: Forcing player instantiation after timeout");
        setIsPlayerInstantiated(true);
        window.isPlayerInstantiated = true;
        window.dispatchEvent(new CustomEvent("PlayerInstantiated"));
      }
    }, 5000);
    
    return () => {
      eventBus.unsubscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
      clearTimeout(timeoutId);
    }
  }, [isPlayerInstantiated]);
  
  // Ensure the Unity environment is ready before attempting interactions
  useEffect(() => {
    if (isLoaded || isFirstSceneLoaded) {
      // Wait for 5 seconds before setting Unity ready state
      setTimeout(() => {
        setIsUnityReady(true);
        Logger.log("WebGLRenderer: Unity is ready to receive messages.");
      }, 5000);
    } else {
      Logger.warn("WebGLRenderer: Unity is NOT ready yet.");
    }
  }, [isLoaded, isFirstSceneLoaded]);
  
  // Handle user data sending to Unity
  useEffect(() => {
    const handleSendUserToUnity = (userData) => {
      Logger.log("WebGLRenderer: Received 'sendUserToUnity' event");
      sendUnityEvent('FirebaseUserFromReact', userData);
    };
    
    eventBus.subscribe(EventNames.sendUserToUnity, handleSendUserToUnity);
    return () => eventBus.unsubscribe(EventNames.sendUserToUnity, handleSendUserToUnity);
  }, [sendUnityEvent]);
  
  // Fullscreen context setup for Unity
  const { setFullscreenRef, fullscreenRef } = useFullscreenContext();
  
  useEffect(() => {
    setFullscreenRef(ref.current);
  }, [ref, setFullscreenRef]);
  
  // Handle edit mode toggle
  const handleEditModeToggle = (editMode) => {
    setIsEditMode(editMode);
  };
  
  // Handle player list toggle
  const handlePlayerListToggle = () => {
    setIsPlayerListVisible(!isPlayerListVisible);
  };
  
  // Determine if voice chat should be enabled (only check for user)
  const showVoiceChat = user && settings.enableVoiceChat;
  
  console.log("WebGLRenderer: Render with state:", {
    user: !!user,
    userId: user?.uid,
    isPlayerInstantiated,
    showVoiceChat,
    sessionId
  });
  
  return (
    <Box className="webgl-renderer">
      <PortalManager containerRef={fullscreenRef.current ? fullscreenRef : document.body}>
        <div ref={ref} style={{ width: "100%", height: "100%", aspectRatio: "16/9", position: "relative" }}>
          {/* Top right buttons - Moved inside the fullscreen container */}
          <Box position="absolute" zIndex="10" top={4} right={4} display="flex" alignItems="center" gap={2}>
            {settings.showAuthButton && <AuthenticationButton />}
            
            {/* Voice Button - Only show if voice chat is enabled */}
            {showVoiceChat && (
              <AgoraProvider
                appId={AGORA_APP_ID}
                channel={sessionId}
                uid={user?.uid}
                enabled={true}
              >
                <VoiceButton 
                  size="md" 
                  defaultMuted={true}
                  joinOnClick={true}
                />
                
                {/* Screen Share Display */}
                <ScreenShareDisplay userNickname={userProfile?.Nickname} />
                
                {/* Voice Chat Debug Panel - Disabled */}
                {/* <VoiceChatDebugPanel /> */}
              </AgoraProvider>
            )}
            
            <ProfileButton />
            
            <Box position="relative" zIndex="9999">
              <CanvasMainMenu 
                onTogglePlayerList={handlePlayerListToggle}
                spaceID={spaceID}
              />
            </Box>
          </Box>
          
          {/* Background for Unity */}
          <Box position="relative" overflow="hidden" width="100%" height="100%"
            bgRepeat="no-repeat" bgSize="cover" bgPosition="center" bgColor="#666666"
            bgImage={settings.urlLoadingBackground ? `url('${settings.urlLoadingBackground}')` : ""}>
            
            {/* Add a frosted glass overlay */}
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
            
            {/* Loader for initial loading state */}
            <LoaderProgress />
            
            {/* Unity display */}
            <Box {...fadeStyles} width="100%" height="100%" position="absolute" zIndex="1">
              <Unity 
                unityProvider={unityProvider}
                style={{ width: "100%", height: "100%" }}
                devicePixelRatio={devicePixelRatio}
              />
            </Box>
            
            {/* Event to send thumbnails */}
            <SendThumbnailUrlToUnity />
          </Box>
          
          {/* UI elements */}
          <Box {...fadeStyles} position="absolute" zIndex="2" top={4} left={4} display="flex" alignItems="flex-start" gap={3} height="50px">
            {settings.showDisruptiveLogo && <Image src={settings.urlDisruptiveLogo} width="100px" alt="Disruptive Logo" />}
          </Box>
          
          {/* Bottom right controls */}
          <Box {...fadeStyles} position="absolute" zIndex="2" bottom={4} left={4} display="flex" alignItems="flex-start" gap={3} />
          <Box {...fadeStyles} position="absolute" zIndex="2" bottom={4} right={4} display="flex" alignItems="flex-start" gap={3}>
            {settings.showHelpButton && <HelpButton />}
            <FullScreenButton />
          </Box>
          
          {/* Video Player for handling play video events */}
          <VideoPlayer/>
          
          <NameplateModal
            isOpen={nameplateData !== null}
            onClose={() => {
              console.log("🎮 Closing nameplate modal");
              resetNameplateData();
            }}
            playerName={nameplateData?.playerName || "Unknown Player"}
            playerId={nameplateData?.playerId || "Unknown ID"}
          />
          
          <UnityPlayerList 
            isVisible={isPlayerListVisible} 
            onToggleVisibility={setIsPlayerListVisible} 
          />
        </div>
      </PortalManager>
    </Box>
  );
});

WebGLRenderer.displayName = 'WebGLRenderer';

WebGLRenderer.propTypes = {
  settings: PropTypes.shape({
    urlLoadingBackground: PropTypes.string,
    showAuthButton: PropTypes.bool,
    showDisruptiveLogo: PropTypes.bool,
    urlDisruptiveLogo: PropTypes.string,
    showHelpButton: PropTypes.bool,
    enableVoiceChat: PropTypes.bool,
    spaceID: PropTypes.string,
  }),
};

export default WebGLRenderer;
