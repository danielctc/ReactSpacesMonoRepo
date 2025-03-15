import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import { UnityProvider } from "./providers/UnityProvider";

import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { fetchHttpUrlFromGsUrl } from '@disruptive-spaces/shared/firebase/firebaseStorage';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

import WebGLRenderer from "./WebGLRenderer";


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