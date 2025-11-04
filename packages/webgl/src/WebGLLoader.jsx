// @jsxImportSource react
import React, { useState, useEffect, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { Box } from "@chakra-ui/react";
import SignIn from '@disruptive-spaces/shared/components/auth/SignIn';

import { UnityProvider } from "./providers/UnityProvider";

import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { fetchHttpUrlFromGsUrl } from '@disruptive-spaces/shared/firebase/firebaseStorage';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

import WebGLRenderer from "./WebGLRenderer";

// Define a fallback MultipleView class if it doesn't exist
// This ensures there's always a MultipleView available
if (typeof window !== 'undefined' && !window.MultipleView) {
    
    window.MultipleView = class MultipleView {
        constructor() {
            
            this.multiView = { 
                getPlayer: () => {
                    
                    return {
                        isPlaying: false,
                        play: () => {
                            
                            return true;
                        },
                        pause: () => {
                            
                            return true;
                        },
                        mute: (state) => {
                            
                            return true;
                        },
                        isMuted: false,
                        seek: (time) => {
                            
                            return true;
                        },
                        setVolume: (volume) => {
                            
                            return true;
                        },
                        getVolume: () => {
                            
                            return 1.0;
                        },
                        getCurrentTime: () => {
                            
                            return 0;
                        },
                        getDuration: () => {
                            
                            return 100;
                        }
                    };
                },
                initialize: () => {
                    
                    return true;
                },
                setUnityContext: (contextId) => {
                    
                    window.hisPlayerContextId = contextId;
                    return true;
                },
                release: () => {
                    
                    return true;
                },
                setProperties: (props) => {
                    
                    return true;
                },
                setMultiPaths: (paths) => {
                    
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
        
        window.hisPlayerContextId = contextId;
        
        // Try to create a player instance
        try {
            if (window.MultipleView) {
                
                const player = new window.MultipleView();
                
                if (player && player.multiView && typeof player.multiView.setUnityContext === 'function') {
                    player.multiView.setUnityContext(contextId);
                    window._hisplayer_instance = player;
                    
                    return true;
                } else {
                    console.error("HISPlayer: Player initialization failed - missing expected methods");
                }
            } else {
                console.error("HISPlayer: MultipleView class not found");
                
                // Define MultipleView if it's still not found
                window.MultipleView = class MultipleView {
                    constructor() {
                        
                        this.multiView = { 
                            getPlayer: () => {
                                
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
                
                const backupPlayer = new window.MultipleView();
                backupPlayer.multiView.setUnityContext(contextId);
                window._hisplayer_instance = backupPlayer;
                return true;
            }
        } catch (e) {
            console.error("HISPlayer: Error in setUpContext:", e);
            
            // Display error in error div (using textContent to prevent XSS)
            const errorDiv = document.getElementById('hisplayer-error');
            if (errorDiv) {
                errorDiv.textContent = "Error: " + e.message;
            }
        }
        
        return false;
    };
}

const WebGLLoader = ({ spaceID, overrideSettings }) => {

    const fullscreenRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true); // Initial loading state set to true
    const { loading: userLoading, isUserBannedFromSpace, user } = useContext(UserContext);
    const [banned, setBanned] = useState(false);
    const [requiresAuth, setRequiresAuth] = useState(false);

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
        videoBackgroundUrl: '', // Add video background URL state
        showDisruptiveLogo: null,
        showAuthButton: null,
        showHelpButton: null,
        enableVoiceChat: true, // Enable voice chat by default
        spaceID: spaceID, // Pass spaceID to WebGLRenderer
    })

    // Get Space details from Firestore.
    // IMPORTANT: Wait for userLoading to complete before fetching space data
    // This ensures Firestore is ready and permissions are initialized
    useEffect(() => {
        // Don't fetch space data until auth check is complete
        if (userLoading) {
            return;
        }

        // Add delay after auth completes to ensure Firestore rules are evaluated
        // This prevents permission-denied errors that appear as "not found"
        const fetchData = async () => {
            // For guest users (unauthenticated), wait longer for Firestore to be ready
            // Firestore needs time to initialize rules for unauthenticated queries
            const delay = user ? 300 : 800; // Longer delay for guests
            await new Promise(resolve => setTimeout(resolve, delay));
            try {
                const itemData = await getSpaceItem(spaceID);

                if (itemData) {
                    
                    
                    

                    // STRICT: Check if authentication is required
                    if (!user && (!itemData.allowGuestUsers || itemData.allowGuestUsers !== true)) {
                        
                        
                        setRequiresAuth(true);
                        setIsLoading(false);
                        return; // Don't load Unity if auth is required
                    } else if (!user && itemData.allowGuestUsers === true) {
                        
                        setRequiresAuth(false);
                    } else if (user) {
                        
                        setRequiresAuth(false);
                    }

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

                    // Get video background URL if available
                    let videoBackgroundUrl = '';
                    if (itemData.videoBackgroundUrl) {
                        videoBackgroundUrl = itemData.videoBackgroundUrl;
                        
                    }

                    // Update settings with relevant fetched data
                    setSpaceSettings(prevSettings => ({
                        ...prevSettings,
                        urlLoadingBackground: backgroundUrl,
                        videoBackgroundUrl: videoBackgroundUrl, // Add video background URL
                        showAuthButton: itemData.showAuthButton !== undefined ? itemData.showAuthButton : true,
                        showDisruptiveLogo: itemData.showDisruptiveLogo !== undefined ? itemData.showDisruptiveLogo : true,
                        showHelpButton: itemData.showHelpButton !== undefined ? itemData.showHelpButton : true,
                        enableVoiceChat: itemData.enableVoiceChat !== undefined ? itemData.enableVoiceChat : true, // Get from Firebase if available
                        urlDisruptiveLogo: logoHttpUrl,
                        spaceID: spaceID,
                        // Apply any override settings
                        ...(overrideSettings || {})
                    }));

                    // Manually dispatch event for video background
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
                setIsLoading(false); // Set loading state to false regardless of outcome
            }
        };

        fetchData();
    }, [spaceID, spaceSettings.urlDisruptiveLogo, overrideSettings, user, userLoading]); // Wait for userLoading to complete

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

    // Debug: Log the config state to console
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
            <Box 
                position="absolute" 
                top="0" 
                left="0" 
                width="100%" 
                height="100%" 
                display="flex" 
                justifyContent="center" 
                alignItems="center"
                backgroundColor="rgba(0, 0, 0, 0.8)"
                zIndex="1000"
            >
                <SignIn 
                    mode="button" 
                    label="Sign In Required" 
                    initialIsOpen={true}
                    buttonProps={{ 
                        size: "lg", 
                        colorScheme: "blue"
                    }} 
                />
            </Box>
        );
    }

    if (!spaceID) {
        return null;
    }

    return (
        <>
            {isLoading ? (
                <div className="flex justify-center items-center h-full mt-12">Getting space data...</div> // Show loading indicator while fetching data
            ) : (
                // Render UnityProvider only after data has been fetched AND authentication is verified
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