// @jsxImportSource react
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import SignIn from '@disruptive-spaces/shared/components/auth/SignIn';

import { UnityProvider } from "./providers/UnityProvider";

import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { fetchHttpUrlFromGsUrl } from '@disruptive-spaces/shared/firebase/firebaseStorage';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getTransition, clearTransition } from '@disruptive-spaces/shared/utils/portal-transition';

import WebGLRenderer from "./WebGLRenderer";

// Optional import for single-tab navigation context
// Uses try/catch to avoid breaking when provider is not available
let useSpaceNavigation: any;
try {
  const module = require('@disruptive-spaces/shared/providers/SpaceNavigationProvider');
  useSpaceNavigation = module.useSpaceNavigation;
} catch {
  // SpaceNavigationProvider not available - provide no-op hook
  useSpaceNavigation = () => null;
}

// Define a fallback MultipleView class if it doesn't exist
// This ensures there's always a MultipleView available
if (typeof window !== 'undefined' && !(window as any).MultipleView) {
  (window as any).MultipleView = class MultipleView {
    multiView: any;
    constructor() {
      this.multiView = {
        getPlayer: () => ({
          isPlaying: false,
          play: () => true,
          pause: () => true,
          mute: (state: boolean) => true,
          isMuted: false,
          seek: (time: number) => true,
          setVolume: (volume: number) => true,
          getVolume: () => 1.0,
          getCurrentTime: () => 0,
          getDuration: () => 100
        }),
        initialize: () => true,
        setUnityContext: (contextId: string) => {
          (window as any).hisPlayerContextId = contextId;
          return true;
        },
        release: () => true,
        setProperties: (props: any) => true,
        setMultiPaths: (paths: any) => {
          (window as any)._hisplayer_paths = paths;
          return true;
        }
      };
    }
  };
}

// Initialize HISPlayer functions if not already defined
if (typeof window !== 'undefined' && !(window as any)._hisPlayerInitialized) {
  Logger.log("WebGLLoader: Initializing HISPlayer functions");

  // Mark as initialized to avoid duplicate initialization
  (window as any)._hisPlayerInitialized = true;

  // Initialize event and error queues if not already defined
  (window as any)._hisplayer_event_queue = (window as any)._hisplayer_event_queue || [];
  (window as any)._hisplayer_error_queue = (window as any)._hisplayer_error_queue || [];

  // Create error display div if needed
  if (!document.getElementById('hisplayer-error')) {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'hisplayer-error';
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '10px';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translateX(-50%)';
    errorDiv.style.color = 'red';
    errorDiv.style.zIndex = '9999';
    document.body.appendChild(errorDiv);
    Logger.log("WebGLLoader: Created hisplayer-error div");
  }

  // Define utility functions for HISPlayer
  (window as any).isErrorQueueEmpty = (window as any).isErrorQueueEmpty || function () {
    return (window as any)._hisplayer_error_queue.length === 0;
  };

  (window as any).getNextError = (window as any).getNextError || function () {
    return (window as any)._hisplayer_error_queue.length > 0 ?
      (window as any)._hisplayer_error_queue.shift() : "";
  };

  (window as any).isEventQueueEmpty = (window as any).isEventQueueEmpty || function () {
    return (window as any)._hisplayer_event_queue.length === 0;
  };

  (window as any).getNextEvent = (window as any).getNextEvent || function () {
    return (window as any)._hisplayer_event_queue.length > 0 ?
      (window as any)._hisplayer_event_queue.shift() : "";
  };

  // Define setUpContext function if it doesn't exist yet
  (window as any).setUpContext = (window as any).setUpContext || function (contextId: string) {
    (window as any).hisPlayerContextId = contextId;

    try {
      if ((window as any).MultipleView) {
        const player = new (window as any).MultipleView();

        if (player && player.multiView && typeof player.multiView.setUnityContext === 'function') {
          player.multiView.setUnityContext(contextId);
          (window as any)._hisplayer_instance = player;
          return true;
        } else {
          console.error("HISPlayer: Player initialization failed - missing expected methods");
        }
      } else {
        console.error("HISPlayer: MultipleView class not found");

        // Define MultipleView if it's still not found
        (window as any).MultipleView = class MultipleView {
          multiView: any;
          constructor() {
            this.multiView = {
              getPlayer: () => ({
                isPlaying: false,
                play: () => true,
                pause: () => true,
                mute: () => true,
                isMuted: false,
                seek: () => true,
                setVolume: () => true,
                getVolume: () => 1.0,
                getCurrentTime: () => 0,
                getDuration: () => 100
              }),
              initialize: () => true,
              setUnityContext: (ctxId: string) => {
                (window as any).hisPlayerContextId = ctxId;
                return true;
              },
              release: () => true,
              setProperties: () => true,
              setMultiPaths: () => true
            };
          }
        };

        const backupPlayer = new (window as any).MultipleView();
        backupPlayer.multiView.setUnityContext(contextId);
        (window as any)._hisplayer_instance = backupPlayer;
        return true;
      }
    } catch (e: any) {
      console.error("HISPlayer: Error in setUpContext:", e);

      const errorDiv = document.getElementById('hisplayer-error');
      if (errorDiv) {
        errorDiv.textContent = "Error: " + e.message;
      }
    }

    return false;
  };
}

interface WebGLLoaderProps {
  spaceID: string;
  overrideSettings?: any;
}

const WebGLLoader: React.FC<WebGLLoaderProps> = ({ spaceID: propSpaceID, overrideSettings }) => {
  const fullscreenRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true); // Initial loading state set to true
  const { loading: userLoading, isUserBannedFromSpace, user } = useContext(UserContext);
  const [banned, setBanned] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);

  // Single-tab navigation context (optional - for portal transitions without page reload)
  const spaceNav = useSpaceNavigation?.() || {};
  const { currentSpaceId } = spaceNav;

  // Use context spaceId if available (during navigation), otherwise use prop
  const spaceID = currentSpaceId || propSpaceID;

  // Check for portal transition on mount
  const [portalTransition, setPortalTransition] = useState(() => {
    const transition = getTransition();
    // Only use transition if it matches the current space we're loading
    return (transition && transition.toSpaceId === spaceID) ? transition : null;
  });

  const isPortalTransition = !!portalTransition;

  // Callback to clear transition when load completes
  const handleTransitionComplete = useCallback(() => {
    clearTransition();
    setPortalTransition(null);
  }, []);

  // Setup Unity configuration
  const [unityConfig, setUnityConfig] = useState({
    spaceID: spaceID,
    loaderUrl: '',
    dataUrl: '',
    frameworkUrl: '',
    codeUrl: '',
  });

  // Setup Space Configuration
  const [spaceSettings, setSpaceSettings] = useState({
    urlDisruptiveLogo: 'gs://disruptive-metaverse.appspot.com/common/images/Disruptive-logo-white-p-500.png',
    urlLoadingBackground: '',
    videoBackgroundUrl: '',
    showDisruptiveLogo: null,
    showAuthButton: null,
    showHelpButton: null,
    enableVoiceChat: true,
    spaceID: spaceID,
  })

  // Get Space details from Firestore.
  useEffect(() => {
    if (userLoading) {
      return;
    }

    const fetchData = async () => {
      const localDevBuilds: any = {
        'spacessdk': {
          loaderUrl: '/devBuilds/spacessdk/Build/SpacesMetaverse_SDK.loader.js',
          dataUrl: '/devBuilds/spacessdk/Build/SpacesMetaverse_SDK.data',
          frameworkUrl: '/devBuilds/spacessdk/Build/SpacesMetaverse_SDK.framework.js',
          codeUrl: '/devBuilds/spacessdk/Build/SpacesMetaverse_SDK.wasm',
          allowGuestUsers: true,
          showAuthButton: true,
          showDisruptiveLogo: false,
          showHelpButton: true,
          enableVoiceChat: true,
        }
      };

      if (localDevBuilds[spaceID] && ((import.meta as any).env.DEV || window.location.hostname === 'localhost')) {
        Logger.log(`WebGLLoader: Using LOCAL dev build for ${spaceID}`);
        const itemData = localDevBuilds[spaceID];

        setUnityConfig(prevConfig => ({
          ...prevConfig,
          spaceID: spaceID,
          loaderUrl: itemData.loaderUrl,
          dataUrl: itemData.dataUrl,
          frameworkUrl: itemData.frameworkUrl,
          codeUrl: itemData.codeUrl,
        }));

        setSpaceSettings(prevSettings => ({
          ...prevSettings,
          showAuthButton: itemData.showAuthButton,
          showDisruptiveLogo: itemData.showDisruptiveLogo,
          showHelpButton: itemData.showHelpButton,
          enableVoiceChat: itemData.enableVoiceChat,
          spaceID: spaceID,
          ...(overrideSettings || {})
        }));

        setRequiresAuth(false);
        setIsLoading(false);
        return;
      }

      const delay = user ? 300 : 800;
      await new Promise(resolve => setTimeout(resolve, delay));
      try {
        const itemData = await getSpaceItem(spaceID);

        if (itemData) {
          if (!user && (!itemData.allowGuestUsers || itemData.allowGuestUsers !== true)) {
            setRequiresAuth(true);
            setIsLoading(false);
            return;
          } else if (!user && itemData.allowGuestUsers === true) {
            setRequiresAuth(false);
          } else if (user) {
            setRequiresAuth(false);
          }

          setUnityConfig(prevConfig => ({
            ...prevConfig,
            spaceID: spaceID,
            loaderUrl: itemData.loaderUrl,
            dataUrl: itemData.dataUrl,
            frameworkUrl: itemData.frameworkUrl,
            codeUrl: itemData.codeUrl,
          }));

          const logoHttpUrl = await fetchHttpUrlFromGsUrl(spaceSettings.urlDisruptiveLogo);

          let backgroundUrl = '';
          if (itemData.backgroundUrl) {
            backgroundUrl = itemData.backgroundUrl;
          } else if (itemData.backgroundGsUrl) {
            try {
              backgroundUrl = await fetchHttpUrlFromGsUrl(itemData.backgroundGsUrl);
            } catch (error) {
              Logger.warn("WebGLLoader: Error fetching background from GS URL:", error);
            }
          } else if (itemData.gsUrlLoadingBackground) {
            try {
              backgroundUrl = await fetchHttpUrlFromGsUrl(itemData.gsUrlLoadingBackground);
            } catch (error) {
              Logger.warn("WebGLLoader: Error fetching background from legacy GS URL:", error);
            }
          }

          let videoBackgroundUrl = '';
          if (itemData.videoBackgroundUrl) {
            videoBackgroundUrl = itemData.videoBackgroundUrl;
          }

          setSpaceSettings(prevSettings => ({
            ...prevSettings,
            urlLoadingBackground: backgroundUrl,
            videoBackgroundUrl: videoBackgroundUrl,
            showAuthButton: itemData.showAuthButton !== undefined ? itemData.showAuthButton : true,
            showDisruptiveLogo: itemData.showDisruptiveLogo !== undefined ? itemData.showDisruptiveLogo : true,
            showHelpButton: itemData.showHelpButton !== undefined ? itemData.showHelpButton : true,
            enableVoiceChat: itemData.enableVoiceChat !== undefined ? itemData.enableVoiceChat : true,
            urlDisruptiveLogo: logoHttpUrl,
            spaceID: spaceID,
            ...(overrideSettings || {})
          }));

          if (videoBackgroundUrl) {
            window.dispatchEvent(new CustomEvent('SpaceVideoBackgroundUpdated', {
              detail: { videoBackgroundUrl: videoBackgroundUrl }
            }));
          }

          setIsLoading(false);

        } else {
          Logger.error(`WebGLLoader: No configuration found for spaceID: ${spaceID}`);
        }
      } catch (error) {
        Logger.error("WebGLLoader: Error fetching space data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [spaceID, spaceSettings.urlDisruptiveLogo, overrideSettings, user, userLoading]);

  useEffect(() => {
    const checkBan = async () => {
      if (!userLoading && user && isUserBannedFromSpace) {
        try {
          const isB = await isUserBannedFromSpace(spaceID);
          setBanned(isB);
        } catch (e) {
          Logger.error('WebGLLoader: ban check error', e);
        }
      }
    };
    checkBan();
  }, [userLoading, user, spaceID, isUserBannedFromSpace]);

  useEffect(() => {
    if (!isLoading) {
      Logger.log("WebGLLoader: Unity config from Firebase", unityConfig);
      Logger.log("WebGLLoader: Space settings from Firebase", spaceSettings);
    }
  }, [isLoading]);

  if (userLoading) {
    return <div className="flex justify-center items-center h-full mt-12">Loading user…</div>;
  }

  if (banned) {
    return <div className="flex justify-center items-center h-full mt-12 text-red-500">Access Denied: You have been banned from this space.</div>;
  }

  if (requiresAuth) {
    return (
      <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center bg-black/80 z-[1000]">
        <SignIn
          mode="button"
          label="Sign In Required"
          initialIsOpen={true}
          buttonProps={{
            size: "lg",
            colorScheme: "blue"
          }}
        />
      </div>
    );
  }

  if (!spaceID) {
    return null;
  }

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center h-full mt-12">Getting space data...</div>
      ) : (
        <UnityProvider {...unityConfig}>
          <WebGLRenderer
            ref={fullscreenRef}
            settings={spaceSettings}
            isPortalTransition={isPortalTransition}
            transitionData={portalTransition}
            onTransitionComplete={handleTransitionComplete}
          />
        </UnityProvider>
      )}
    </>
  );
};

WebGLLoader.propTypes = {
  spaceID: PropTypes.string.isRequired,
  overrideSettings: PropTypes.object,
};

export default WebGLLoader;
