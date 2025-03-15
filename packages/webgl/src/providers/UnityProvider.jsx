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

  // Add more detailed logging for debugging
  useEffect(() => {
    Logger.log(`${DEBUG_PREFIX} PERMISSION DEBUG: spaceID value:`, spaceID);
    Logger.log(`${DEBUG_PREFIX} PERMISSION DEBUG: Component props:`, { 
      spaceID, loaderUrl, dataUrl, frameworkUrl, codeUrl 
    });
  }, [spaceID, loaderUrl, dataUrl, frameworkUrl, codeUrl]);

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

  // Create a unified context value that includes both Unity context and spaceID
  const unityInstance = {
    unityProvider,
    loadingProgression,
    isLoaded,
    sendMessage,
    addEventListener,
    removeEventListener,
    error,
    spaceID // Include spaceID in the context
  };

  // Add debug logging for the context value
  useEffect(() => {
    Logger.log(`${DEBUG_PREFIX} PERMISSION DEBUG: Unity context value:`, unityInstance);
    if (unityInstance.spaceID) {
      Logger.log(`${DEBUG_PREFIX} PERMISSION DEBUG: spaceID in context:`, unityInstance.spaceID);
    } else {
      Logger.error(`${DEBUG_PREFIX} PERMISSION DEBUG: spaceID is missing in context!`);
    }
  }, [unityInstance]);

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

  Logger.log(`${DEBUG_PREFIX} Rendering provider with instance:`, unityInstance);

  // Add debug logging for Unity build URLs
  useEffect(() => {
    Logger.log("UnityProvider: Unity build URLs:", {
      loaderUrl,
      dataUrl,
      frameworkUrl,
      codeUrl
    });
  }, [loaderUrl, dataUrl, frameworkUrl, codeUrl]);

  // Check if any of the required URLs are missing
  const missingUrls = [];
  if (!loaderUrl) missingUrls.push('loaderUrl');
  if (!dataUrl) missingUrls.push('dataUrl');
  if (!frameworkUrl) missingUrls.push('frameworkUrl');
  if (!codeUrl) missingUrls.push('codeUrl');

  if (missingUrls.length > 0) {
    Logger.error(`UnityProvider: Missing required Unity build URLs: ${missingUrls.join(', ')}`);
    return (
      <div style={{ padding: '20px', color: 'red', backgroundColor: '#ffeeee', border: '1px solid red', borderRadius: '5px' }}>
        <h3>Unity Build Error</h3>
        <p>Missing required Unity build URLs: {missingUrls.join(', ')}</p>
        <p>Please check the space configuration in Firestore.</p>
      </div>
    );
  }

  try {
    // Add debug logging for Unity context
    useEffect(() => {
      Logger.log("UnityProvider: Unity context created:", unityProvider);
      
      if (unityProvider) {
        Logger.log("UnityProvider: Unity provider is available");
      } else {
        Logger.error("UnityProvider: Unity provider is not available");
      }
      
      if (isLoaded) {
        Logger.log("UnityProvider: Unity is loaded");
      } else {
        Logger.log("UnityProvider: Unity is not loaded yet");
      }
    }, [unityProvider, isLoaded]);

    return (
      <UnityInstanceContext.Provider value={unityInstance}>
        {children}
      </UnityInstanceContext.Provider>
    );
  } catch (error) {
    Logger.error("UnityProvider: Error creating Unity context:", error);
    return (
      <div style={{ padding: '20px', color: 'red', backgroundColor: '#ffeeee', border: '1px solid red', borderRadius: '5px' }}>
        <h3>Unity Error</h3>
        <p>Error creating Unity context: {error.message}</p>
        <p>Please check the console for more details.</p>
      </div>
    );
  }
};

export const useUnity = () => useContext(UnityInstanceContext);
