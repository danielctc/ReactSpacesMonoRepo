// @jsxImportSource react
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import { UnityProvider } from "./providers/UnityProvider";

import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { fetchHttpUrlFromGsUrl } from '@disruptive-spaces/shared/firebase/firebaseStorage';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

import WebGLRenderer from "./WebGLRenderer";

// Define a fallback MultipleView class if it doesn't exist
// This ensures there's always a MultipleView available
if (typeof window !== 'undefined' && !window.MultipleView) {
    console.log("Defining fallback MultipleView class - scripts may not be loaded yet");
    window.MultipleView = class MultipleView {
        constructor() {
            console.log("HISPlayer: Fallback MultipleView constructor called");
            this.multiView = { 
                getPlayer: () => {
                    console.log("HISPlayer: getPlayer called from fallback");
                    return {
                        isPlaying: false,
                        play: () => {
                            console.log("HISPlayer: play called");
                            return true;
                        },
                        pause: () => {
                            console.log("HISPlayer: pause called");
                            return true;
                        },
                        mute: (state) => {
                            console.log("HISPlayer: mute called with state:", state);
                            return true;
                        },
                        isMuted: false,
                        seek: (time) => {
                            console.log("HISPlayer: seek called with time:", time);
                            return true;
                        },
                        setVolume: (volume) => {
                            console.log("HISPlayer: setVolume called with volume:", volume);
                            return true;
                        },
                        getVolume: () => {
                            console.log("HISPlayer: getVolume called");
                            return 1.0;
                        },
                        getCurrentTime: () => {
                            console.log("HISPlayer: getCurrentTime called");
                            return 0;
                        },
                        getDuration: () => {
                            console.log("HISPlayer: getDuration called");
                            return 100;
                        }
                    };
                },
                initialize: () => {
                    console.log("HISPlayer: initialize called");
                    return true;
                },
                setUnityContext: (contextId) => {
                    console.log("HISPlayer: setUnityContext called with:", contextId);
                    window.hisPlayerContextId = contextId;
                    return true;
                },
                release: () => {
                    console.log("HISPlayer: release called");
                    return true;
                },
                setProperties: (props) => {
                    console.log("HISPlayer: setProperties called with:", props);
                    return true;
                },
                setMultiPaths: (paths) => {
                    console.log("HISPlayer: setMultiPaths called with:", paths);
                    window._hisplayer_paths = paths;
                    return true;
                }
            };
        }
    };
}

// Note: HISPlayer scripts are now loaded in the HTML head before this component loads
// No need to import them directly here anymore

// Initialize HISPlayer functions if not already defined
if (typeof window !== 'undefined' && !window._hisPlayerInitialized) {
    Logger.log("WebGLLoader: Initializing HISPlayer functions");
    
    // Mark as initialized to avoid duplicate initialization
    window._hisPlayerInitialized = true;
    
    // Initialize event and error queues if not already defined
    window._hisplayer_event_queue = window._hisplayer_event_queue || [];
    window._hisplayer_error_queue = window._hisplayer_error_queue || [];
    
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
    window.isErrorQueueEmpty = window.isErrorQueueEmpty || function() {
        return window._hisplayer_error_queue.length === 0;
    };
    
    window.getNextError = window.getNextError || function() {
        return window._hisplayer_error_queue.length > 0 ? 
            window._hisplayer_error_queue.shift() : "";
    };
    
    window.isEventQueueEmpty = window.isEventQueueEmpty || function() {
        return window._hisplayer_event_queue.length === 0;
    };
    
    window.getNextEvent = window.getNextEvent || function() {
        return window._hisplayer_event_queue.length > 0 ? 
            window._hisplayer_event_queue.shift() : "";
    };
    
    // Define setUpContext function if it doesn't exist yet
    window.setUpContext = window.setUpContext || function(contextId) {
        console.log("HISPlayer: setUpContext called with contextId:", contextId);
        window.hisPlayerContextId = contextId;
        
        // Try to create a player instance
        try {
            if (window.MultipleView) {
                console.log("HISPlayer: Creating MultipleView instance");
                const player = new window.MultipleView();
                
                if (player && player.multiView && typeof player.multiView.setUnityContext === 'function') {
                    player.multiView.setUnityContext(contextId);
                    window._hisplayer_instance = player;
                    console.log("HISPlayer: Successfully set Unity context ID");
                    return true;
                } else {
                    console.error("HISPlayer: Player initialization failed - missing expected methods");
                }
            } else {
                console.error("HISPlayer: MultipleView class not found");
                
                // Define MultipleView if it's still not found
                window.MultipleView = class MultipleView {
                    constructor() {
                        console.log("HISPlayer: Backup MultipleView constructor called");
                        this.multiView = { 
                            getPlayer: () => {
                                console.log("HISPlayer: getPlayer called from backup");
                                return {
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
                                };
                            },
                            initialize: () => true,
                            setUnityContext: (ctxId) => {
                                window.hisPlayerContextId = ctxId;
                                return true;
                            },
                            release: () => true,
                            setProperties: () => true,
                            setMultiPaths: () => true
                        };
                    }
                };
                
                // Try again with our backup implementation
                console.log("HISPlayer: Trying again with backup MultipleView");
                const backupPlayer = new window.MultipleView();
                backupPlayer.multiView.setUnityContext(contextId);
                window._hisplayer_instance = backupPlayer;
                return true;
            }
        } catch (e) {
            console.error("HISPlayer: Error in setUpContext:", e);
            
            // Display error in error div
            const errorDiv = document.getElementById('hisplayer-error');
            if (errorDiv) {
                errorDiv.innerHTML = "Error: " + e.message;
            }
        }
        
        return false;
    };
}

const WebGLLoader = ({ spaceID, overrideSettings }) => {

    const fullscreenRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true); // Initial loading state set to true

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
        showDisruptiveLogo: null,
        showAuthButton: null,
        showHelpButton: null,
        enableVoiceChat: true, // Enable voice chat by default
        spaceID: spaceID, // Pass spaceID to WebGLRenderer
    })



    // const [userHasAccess, setUserHasAccess] = useState(false);
    // const { userHasAccessToSpace } = useContext(UserProvider);



    // Get Space details from Firestore.
    useEffect(() => {
        const fetchData = async () => {

            try {
                const itemData = await getSpaceItem(spaceID);

                if (itemData) {

                    // Update unityConfig with relevant fetched data
                    setUnityConfig(prevConfig => ({
                        ...prevConfig,
                        spaceID: spaceID,
                        loaderUrl: itemData.loaderUrl,
                        dataUrl: itemData.dataUrl,
                        frameworkUrl: itemData.frameworkUrl,
                        codeUrl: itemData.codeUrl,
                    }));

                    // Get Disruptive Logo URL
                    const logoHttpUrl = await fetchHttpUrlFromGsUrl(spaceSettings.urlDisruptiveLogo);

                    // Determine background URL - prefer the new backgroundUrl field, fall back to gsUrlLoadingBackground
                    let backgroundUrl = '';
                    if (itemData.backgroundUrl) {
                        backgroundUrl = itemData.backgroundUrl; // Use direct HTTP URL if available
                    } else if (itemData.backgroundGsUrl) {
                        // Convert GS URL to HTTP URL
                        try {
                            backgroundUrl = await fetchHttpUrlFromGsUrl(itemData.backgroundGsUrl);
                        } catch (error) {
                            Logger.warn("WebGLLoader: Error fetching background from GS URL:", error);
                        }
                    } else if (itemData.gsUrlLoadingBackground) {
                        // Legacy: Convert GS URL to HTTP URL
                        try {
                            backgroundUrl = await fetchHttpUrlFromGsUrl(itemData.gsUrlLoadingBackground);
                        } catch (error) {
                            Logger.warn("WebGLLoader: Error fetching background from legacy GS URL:", error);
                        }
                    }

                    // Update settings with relevant fetched data
                    setSpaceSettings(prevSettings => ({
                        ...prevSettings,
                        urlLoadingBackground: backgroundUrl,
                        showAuthButton: itemData.showAuthButton !== undefined ? itemData.showAuthButton : true,
                        showDisruptiveLogo: itemData.showDisruptiveLogo !== undefined ? itemData.showDisruptiveLogo : true,
                        showHelpButton: itemData.showHelpButton !== undefined ? itemData.showHelpButton : true,
                        enableVoiceChat: itemData.enableVoiceChat !== undefined ? itemData.enableVoiceChat : true, // Get from Firebase if available
                        urlDisruptiveLogo: logoHttpUrl,
                        spaceID: spaceID,
                        // Apply any override settings
                        ...(overrideSettings || {})
                    }));

                    setIsLoading(false);

                    // Once we have the space data, check if the user has access to it
                    // if (userHasAccessToSpace) {
                    //     const hasAccess = await userHasAccessToSpace(spaceID);
                    //     setUserHasAccess(hasAccess);
                    // }

                } else {
                    Logger.error(`WebGLLoader: No configuration found for spaceID: ${spaceID}`);
                }
            } catch (error) {
                Logger.error("WebGLLoader: Error fetching space data:", error);
            } finally {
                setIsLoading(false); // Set loading state to false regardless of outcome
            }
        };

        fetchData();
    }, [spaceID, spaceSettings.urlDisruptiveLogo, overrideSettings]);


    // Debug: Log the config state to console
    useEffect(() => {
        if (!isLoading) {
            Logger.log("WebGLLoader: Unity config from Firebase", unityConfig);
            Logger.log("WebGLLoader: Space settings from Firebase", spaceSettings);
        }
    }, [isLoading]);



    // If user doesn't have access to space, show access denied message.
    // if (!userHasAccess) {
    //     return <div>You do not have access to this space.</div>; // Show access denied message if user doesn't have access
    // }


    return (
        <>
            {isLoading ? (
                <div className="flex justify-center items-center h-full mt-12">Getting space data...</div> // Show loading indicator while fetching data
            ) : (
                // Render UnityProvider only after data has been fetched
                <UnityProvider {...unityConfig}>
                    <WebGLRenderer ref={fullscreenRef} settings={spaceSettings} />
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