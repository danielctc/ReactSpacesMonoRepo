import React, { forwardRef, useEffect, useState, useContext, useMemo, useRef, useCallback, createContext } from 'react';
import PropTypes from 'prop-types';
import { Box, Image, PortalManager, Text, Heading, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button, Flex, IconButton, useToast } from "@chakra-ui/react";
import { FaWrench } from 'react-icons/fa';
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
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
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
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSpaceCatalogueItems } from './hooks/unityEvents/useSpaceCatalogueItems';
import { useUnityOnCatalogueItemClick } from './hooks/unityEvents/useUnityOnCatalogueItemClick';
import CatalogueItemModalHandler from './components/CatalogueItemModalHandler';
import { useUnityAnalytics } from './hooks/unityEvents/useUnityAnalytics';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';
import WebGLChatWindow from './components/chat/WebGLChatWindow';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import ContentAdminModal from './components/ContentAdminModal';

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
  const [canEditSpace, setCanEditSpace] = useState(false); // Permission check for Edit Mode
  const toast = useToast();
  
  // Get spaceID from settings or default
  const spaceID = settings.spaceID || 'default';
  
  // Add portal hooks
  useUnityOnPortalNavigate();
  useSpacePortals(spaceID);
  
  // Add analytics tracking
  useUnityAnalytics(spaceID, {
    enableDebugLogs: true
  });
  
  // Analytics hook for tracking portal navigation
  const { trackUnityEvent } = useAnalytics(spaceID, {
    enableDebugLogs: true
  });
  
  // State to track if Edit Mode is active
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State to track if the sign-in modal should be shown
  const [showSignInModal, setShowSignInModal] = useState(false);
  
  // State to track if a modal is open (for keyboard focus management)
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State to track if Content Admin modal is open
  const [isContentAdminOpen, setIsContentAdminOpen] = useState(false);
  
  // Get sessionId from URL or default to spaceID
  const sessionId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('sessionId');
    const result = sessionIdFromUrl || spaceID;
    
    return result;
  }, [spaceID]);
  
  // Fetch user profile data
  const [userProfile, setUserProfile] = useState(null);
  
  useEffect(() => {
    if (user?.uid) {
      getUserProfileData(user.uid).then(profile => {
        setUserProfile(profile);
        
      }).catch(err => {
        console.error("Error fetching user profile:", err);
      });
    }
  }, [user?.uid]);
  
  // Check if user can edit space (owner or disruptiveAdmin)
  useEffect(() => {
    const checkEditPermissions = async () => {
      if (user?.uid && spaceID) {
        try {
          const userProfile = await getUserProfileData(user.uid);
          
          // Check if user is an owner based on their groups
          let isOwner = false;
          if (userProfile.groups) {
            const ownerGroupId = `space_${spaceID}_owners`;
            isOwner = userProfile.groups.includes(ownerGroupId);
          }
          
          // Check if user is a disruptiveAdmin
          const isAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
          
          // User can edit if they're an owner or admin
          setCanEditSpace(isOwner || isAdmin);
        } catch (error) {
          console.error('Error checking edit permissions:', error);
          setCanEditSpace(false);
        }
      } else {
        setCanEditSpace(false);
      }
    };
    
    checkEditPermissions();
  }, [user?.uid, spaceID]);
  
  // Check if user is logged in and show sign-in modal if not (respecting guest access)
  useEffect(() => {
    const checkAuthenticationRequirement = async () => {
      // If there's a Unity error, always show sign-in modal
      if (error) {
        
        setShowSignInModal(true);
        setIsModalOpen(true);
        return;
      }

      // If user is logged in, hide sign-in modal
      if (user) {
        setShowSignInModal(false);
        return;
      }

      // User is not logged in - STRICT check if guest access is allowed
      try {
        const spaceData = await getSpaceItem(spaceID);
        if (spaceData && spaceData.allowGuestUsers === true) {
          
          setShowSignInModal(false);
          // Guest user will be created automatically by UserProvider
        } else {
          
          setShowSignInModal(true);
          setIsModalOpen(true);
        }
      } catch (error) {
        
        // STRICT: Default to showing sign-in modal if we can't verify space settings
        setShowSignInModal(true);
        setIsModalOpen(true);
      }
    };

    // Add a small delay to ensure the UI is ready
    const timer = setTimeout(() => {
      checkAuthenticationRequirement();
    }, 1000);

    return () => clearTimeout(timer);
  }, [error, user, spaceID]);
  
  // Handle player instantiation
  useEffect(() => {
    
    
    const handlePlayerInstantiated = () => {
      
      setIsPlayerInstantiated(true);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent("PlayerInstantiated"));
      
      // Set window flag for other components
      window.isPlayerInstantiated = true;
    };
    
    // Check if we already have a player instantiated flag from a previous mount
    if (window.isPlayerInstantiated) {
      
      setIsPlayerInstantiated(true);
    }
    
    eventBus.subscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
    
    // Force player instantiation after a timeout if it hasn't happened yet
    const timeoutId = setTimeout(() => {
      if (!isPlayerInstantiated) {
        
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
      
      setIsModalOpen(true);
    };

    const handleModalClose = () => {
      
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
      
      
      // Make sure it's visible
      webglRoot.style.display = 'block';
      
      // Set the space ID attribute if needed
      if (spaceID && webglRoot.getAttribute('data-space-id') !== spaceID) {
        webglRoot.setAttribute('data-space-id', spaceID);
        
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
        
        
        // Set tabIndex to make canvas focusable (essential for keyboard input)
        unityCanvas.tabIndex = 1;
        
        // Remove outline to avoid visible focus ring
        unityCanvas.style.outline = 'none';
        
        // Add event listener to re-enable keyboard capture when canvas is clicked
        unityCanvas.addEventListener('click', () => {
          
          if (!isModalOpen) {
            // Use focusUnity which handles both focus and keyboard capture
            focusUnity(true);
          }
        });
        
        
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
    
    
    if (!isModalOpen) {
      focusUnity(true);
    }
  }, [isModalOpen]);

  // Add event listener for canvas clicks
  useEffect(() => {
    if (isLoaded && unityProvider) {
      const canvas = getUnityCanvas();
      if (canvas) {
        
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
      
      
      const handleGlobalClick = (e) => {
        // Don't refocus if clicking inside a modal
        if (isModalOpen) {
          
          return;
        }
        
        // Don't refocus if clicking on form elements
        if (e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT' ||
            e.target.tagName === 'BUTTON') {
          
          return;
        }
        
        // Don't refocus if clicking inside specific UI containers that should maintain their own focus
        if (e.target.closest('.chakra-modal__content') || 
            e.target.closest('[role="dialog"]') ||
            e.target.closest('[role="menu"]') ||
            e.target.closest('.chakra-popover__content') ||
            e.target.closest('[role="tooltip"]')) {
          
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
          
          
          // Ensure keyboard capture is enabled for Unity
          setTimeout(() => {
            if (!isModalOpen) {
              focusUnity(true);
            }
          }, 50);
          
          return;
        }
        
        // If clicked outside modals/forms/special UI, refocus the canvas
        
        
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
      
      
      
      
      
      
      
      
      
      // Stringify the data to see exactly what Unity will receive
      
      
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
  
  // Handle edit mode toggle from events
  const handleEditModeToggle = (editMode) => {
    
    setIsEditMode(editMode);
  };
  
  // Handle edit mode button click - toggles Content Admin modal and edit mode
  const handleEditModeButtonClick = () => {
    // Check if user has permission to edit
    if (!canEditSpace) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit this space. Only space owners can use Edit Mode.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return;
    }
    
    // If modal is currently open, just close it (keep edit mode on)
    if (isContentAdminOpen) {
      setIsContentAdminOpen(false);
      setIsModalOpen(false);
      return;
    }
    
    // If edit mode is off, turn it on and open modal
    if (!isEditMode) {
      setIsEditMode(true);
      setIsContentAdminOpen(true);
      setIsModalOpen(true);
      
      // Dispatch event to notify other components
      const editModeEvent = new CustomEvent('editModeChanged', { 
        detail: { enabled: true } 
      });
      window.dispatchEvent(editModeEvent);
    } 
    // If edit mode is on and modal is closed, turn off edit mode
    else {
      setIsEditMode(false);
      
      // Dispatch event to notify other components
      const editModeEvent = new CustomEvent('editModeChanged', { 
        detail: { enabled: false } 
      });
      window.dispatchEvent(editModeEvent);
    }
  };
  
  // Handle closing the Content Admin modal
  const handleCloseContentAdmin = () => {
    setIsContentAdminOpen(false);
    setIsModalOpen(false);
    
    // Keep edit mode enabled when modal closes
  };
  
  // Handle player list toggle
  const handlePlayerListToggle = () => {
    setIsPlayerListVisible(!isPlayerListVisible);
  };
  
  // Determine if voice chat should be enabled (only check for user)
  const showVoiceChat = user && settings.enableVoiceChat;
  
  
  
  // Listen for Edit Mode changes
  useEffect(() => {
    const handleEditModeChange = (event) => {
      
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
    
    setIsPortalEditorOpen(false);
    clearClickedPortal();
  };

  // Add debug logging for render
  
  
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
      
      {/* Add the PersistentLoader component with container ref - only when sign-in not required */}
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

      {/* Content Admin Modal for Edit Mode */}
      <ContentAdminModal 
        isOpen={isContentAdminOpen} 
        onClose={handleCloseContentAdmin} 
        settings={{ spaceID }}
      />

      <PortalManager containerRef={fullscreenRef.current ? fullscreenRef : document.body}>
        <div ref={ref} style={{ width: "100%", height: "100%", aspectRatio: "auto", position: "absolute" }}>
          {/* Top right buttons - Moved inside the fullscreen container - also changed aspact ratio from 16/9 and position to absolute from relative */}
          <Box position="absolute" zIndex="10" top={4} right={4} display="flex" alignItems="center" gap={2}>
            <AuthenticationButton />
            
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
            
            {/* Edit Mode Button - Show only for space owners and admins */}
            {canEditSpace && (
              <Box
                as="button"
                onClick={handleEditModeButtonClick}
                aria-label="Edit Mode"
                display="flex"
                alignItems="center"
                justifyContent="center"
                width="48px"
                height="48px"
                color="white"
                bg={isEditMode 
                  ? "linear-gradient(135deg, rgba(0, 0, 0, 0.45), rgba(0, 150, 255, 0.2), rgba(0, 0, 0, 0.35))" 
                  : "linear-gradient(135deg, rgba(0, 0, 0, 0.5), rgba(20, 20, 20, 0.4))"
                }
                backdropFilter="blur(30px) saturate(200%) brightness(1.1)"
                _hover={{ 
                  bg: isEditMode 
                    ? "linear-gradient(135deg, rgba(0, 0, 0, 0.55), rgba(0, 150, 255, 0.3), rgba(0, 0, 0, 0.45))" 
                    : "linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(20, 20, 20, 0.5))",
                  transform: "scale(1.05)",
                  backdropFilter: "blur(35px) saturate(220%) brightness(1.15)"
                }}
                cursor="pointer"
                boxShadow={isEditMode 
                  ? "0 0 20px 2px rgba(0, 150, 255, 0.8), 0 0 40px 4px rgba(0, 150, 255, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.3)" 
                  : "0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.2)"
                }
                transition="all 0.3s ease"
                border="1px solid"
                borderColor={isEditMode ? "rgba(0, 150, 255, 0.4)" : "rgba(255, 255, 255, 0.2)"}
                borderRadius="full"
                position="relative"
                _before={{
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: "full",
                  padding: "1px",
                  background: isEditMode 
                    ? "linear-gradient(135deg, rgba(0, 150, 255, 0.5), rgba(0, 200, 255, 0.2))" 
                    : "linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1))",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                  pointerEvents: "none"
                }}
              >
                <FaWrench size="20px" />
              </Box>
            )}
            
            <ProfileButton />
            
            <Box position="relative" zIndex="9999">
              <CanvasMainMenu 
                onTogglePlayerList={handlePlayerListToggle}
                spaceID={spaceID}
                containerRef={unityContainerRef}
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
            
            {/* Unity display - z-index 1 - only render when sign-in not required */}
            <Box {...fadeStyles} width="100%" height="100%" position="absolute" zIndex="1">
              {unityProvider && !showSignInModal ? (
                <Unity 
                  unityProvider={unityProvider}
                  style={{ width: "100%", height: "100%" }}
                  devicePixelRatio={devicePixelRatio}
                  tabIndex={1} // Set tabIndex to 1 to enable proper keyboard focus handling
                />
              ) : (
                <Box width="100%" height="100%" backgroundColor="#333" display="flex" alignItems="center" justifyContent="center">
                  {showSignInModal && (
                    <Text color="white" fontSize="lg">Authentication Required</Text>
                  )}
                </Box>
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
              resetNameplateData();
            }}
            playerName={nameplateData?.playerName || "Unknown Player"}
            playerId={nameplateData?.playerId || "Unknown ID"}
            uid={nameplateData?.uid}
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
              <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(8px)" />
              <ModalContent
                bg="#1a1a1a"
                borderRadius="xl"
                border="1px solid #333"
                maxW="420px"
                p={0}
              >
                <ModalHeader
                  fontSize="md"
                  fontWeight="600"
                  pb={1}
                  pt={3}
                  px={4}
                  color="white"
                  textAlign="center"
                >
                  {targetSpaceName ? `Visit ${targetSpaceName}?` : 'Visit Space?'}
                </ModalHeader>
                <ModalCloseButton
                  color="white"
                  bg="rgba(255,255,255,0.1)"
                  _hover={{ color: "gray.400", bg: "transparent" }}
                  borderRadius="full"
                  size="sm"
                  top={2}
                  right={3}
                />
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
                      onClick={async () => {
                        // Track portal navigation analytics before navigating
                        if (clickedPortal && user) {
                          // Extract target space ID from portal ID if available
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
                            targetSpaceId: targetSpaceId,
                            sourceSpaceId: spaceID,
                            targetSpaceName: targetSpaceName,
                            targetSpaceSlug: targetSpaceSlug,
                            isEditMode: false, // Portal navigation is in play mode
                            navigationType: 'confirmed', // This is modal-confirmed navigation
                            timestamp: new Date().toISOString()
                          });
                          
                          
                        }
                        
                        // Navigate to the target space
                        if (targetSpaceSlug) {
                          window.open(`https://www.spacesmetaverse.com/w/${targetSpaceSlug}`, '_blank', 'noopener');
                        }
                        
                        // Clean up state
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

          {/* WebGL Chat System */}
          <WebGLChatWindow 
            spaceID={spaceID}
            isVisible={!showSignInModal && user}
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