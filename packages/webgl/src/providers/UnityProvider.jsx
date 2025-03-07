import React, { createContext, useContext, useEffect, useRef } from "react";
import { useUnityContext } from "react-unity-webgl";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const DEBUG_PREFIX = '[UnityProvider]';
export const UnityInstanceContext = createContext();

export const UnityProvider = ({
  spaceID,
  children,
  loaderUrl,
  dataUrl,
  frameworkUrl,
  codeUrl,
  loadingBackground,
  showLoginButton,
  showDisruptiveLogo
}) => {
  Logger.log(`${DEBUG_PREFIX} Initializing with spaceID:`, spaceID);
  Logger.log(`${DEBUG_PREFIX} Unity URLs:`, { loaderUrl, dataUrl, frameworkUrl, codeUrl });

  const {
    unityProvider,
    loadingProgression,
    isLoaded,
    sendMessage,
    addEventListener,
    removeEventListener,
    error
  } = useUnityContext({
    loaderUrl: loaderUrl,
    dataUrl: dataUrl,
    frameworkUrl: frameworkUrl,
    codeUrl: codeUrl
  });

  const keepAliveInterval = useRef(null);
  const lastActivityTime = useRef(Date.now());

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        Logger.log(`${DEBUG_PREFIX} Page hidden, starting keep-alive`);
        startKeepAlive();
      } else {
        Logger.log(`${DEBUG_PREFIX} Page visible, stopping keep-alive`);
        stopKeepAlive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopKeepAlive();
    };
  }, []);

  // Handle user activity
  useEffect(() => {
    const handleActivity = () => {
      lastActivityTime.current = Date.now();
      if (document.hidden) {
        // If we're in background, send a keep-alive message
        sendMessage('WebGLInputManager', 'KeepAlive');
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [sendMessage]);

  const startKeepAlive = () => {
    if (keepAliveInterval.current) return;
    
    keepAliveInterval.current = setInterval(() => {
      if (isLoaded && document.hidden) {
        // Send keep-alive message to Unity
        sendMessage('WebGLInputManager', 'KeepAlive');
        Logger.debug(`${DEBUG_PREFIX} Sent keep-alive message`);
      }
    }, 10000); // Send every 10 seconds
  };

  const stopKeepAlive = () => {
    if (keepAliveInterval.current) {
      clearInterval(keepAliveInterval.current);
      keepAliveInterval.current = null;
    }
  };

  // Monitor initialization
  useEffect(() => {
    Logger.log(`${DEBUG_PREFIX} Component mounted`);
    return () => {
      Logger.log(`${DEBUG_PREFIX} Component unmounting`);
      stopKeepAlive();
    };
  }, []);

  // Monitor loading progress
  useEffect(() => {
    Logger.log(`${DEBUG_PREFIX} Loading progress:`, loadingProgression);
  }, [loadingProgression]);

  // Monitor loaded state
  useEffect(() => {
    if (isLoaded) {
      Logger.log(`${DEBUG_PREFIX} Unity instance loaded for:`, spaceID);
      // Start keep-alive if page is hidden
      if (document.hidden) {
        startKeepAlive();
      }
    }
  }, [isLoaded, spaceID]);

  // Monitor errors
  useEffect(() => {
    if (error) {
      Logger.error(`${DEBUG_PREFIX} Unity error:`, error);
    }
  }, [error]);

  const unityInstance = {
    spaceID,
    unityProvider,
    loadingProgression,
    isLoaded,
    sendMessage,
    addEventListener,
    removeEventListener,
  };

  Logger.log(`${DEBUG_PREFIX} Rendering provider with instance:`, unityInstance);

  return (
    <UnityInstanceContext.Provider value={unityInstance}>
      {children}
    </UnityInstanceContext.Provider>
  );
};

export const useUnity = () => useContext(UnityInstanceContext);
