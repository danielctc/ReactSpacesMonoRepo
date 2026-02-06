import React, { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useUnityContext } from "react-unity-webgl";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

// Optional import for SpaceNavigationProvider
// If not available, we create a no-op hook
let useSpaceNavigation: any;
try {
  const module = require('@disruptive-spaces/shared/providers/SpaceNavigationProvider');
  useSpaceNavigation = module.useSpaceNavigation;
} catch {
  // SpaceNavigationProvider not available - provide no-op hook
  useSpaceNavigation = () => null;
}

const DEBUG_PREFIX = '[UnityProvider]';

interface UnityInstance {
  unityProvider: any;
  loadingProgression: number;
  isLoaded: boolean;
  sendMessage: (gameObjectName: string, methodName: string, parameter?: any) => void;
  addEventListener: (eventName: string, callback: (...args: any[]) => void) => void;
  removeEventListener: (eventName: string, callback: (...args: any[]) => void) => void;
  unload?: () => Promise<void>;
  error?: Error | null;
  spaceID: string;
}

export const UnityInstanceContext = createContext<UnityInstance | null>(null);

interface UnityProviderProps {
  spaceID: string;
  children: ReactNode;
  loaderUrl: string;
  dataUrl: string;
  frameworkUrl: string;
  codeUrl: string;
  loadingBackground?: string;
  showLoginButton?: boolean;
  showDisruptiveLogo?: boolean;
}

export const UnityProvider: React.FC<UnityProviderProps> = ({
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
    unload,
    error
  } = useUnityContext({
    loaderUrl: loaderUrl,
    dataUrl: dataUrl,
    frameworkUrl: frameworkUrl,
    codeUrl: codeUrl
  });

  // Try to get SpaceNavigation context (optional integration)
  const spaceNavContext = useSpaceNavigation();

  // Register unload function with SpaceNavigationProvider if available
  useEffect(() => {
    if (spaceNavContext?.registerUnload && unload) {
      Logger.log('[UnityProvider] Registering unload function with SpaceNavigationProvider');
      spaceNavContext.registerUnload(unload);
    }
  }, [spaceNavContext, unload]);

  // Report loading progress to SpaceNavigationProvider (for transition UI)
  useEffect(() => {
    if (spaceNavContext?.onLoadProgress && loadingProgression > 0) {
      spaceNavContext.onLoadProgress(loadingProgression);
    }
  }, [spaceNavContext, loadingProgression]);

  // Report load complete to SpaceNavigationProvider
  useEffect(() => {
    if (spaceNavContext?.onLoadComplete && isLoaded) {
      Logger.log('[UnityProvider] Notifying SpaceNavigationProvider of load complete');
      spaceNavContext.onLoadComplete();
    }
  }, [spaceNavContext, isLoaded]);

  // Create a unified context value that includes both Unity context and spaceID
  const unityInstance: UnityInstance = {
    unityProvider,
    loadingProgression,
    isLoaded,
    sendMessage,
    addEventListener,
    removeEventListener,
    unload,
    error,
    spaceID // Include spaceID in the context
  };

  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
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

  // Monitor loaded state and register Unity instance globally
  useEffect(() => {
    if (isLoaded) {
      Logger.log(`${DEBUG_PREFIX} Unity instance loaded for:`, spaceID);

      // Register Unity instance globally for unityKeyboard.js
      const unityInstanceForKeyboard = {
        SendMessage: sendMessage,
        Module: unityProvider?.Module
      };

      (window as any).unityInstance = unityInstanceForKeyboard;

      // Call registerUnityInstance if it exists
      if ((window as any).registerUnityInstance) {
        (window as any).registerUnityInstance(unityInstanceForKeyboard);
      }

      // Start keep-alive if page is hidden
      if (document.hidden) {
        startKeepAlive();
      }
    }
  }, [isLoaded, spaceID, sendMessage, unityProvider]);

  // FALLBACK: Register Unity instance when sendMessage becomes available
  // This handles cases where isLoaded doesn't fire but Unity is actually ready
  useEffect(() => {
    if (sendMessage && !(window as any).unityInstance) {
      Logger.log(`${DEBUG_PREFIX} Fallback: Registering Unity instance via sendMessage availability`);

      const unityInstanceForKeyboard = {
        SendMessage: sendMessage,
        Module: unityProvider?.Module
      };

      (window as any).unityInstance = unityInstanceForKeyboard;

      // Call registerUnityInstance if it exists
      if ((window as any).registerUnityInstance) {
        (window as any).registerUnityInstance(unityInstanceForKeyboard);
      }
    }
  }, [sendMessage, unityProvider]);

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
  const missingUrls: string[] = [];
  if (!loaderUrl) missingUrls.push('loaderUrl');
  if (!dataUrl) missingUrls.push('dataUrl');
  if (!frameworkUrl) missingUrls.push('frameworkUrl');
  if (!codeUrl) missingUrls.push('codeUrl');

  if (missingUrls.length > 0) {
    Logger.error(`UnityProvider: Missing required Unity build URLs: ${missingUrls.join(', ')}`);
    // Instead of showing an error, we'll still render the provider with a dummy unityProvider
    // This allows the background and loader to display normally
    return (
      <UnityInstanceContext.Provider value={{
        unityProvider: null,
        loadingProgression: 0,
        isLoaded: false,
        sendMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        error: new Error(`Missing required Unity build URLs: ${missingUrls.join(', ')}`),
        spaceID
      }}>
        {children}
      </UnityInstanceContext.Provider>
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
  } catch (error: any) {
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
