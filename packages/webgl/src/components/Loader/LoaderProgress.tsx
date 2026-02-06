import React, { useState, useEffect, useRef, useContext } from "react";
import PropTypes from "prop-types";
import { useUnity } from "../../providers/UnityProvider";
import SignIn from "@disruptive-spaces/shared/components/auth/SignIn";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getSpaceItem } from "@disruptive-spaces/shared/firebase/spacesFirestore";
import { useListenForUnityEvent } from "../../hooks/unityEvents/core/useListenForUnityEvent";

interface Props {
  isPortalTransition?: boolean;
}

function LoaderProgress({ isPortalTransition = false }: Props) {
  const { loadingProgression, isLoaded, error, spaceID } = useUnity();
  const { user } = useContext(UserContext);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [isFirstSceneLoaded, setIsFirstSceneLoaded] = useState(false);
  const playerInstantiatedRef = useRef(false);
  const firstSceneLoadedRef = useRef(false);
  const unityCanvasRef = useRef<HTMLElement | null>(null);
  const unityContainerRef = useRef<HTMLElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const listenToUnityMessage = useListenForUnityEvent();
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canvasCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    const style = document.createElement('style');
    style.textContent = `
      #unity-canvas, #unity-container {
        opacity: 0 !important;
        transition: opacity 1s ease-in-out;
        z-index: 1 !important;
      }

      .loader-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 99999 !important;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 1.5s ease-in-out;
        pointer-events: auto !important;
        transform: translateZ(0);
      }

      .loader-content {
        background-color: rgba(0, 0, 0, 0.8);
        padding: 1rem;
        border-radius: 0.5rem;
        color: white;
        text-align: center;
        z-index: 100000 !important;
      }
    `;

    document.head.appendChild(style);
    styleRef.current = style;

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
        canvas.style.zIndex = '1';
      }

      if (container) {
        unityContainerRef.current = container;
        container.style.zIndex = '1';
      }

      if (canvas && container) {
        if (canvasCheckIntervalRef.current) {
          clearInterval(canvasCheckIntervalRef.current);
          canvasCheckIntervalRef.current = null;
        }
      }
    };

    findElements();
    canvasCheckIntervalRef.current = setInterval(findElements, 100);

    return () => {
      if (canvasCheckIntervalRef.current) {
        clearInterval(canvasCheckIntervalRef.current);
        canvasCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Listen for FirstSceneLoaded event
  useEffect(() => {
    if ((window as any).isFirstSceneLoaded) {
      firstSceneLoadedRef.current = true;
      setIsFirstSceneLoaded(true);
    }

    const handleFirstSceneLoaded = () => {
      firstSceneLoadedRef.current = true;
      setIsFirstSceneLoaded(true);
      (window as any).isFirstSceneLoaded = true;
    };

    const unsubscribe = listenToUnityMessage("FirstSceneLoaded", handleFirstSceneLoaded);

    const forceTimeout = setTimeout(() => {
      if (!firstSceneLoadedRef.current) {
        firstSceneLoadedRef.current = true;
        setIsFirstSceneLoaded(true);
        (window as any).isFirstSceneLoaded = true;
      }
    }, 10000);

    return () => {
      unsubscribe();
      clearTimeout(forceTimeout);
    };
  }, [listenToUnityMessage]);

  // Listen for PlayerInstantiated event
  useEffect(() => {
    if ((window as any).isPlayerInstantiated) {
      playerInstantiatedRef.current = true;
      setIsPlayerInstantiated(true);

      if (!firstSceneLoadedRef.current) {
        firstSceneLoadedRef.current = true;
        setIsFirstSceneLoaded(true);
        (window as any).isFirstSceneLoaded = true;
      }
    }

    const handlePlayerInstantiated = () => {
      playerInstantiatedRef.current = true;
      setIsPlayerInstantiated(true);

      if (!firstSceneLoadedRef.current) {
        firstSceneLoadedRef.current = true;
        setIsFirstSceneLoaded(true);
        (window as any).isFirstSceneLoaded = true;
      }
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    const unsubscribe = listenToUnityMessage("PlayerInstantiated", handlePlayerInstantiated);

    const forceTimeout = setTimeout(() => {
      if (!playerInstantiatedRef.current) {
        playerInstantiatedRef.current = true;
        setIsPlayerInstantiated(true);

        if (!firstSceneLoadedRef.current) {
          firstSceneLoadedRef.current = true;
          setIsFirstSceneLoaded(true);
          (window as any).isFirstSceneLoaded = true;
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
    if (isFirstSceneLoaded && isPlayerInstantiated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (unityCanvasRef.current) {
          (unityCanvasRef.current as HTMLElement).style.opacity = '1';
          (unityCanvasRef.current as HTMLElement).style.removeProperty('opacity');
        }

        if (unityContainerRef.current) {
          (unityContainerRef.current as HTMLElement).style.opacity = '1';
          (unityContainerRef.current as HTMLElement).style.removeProperty('opacity');
        }

        if (loaderRef.current) {
          loaderRef.current.style.opacity = '0';
          loaderRef.current.style.pointerEvents = 'none';

          setTimeout(() => {
            if (loaderRef.current) {
              loaderRef.current.style.display = 'none';
            }
          }, 1500);
        }
      }, 2000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isFirstSceneLoaded, isPlayerInstantiated]);

  const getLoadingStage = () => {
    if (isPortalTransition) {
      if (!isLoaded) return "Traveling to new world...";
      if (isLoaded && !isFirstSceneLoaded && !isPlayerInstantiated) return "Arriving at destination...";
      if (isFirstSceneLoaded && !isPlayerInstantiated) return "Materializing...";
      return "Welcome!";
    }
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
        <div
          className="absolute z-[99999] w-full h-full flex items-center justify-center"
          style={{ transform: 'translateZ(0)' }}
        >
          <div className="flex flex-col gap-4 p-6 rounded-md bg-black/80 text-white">
            <p className="text-xl font-bold">Sign In Required</p>
            <p className="text-center">
              Please sign in to enter The Disruptive Spaces
            </p>
            <button
              className="btn btn-primary btn-lg w-[200px]"
              onClick={() => setIsSignInOpen(true)}
            >
              Sign In
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={loaderRef}
          className={`loader-overlay${isPortalTransition ? ' portal-continuation' : ''}`}
          style={{
            transform: 'translateZ(0)',
            zIndex: 99999
          }}
        >
          <div
            className="loader-content flex flex-col items-center w-[300px]"
            style={{ zIndex: 100000 }}
          >
            <p className="font-bold">Entering The Spaces Metaverse</p>
            <p className="text-sm">
              {getLoadingStage()}
            </p>
            <progress
              className="progress progress-primary w-full my-2"
              value={getProgressValue()}
              max="100"
            />
          </div>
        </div>
      )}
    </>
  );
}

LoaderProgress.propTypes = {
  isPortalTransition: PropTypes.bool
};

export default LoaderProgress;
