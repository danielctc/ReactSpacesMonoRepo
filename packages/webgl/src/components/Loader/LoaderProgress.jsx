import React, { useState, useEffect, useRef } from "react";
import { Box, Flex, Text, Progress, Button, VStack } from "@chakra-ui/react";
import { useUnity } from "../../providers/UnityProvider";
import SignIn from "@disruptive-spaces/shared/components/auth/SignIn";
import { useContext } from "react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getSpaceItem } from "@disruptive-spaces/shared/firebase/spacesFirestore";
import { useListenForUnityEvent } from "../../hooks/unityEvents/core/useListenForUnityEvent";

function LoaderProgress() {
  const { loadingProgression, isLoaded, error, spaceID } = useUnity();
  const { user } = useContext(UserContext);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [isFirstSceneLoaded, setIsFirstSceneLoaded] = useState(false);
  const playerInstantiatedRef = useRef(false);
  const firstSceneLoadedRef = useRef(false);
  const unityCanvasRef = useRef(null);
  const unityContainerRef = useRef(null);
  const loaderRef = useRef(null);
  const listenToUnityMessage = useListenForUnityEvent();
  const styleRef = useRef(null);
  const timeoutRef = useRef(null);
  const canvasCheckIntervalRef = useRef(null);
  const debugIntervalRef = useRef(null);

  // Check if user needs to sign in (respecting guest access)
  useEffect(() => {
    const checkSignInRequirement = async () => {
      if (!user && loadingProgression === 0) {
        try {
          const spaceData = await getSpaceItem(spaceID);
          if (spaceData && spaceData.allowGuestUsers === true) {
            
            setShowSignInPrompt(false);
          } else {
            
            setShowSignInPrompt(true);
          }
        } catch (error) {
          console.error("LoaderProgress: Cannot verify space guest access, showing sign-in prompt for security:", error);
          // STRICT: Default to showing sign-in prompt if we can't verify space settings
          setShowSignInPrompt(true);
        }
      } else {
        setShowSignInPrompt(false);
      }
    };

    checkSignInRequirement();
  }, [user, loadingProgression, spaceID]);

  // Create and inject CSS styles
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.textContent = `
      /* Set initial Unity canvas styles */
      #unity-canvas, #unity-container {
        opacity: 0 !important;
        transition: opacity 1s ease-in-out;
        z-index: 1 !important; /* Ensure Unity is below our loader */
      }
      
      /* Loader overlay styles */
      .loader-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 99999 !important; /* Extremely high z-index */
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 1.5s ease-in-out;
        pointer-events: auto !important;
        transform: translateZ(0); /* Create stacking context */
      }
      
      /* Loader content styles */
      .loader-content {
        background-color: rgba(0, 0, 0, 0.8);
        padding: 1rem;
        border-radius: 0.5rem;
        color: white;
        text-align: center;
        z-index: 100000 !important; /* Even higher z-index */
      }
    `;
    
    // Add style to document
    document.head.appendChild(style);
    styleRef.current = style;
    
    // Clean up
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, []);

  // Find Unity canvas and container
  useEffect(() => {
    const findElements = () => {
      const canvas = document.getElementById('unity-canvas');
      const container = document.getElementById('unity-container');
      
      if (canvas) {
        unityCanvasRef.current = canvas;
        
        // Ensure Unity canvas has lower z-index
        canvas.style.zIndex = '1';
      }
      
      if (container) {
        unityContainerRef.current = container;
        
        // Ensure Unity container has lower z-index
        container.style.zIndex = '1';
      }
      
      if (canvas && container) {
        // Clear interval once we've found both elements
        if (canvasCheckIntervalRef.current) {
          clearInterval(canvasCheckIntervalRef.current);
          canvasCheckIntervalRef.current = null;
        }
      }
    };
    
    // Check immediately
    findElements();
    
    // Also set up interval to keep checking
    canvasCheckIntervalRef.current = setInterval(findElements, 100);
    
    // Clean up
    return () => {
      if (canvasCheckIntervalRef.current) {
        clearInterval(canvasCheckIntervalRef.current);
        canvasCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Listen for FirstSceneLoaded event
  useEffect(() => {
    // Check if we already have a window flag for FirstSceneLoaded
    if (window.isFirstSceneLoaded) {
      firstSceneLoadedRef.current = true;
      setIsFirstSceneLoaded(true);
    }
    
    const handleFirstSceneLoaded = () => {
      firstSceneLoadedRef.current = true;
      setIsFirstSceneLoaded(true);
      
      // Set window flag for other components
      window.isFirstSceneLoaded = true;
    };
    
    const unsubscribe = listenToUnityMessage("FirstSceneLoaded", handleFirstSceneLoaded);
    
    // Force FirstSceneLoaded after a timeout if it hasn't happened yet
    const forceTimeout = setTimeout(() => {
      if (!firstSceneLoadedRef.current) {
        firstSceneLoadedRef.current = true;
        setIsFirstSceneLoaded(true);
        window.isFirstSceneLoaded = true;
      }
    }, 10000); // 10 seconds timeout
    
    return () => {
      unsubscribe();
      clearTimeout(forceTimeout);
    };
  }, [listenToUnityMessage]);

  // Listen for PlayerInstantiated event
  useEffect(() => {
    // Check if already instantiated
    if (window.isPlayerInstantiated) {
      playerInstantiatedRef.current = true;
      setIsPlayerInstantiated(true);
      
      // Also force FirstSceneLoaded if player is already instantiated
      if (!firstSceneLoadedRef.current) {
        firstSceneLoadedRef.current = true;
        setIsFirstSceneLoaded(true);
        window.isFirstSceneLoaded = true;
      }
    }
    
    const handlePlayerInstantiated = () => {
      playerInstantiatedRef.current = true;
      setIsPlayerInstantiated(true);
      
      // Also force FirstSceneLoaded if it hasn't happened yet
      if (!firstSceneLoadedRef.current) {
        firstSceneLoadedRef.current = true;
        setIsFirstSceneLoaded(true);
        window.isFirstSceneLoaded = true;
      }
    };
    
    // Listen for window event
    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    
    // Also listen for Unity event
    const unsubscribe = listenToUnityMessage("PlayerInstantiated", handlePlayerInstantiated);
    
    // Force player instantiation after timeout
    const forceTimeout = setTimeout(() => {
      if (!playerInstantiatedRef.current) {
        playerInstantiatedRef.current = true;
        setIsPlayerInstantiated(true);
        
        // Also force FirstSceneLoaded if it hasn't happened yet
        if (!firstSceneLoadedRef.current) {
          firstSceneLoadedRef.current = true;
          setIsFirstSceneLoaded(true);
          window.isFirstSceneLoaded = true;
        }
      }
    }, 20000);
    
    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
      unsubscribe();
      clearTimeout(forceTimeout);
    };
  }, [listenToUnityMessage]);

  // Handle visibility changes based on player instantiation
  useEffect(() => {
    // Only proceed if both conditions are met
    if (isFirstSceneLoaded && isPlayerInstantiated) {
      
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set timeout to show Unity canvas and hide loader
      timeoutRef.current = setTimeout(() => {
        // Show Unity canvas
        if (unityCanvasRef.current) {
          unityCanvasRef.current.style.opacity = '1';
          unityCanvasRef.current.style.removeProperty('opacity');
        }
        
        if (unityContainerRef.current) {
          unityContainerRef.current.style.opacity = '1';
          unityContainerRef.current.style.removeProperty('opacity');
        }
        
        // Hide loader
        if (loaderRef.current) {
          loaderRef.current.style.opacity = '0';
          loaderRef.current.style.pointerEvents = 'none';
          
          // Remove from DOM after transition
          setTimeout(() => {
            if (loaderRef.current) {
              loaderRef.current.style.display = 'none';
            }
          }, 1500);
        }
        
        // Don't remove the style element to maintain z-index control
      }, 2000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isFirstSceneLoaded, isPlayerInstantiated]);

  // Determine the current loading stage and progress
  const getLoadingStage = () => {
    if (!isLoaded) return "World loading";
    if (isLoaded && !isFirstSceneLoaded && !isPlayerInstantiated) return "Scene initializing";
    if (isFirstSceneLoaded && !isPlayerInstantiated) return "Player initializing";
    return "Ready";
  };

  const getProgressValue = () => {
    if (!isLoaded) return loadingProgression * 80;
    if (isLoaded && !isFirstSceneLoaded && !isPlayerInstantiated) return 85;
    if (isFirstSceneLoaded && !isPlayerInstantiated) return 95;
    return 100;
  };

  return (
    <>
      {showSignInPrompt ? (
        <Box
          position="absolute"
          zIndex="99999"
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          style={{ transform: 'translateZ(0)' }}
        >
          <VStack
            spacing={4}
            padding={6}
            borderRadius="md"
            backgroundColor="rgba(0, 0, 0, 0.8)"
            color="white"
          >
            <Text fontSize="xl" fontWeight="bold">Sign In Required</Text>
            <Text textAlign="center">
              Please sign in to enter The Disruptive Spaces
            </Text>
            <Button
              colorScheme="blue"
              size="lg"
              width="200px"
              onClick={() => setIsSignInOpen(true)}
            >
              Sign In
            </Button>
          </VStack>
        </Box>
      ) : (
        <Box
          ref={loaderRef}
          className="loader-overlay"
          style={{ 
            transform: 'translateZ(0)',
            zIndex: 99999
          }}
        >
          <Flex
            className="loader-content"
            flexDirection="column"
            alignItems="center"
            width="300px"
            style={{ zIndex: 100000 }}
          >
            <Text fontWeight="bold">Entering The Spaces Metaverse</Text>
            <Text fontSize="sm">
              {getLoadingStage()}
            </Text>
            <Progress
              value={getProgressValue()}
              size="lg"
              width="100%"
              marginY={2}
            />
          </Flex>
        </Box>
      )}
    </>
  );
}

export default LoaderProgress;
