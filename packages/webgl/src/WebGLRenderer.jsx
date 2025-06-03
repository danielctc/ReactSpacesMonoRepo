import React, { forwardRef, useEffect, useState, useContext, useMemo, useRef, useCallback, createContext } from 'react';
import PropTypes from 'prop-types';
import { Box, Image, PortalManager, Text, Heading, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button, Flex } from "@chakra-ui/react";
import { Unity } from "react-unity-webgl";
import { useUnity } from "./providers/UnityProvider";
import { useSendUnityEvent, useUnityOnFirstSceneLoaded, useUnityOnRequestUser, useUnityOnNameplateClick } from "./hooks/unityEvents";
import { useUnityOnPortalClick } from "./hooks/unityEvents/useUnityOnPortalClick";
import { useUnityOnPortalNavigate } from "./hooks/unityEvents/useUnityOnPortalNavigate";
import { useUnityMediaScreenImages } from "./hooks/unityEvents/useUnityMediaScreenImages";
import { useUnityThumbnails } from "./hooks/unityEvents/useUnityThumbnails";
import { useFadeStyles } from "./hooks/useFadeStyles";
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import LoaderProgress from "./components/Loader/LoaderProgress";
import AuthenticationButton from "./components/AuthenticationButton";
import HelpButton from "./components/HelpButton";
import ProfileButton from "./components/ProfileButton";
import FullScreenButton from "./components/FullScreenButton";
import VideoPlayer from "./components/VideoPlayer";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import NameplateModal from "./components/NameplateModal";
import UnityPlayerList from "./components/UnityPlayerList";
import { CanvasMainMenu } from "./components/CanvasMainMenu";
import { useUnityPlayerList } from "./hooks/unityEvents/useUnityPlayerList";
import { AgoraProvider, VoiceButton, ScreenShareDisplay, useVoiceChat } from './voice-chat';
import MediaScreenController from "./components/MediaScreenController";
import PersistentBackground from "./components/PersistentBackground";
import PersistentLoader from "./components/PersistentLoader";
import SignIn from '@disruptive-spaces/shared/components/auth/SignIn';
import { initUnityKeyboard, focusUnity, setUnityKeyboardCapture, blockUnityKeyboardInput } from './utils/unityKeyboard';
import LiveStreamButton from './components/LiveStreamButton';
import { useSpacePortals } from './hooks/unityEvents/index';
import PortalEditor from './components/PortalEditor';
import PortalController from './components/PortalController';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSpaceCatalogueItems } from './hooks/unityEvents/useSpaceCatalogueItems';
import { useUnityOnCatalogueItemClick } from './hooks/unityEvents/useUnityOnCatalogueItemClick';
import CatalogueItemModalHandler from './components/CatalogueItemModalHandler';

// Get Agora App ID from environment variable
const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || "";

// Add a utility function to get the Unity canvas
const getUnityCanvas = () => {
  return document.querySelector('canvas') || document.getElementById('unity-canvas');
};

const WebGLRenderer = forwardRef(({ settings }, ref) => {
  const { unityProvider, isLoaded, error } = useUnity();
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
  
  // Get spaceID from settings or default
  const spaceID = settings.spaceID || 'default';
  
  // Add portal hooks
  useUnityOnPortalNavigate();
  useSpacePortals(spaceID);
  
  // State to track if Edit Mode is active
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State to track if the sign-in modal should be shown
  const [showSignInModal, setShowSignInModal] = useState(false);
  
  // State to track if a modal is open (for keyboard focus management)
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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
  
  // Check if user is logged in and show sign-in modal if not
  useEffect(() => {
    // If there's an error with Unity or user isn't logged in, show sign-in modal
    if (error || !user) {
      console.log("WebGLRenderer: User not logged in or Unity error, showing sign-in modal");
      // Add a small delay to ensure the UI is ready
      const timer = setTimeout(() => {
        setShowSignInModal(true);
        setIsModalOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowSignInModal(false);
    }
  }, [error, user]);
  
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
  
  // Handle keyboard focus management
  useEffect(() => {
    const handleModalOpen = () => {
      console.log("WebGLRenderer: Modal opened");
      setIsModalOpen(true);
    };

    const handleModalClose = () => {
      console.log("WebGLRenderer: Modal closed");
      setIsModalOpen(false);
    };

    // Listen for modal open/close events
    window.addEventListener('modal-opened', handleModalOpen);
    window.addEventListener('modal-closed', handleModalClose);

    return () => {
      window.removeEventListener('modal-opened', handleModalOpen);
      window.removeEventListener('modal-closed', handleModalClose);
    };
  }, []);

  // Handle keyboard focus for nameplate modal
  useEffect(() => {
    if (nameplateData !== null) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [nameplateData]);
  
  // Ensure the Unity environment is ready before attempting interactions
  useEffect(() => {
    if (isLoaded || isFirstSceneLoaded) {
      // Wait for 5 seconds before setting Unity ready state
      setTimeout(() => {
        setIsUnityReady(true);
        console.log("WebGLRenderer: Unity is ready to receive messages.");
      }, 5000);
    } else {
      console.warn("WebGLRenderer: Unity is NOT ready yet.");
    }
  }, [isLoaded, isFirstSceneLoaded]);
  
  // Add this useEffect to disable keyboard capture when Unity loads
  useEffect(() => {
    // Only run this once when Unity loads
    if (isLoaded && unityProvider) {
      // Ensure WebGLInput.captureAllKeyboardInput is set to false
      setTimeout(() => {
        if (window.unityInstance) {
          try {
            console.log('WebGLRenderer: Disabling Unity keyboard capture on initialization');
            window.unityInstance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', false);
          } catch (err) {
            console.error('WebGLRenderer: Error disabling Unity keyboard capture:', err);
          }
        }
      }, 1000); // Delay to ensure Unity is fully loaded
    }
  }, [isLoaded, unityProvider]);
  
  // Ensure the webgl-root element is visible and properly configured
  useEffect(() => {
    // Find the webgl-root element
    const webglRoot = document.getElementById('webgl-root');
    
    if (webglRoot) {
      console.log('WebGLRenderer: Found webgl-root element, ensuring it is visible');
      
      // Make sure it's visible
      webglRoot.style.display = 'block';
      
      // Set the space ID attribute if needed
      if (spaceID && webglRoot.getAttribute('data-space-id') !== spaceID) {
        webglRoot.setAttribute('data-space-id', spaceID);
        console.log(`WebGLRenderer: Set data-space-id attribute to ${spaceID}`);
      }
    } else {
      console.error('WebGLRenderer: Could not find webgl-root element');
    }
    
    // Clean up when component unmounts
    return () => {
      // Don't hide the webgl-root on unmount as it might be needed by other components
    };
  }, [spaceID]);
  
  // Add this useEffect to properly configure the Unity canvas for keyboard focus
  useEffect(() => {
    // Function to ensure Unity canvas is properly configured
    const configureUnityCanvas = () => {
      const unityCanvas = getUnityCanvas();
      
      if (unityCanvas) {
        console.log('WebGLRenderer: Configuring Unity canvas for keyboard input');
        
        // Set tabIndex to make canvas focusable (essential for keyboard input)
        unityCanvas.tabIndex = 1;
        
        // Remove outline to avoid visible focus ring
        unityCanvas.style.outline = 'none';
        
        // Add event listener to re-enable keyboard capture when canvas is clicked
        unityCanvas.addEventListener('click', () => {
          console.log('WebGLRenderer: Unity canvas clicked, enabling keyboard capture');
          if (!isModalOpen) {
            // Use focusUnity which handles both focus and keyboard capture
            focusUnity(true);
          }
        });
        
        console.log('WebGLRenderer: Unity canvas configured with tabIndex=1');
      } else {
        console.warn('WebGLRenderer: Could not find Unity canvas to configure');
      }
    };
    
    // Try immediately for already loaded Unity
    configureUnityCanvas();
    
    // Also try after a delay to ensure Unity has fully initialized
    const timerId = setTimeout(configureUnityCanvas, 1000);
    
    // Try again when Unity sends the 'unityReady' event
    const handleUnityReady = () => {
      console.log('WebGLRenderer: Received unityReady event, configuring canvas');
      configureUnityCanvas();
    };
    window.addEventListener('unityReady', handleUnityReady);
    
    return () => {
      clearTimeout(timerId);
      window.removeEventListener('unityReady', handleUnityReady);
    };
  }, [isLoaded, isModalOpen]);
  
  // Handle clicks on Unity canvas to ensure keyboard input works
  const handleCanvasClick = useCallback(() => {
    console.log('WebGLRenderer: Unity canvas clicked, enabling keyboard capture');
    
    if (!isModalOpen) {
      focusUnity(true);
    }
  }, [isModalOpen]);

  // Add event listener for canvas clicks
  useEffect(() => {
    if (isLoaded && unityProvider) {
      const canvas = getUnityCanvas();
      if (canvas) {
        console.log('WebGLRenderer: Adding click handler to Unity canvas');
        canvas.addEventListener('click', handleCanvasClick);
        
        return () => {
          canvas.removeEventListener('click', handleCanvasClick);
        };
      }
    }
  }, [isLoaded, unityProvider, handleCanvasClick]);
  
  // Add global click handler to manage focus when clicking outside of modals
  useEffect(() => {
    if (isLoaded && unityProvider) {
      console.log('WebGLRenderer: Setting up global click handler for focus management');
      
      const handleGlobalClick = (e) => {
        // Don't refocus if clicking inside a modal
        if (isModalOpen) {
          console.log('WebGLRenderer: Modal is open, not refocusing Unity on click');
          return;
        }
        
        // Don't refocus if clicking on form elements
        if (e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT' ||
            e.target.tagName === 'BUTTON') {
          console.log('WebGLRenderer: Clicked on form element, not refocusing Unity');
          return;
        }
        
        // Don't refocus if clicking inside specific UI containers that should maintain their own focus
        if (e.target.closest('.chakra-modal__content') || 
            e.target.closest('[role="dialog"]') ||
            e.target.closest('[role="menu"]') ||
            e.target.closest('.chakra-popover__content') ||
            e.target.closest('[role="tooltip"]')) {
          console.log('WebGLRenderer: Clicked inside modal/dialog content, not refocusing Unity');
          return;
        }
        
        // If the click is on the Unity canvas, let the canvas click handler handle it
        const canvas = getUnityCanvas();
        if (canvas && (e.target === canvas || canvas.contains(e.target))) {
          return;
        }
        
        // Check for UI overlay elements
        const isOverlayUI = e.target.closest('.webgl-overlay') || 
                          e.target.closest('.game-ui') ||
                          e.target.closest('.player-list') ||
                          e.target.closest('.unity-ui-overlay');
        
        // If clicking on UI overlay elements that should allow keyboard input to pass through
        if (isOverlayUI) {
          console.log('WebGLRenderer: Clicked on UI overlay that should allow keyboard events');
          
          // Ensure keyboard capture is enabled for Unity
          setTimeout(() => {
            if (!isModalOpen) {
              focusUnity(true);
            }
          }, 50);
          
          return;
        }
        
        // If clicked outside modals/forms/special UI, refocus the canvas
        console.log('WebGLRenderer: Clicked outside forms/modals/special UI, refocusing Unity canvas');
        
        // Wait a short time to ensure any UI state changes complete
        setTimeout(() => {
          if (canvas && !isModalOpen) {
            if (canvas.tabIndex === undefined || canvas.tabIndex < 0) {
              canvas.tabIndex = 1;
            }
            canvas.focus();
            
            // Re-enable keyboard capture
            focusUnity(true);
          }
        }, 50);
      };
      
      // Add click listener to entire document to catch all clicks
      document.addEventListener('click', handleGlobalClick, true);
      
      return () => {
        document.removeEventListener('click', handleGlobalClick, true);
      };
    }
  }, [isLoaded, unityProvider, isModalOpen]);
  
  // Handle user data sending to Unity
  useEffect(() => {
    const handleSendUserToUnity = (userData) => {
      console.log("WebGLRenderer: Received 'sendUserToUnity' event");
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
    console.log('Edit mode toggled:', editMode);
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
  
  // Listen for Edit Mode changes
  useEffect(() => {
    const handleEditModeChange = (event) => {
      console.log('Edit mode changed event:', event.detail);
      setIsEditMode(event.detail.enabled);
    };

    window.addEventListener('editModeChanged', handleEditModeChange);
    return () => {
      window.removeEventListener('editModeChanged', handleEditModeChange);
    };
  }, []);
  
  // Use the hook to load media screen images
  useUnityMediaScreenImages();
  useUnityThumbnails();
  
  // Create a ref for the Unity container
  const unityContainerRef = useRef(null);
  
  const { clickedPortal, clearClickedPortal } = useUnityOnPortalClick();
  const [isPortalEditorOpen, setIsPortalEditorOpen] = useState(false);
  const [showPortalPrompt, setShowPortalPrompt] = useState(false);
  const [targetSpaceName, setTargetSpaceName] = useState('');
  const [targetSpaceSlug, setTargetSpaceSlug] = useState('');
  
  useEffect(() => {
    async function resolveTargetSpaceName() {
      setTargetSpaceName('');
      setTargetSpaceSlug('');
      if (clickedPortal && !isEditMode) {
        let targetSpaceId = clickedPortal.targetSpaceId;
        // If targetSpaceId is missing, look up the portal in Firestore by portalId
        if (!targetSpaceId && clickedPortal.portalId) {
          try {
            const portalDocRef = doc(db, 'spaces', spaceID, 'portals', clickedPortal.portalId);
            const portalDocSnap = await getDoc(portalDocRef);
            if (portalDocSnap.exists()) {
              const portalData = portalDocSnap.data();
              targetSpaceId = portalData.targetSpaceId;
            }
          } catch (err) {
            // fallback: leave targetSpaceId undefined
          }
        }
        if (targetSpaceId) {
          try {
            const spaceData = await getSpaceItem(targetSpaceId);
            setTargetSpaceName(spaceData?.name || targetSpaceId);
            setTargetSpaceSlug(spaceData?.slug || '');
            setShowPortalPrompt(true); // Only show after name is ready
          } catch (err) {
            setTargetSpaceName(targetSpaceId);
            setTargetSpaceSlug('');
            setShowPortalPrompt(true); // Show with fallback
          }
        } else {
          setTargetSpaceName('');
          setTargetSpaceSlug('');
          setShowPortalPrompt(true); // Show with fallback
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
    console.log('Closing portal editor');
    setIsPortalEditorOpen(false);
    clearClickedPortal();
  };

  // Add debug logging for render
  console.log('WebGLRenderer render state:', {
    isPortalEditorOpen,
    clickedPortal,
    isEditMode
  });
  
  // Add catalogue hooks
  useSpaceCatalogueItems(spaceID);
  const { clickedItem, clearClickedItem } = useUnityOnCatalogueItemClick();
  
  return (
    <Box className="webgl-renderer">
      {/* Add the PersistentBackground component with container ref */}
      {settings.urlLoadingBackground && (
        <PersistentBackground 
          backgroundUrl={settings.urlLoadingBackground}
          videoBackgroundUrl={settings.videoBackgroundUrl}
          containerRef={unityContainerRef}
        />
      )}
      
      {/* Add the PersistentLoader component with container ref */}
      {!showSignInModal && (
        <PersistentLoader containerRef={unityContainerRef} />
      )}
      
      {/* Add the SignIn component when needed */}
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
            buttonProps={{ 
              size: "lg", 
              colorScheme: "blue"
            }} 
          />
        </Box>
      )}
      
      {/* Add the CatalogueItemModalHandler (only active during edit mode) */}
      <CatalogueItemModalHandler spaceId={spaceID} isEditMode={isEditMode} />

      <PortalManager containerRef={fullscreenRef.current ? fullscreenRef : document.body}>
        <div ref={ref} style={{ width: "100%", height: "100%", aspectRatio: "auto", position: "absolute" }}>
          {/* Top right buttons - Moved inside the fullscreen container - also changed aspact ratio from 16/9 and position to absolute from relative */}
          <Box position="absolute" zIndex="10" top={4} right={4} display="flex" alignItems="center" gap={2}>
            {settings.showAuthButton && <AuthenticationButton />}
            
            {/* Live Stream Button - Show when user is logged in */}
            {user && <LiveStreamButton size="md" />}
            
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
            
            {/* Unity display - z-index 1 */}
            <Box {...fadeStyles} width="100%" height="100%" position="absolute" zIndex="1">
              {unityProvider ? (
                <Unity 
                  unityProvider={unityProvider}
                  style={{ width: "100%", height: "100%" }}
                  devicePixelRatio={devicePixelRatio}
                  tabIndex={1} // Set tabIndex to 1 to enable proper keyboard focus handling
                />
              ) : (
                <Box width="100%" height="100%" />
              )}
            </Box>
            
            {/* Hide the original LoaderProgress since we're using PersistentLoader now */}
            <Box position="absolute" zIndex="6" width="100%" height="100%" style={{ display: 'none' }}>
              <LoaderProgress />
            </Box>
          </Box>
          
          {/* UI elements */}
          <Box {...fadeStyles} position="absolute" zIndex="2" top={4} left={4} display="flex" alignItems="flex-start" gap={3} height="50px">
            {settings.showDisruptiveLogo && <Image src={settings.urlDisruptiveLogo} width="100px" alt="Disruptive Logo" />}
          </Box>
          
          {/* Bottom right controls */}
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
            spaceID={spaceID}
          />

          {/* Media Screen Controller */}
          <MediaScreenController />
          
          {/* Portal Editor - Positioned in top right */}
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

          {/* Stylish Portal Prompt Popup for non-edit mode */}
          {!isEditMode && showPortalPrompt && (
            <Modal isOpen={showPortalPrompt} onClose={() => { setShowPortalPrompt(false); clearClickedPortal(); setTargetSpaceName(''); setTargetSpaceSlug(''); }} isCentered>
              <ModalOverlay />
              <ModalContent
                bg="#181818"
                borderRadius="2xl"
                boxShadow="2xl"
                maxW="420px"
                p={0}
              >
                <ModalHeader
                  textAlign="center"
                  fontWeight="extrabold"
                  fontSize="2xl"
                  color="white"
                  pt={8}
                  pb={4}
                >
                  {targetSpaceName ? `Visit ${targetSpaceName}?` : 'Visit Space?'}
                </ModalHeader>
                <ModalCloseButton color="white" top={4} right={4} />
                <ModalBody pb={8} pt={2} px={8}>
                  <Flex mt={4} gap={6} justify="center">
                    <Button
                      variant="outline"
                      borderColor="whiteAlpha.400"
                      color="white"
                      fontWeight="bold"
                      borderRadius="2xl"
                      px={10}
                      py={6}
                      fontSize="lg"
                      onClick={() => { setShowPortalPrompt(false); clearClickedPortal(); setTargetSpaceName(''); setTargetSpaceSlug(''); }}
                      _hover={{ bg: 'whiteAlpha.100' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      colorScheme="whiteAlpha"
                      bg="white"
                      color="#181818"
                      fontWeight="bold"
                      borderRadius="2xl"
                      px={10}
                      py={6}
                      fontSize="lg"
                      onClick={() => {
                        if (targetSpaceSlug) {
                          window.open(`https://www.spacesmetaverse.com/w/${targetSpaceSlug}`, '_blank', 'noopener');
                        }
                        setShowPortalPrompt(false);
                        clearClickedPortal();
                        setTargetSpaceName('');
                        setTargetSpaceSlug('');
                      }}
                      _hover={{ bg: 'gray.100' }}
                    >
                      Visit
                    </Button>
                  </Flex>
                </ModalBody>
              </ModalContent>
            </Modal>
          )}

          {/* Portal Controller */}
          <PortalController />
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