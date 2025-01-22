import React, { createContext, useContext, useEffect } from "react";
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

  // Monitor initialization
  useEffect(() => {
    Logger.log(`${DEBUG_PREFIX} Component mounted`);
    return () => {
      Logger.log(`${DEBUG_PREFIX} Component unmounting`);
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
    <UnityInstanceContext.Provider value={unityInstance} tabIndex={1}>
      {children}
    </UnityInstanceContext.Provider>
  );
};

export const useUnity = () => useContext(UnityInstanceContext);
