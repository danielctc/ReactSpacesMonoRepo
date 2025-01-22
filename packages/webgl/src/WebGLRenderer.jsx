import React, { forwardRef, useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Box, Image, PortalManager } from "@chakra-ui/react";
import { Unity } from "react-unity-webgl";
import { useUnity } from "./providers/UnityProvider";
import { useSendUnityEvent, useUnityOnFirstSceneLoaded, useUnityOnRequestUser } from "./hooks/unityEvents";
import { useFadeStyles } from "./hooks/useFadeStyles";
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import TestModalTrigger from "./components/TestModalTrigger";

import LoaderProgress from "./components/Loader/LoaderProgress";
import AuthenticationButton from "./components/AuthenticationButton";
import HelpButton from "./components/HelpButton";
import ProfileButton from "./components/ProfileButton";
import FullScreenButton from "./components/FullScreenButton";
import SendThumbnailUrlToUnity from "./components/EventTests/SendThumbnailUrlToUnity";
// import EditMode from "./components/EditMode"; // Import the EditMode component
import VideoPlayer from "./components/VideoPlayer"; // Import VideoPlayer to play videos
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';

const WebGLRenderer = forwardRef(({ settings }, ref) => {
  const { unityProvider, isLoaded } = useUnity();
  const isFirstSceneLoaded = useUnityOnFirstSceneLoaded();
  const unityOnRequestUser = useUnityOnRequestUser();
  const sendUnityEvent = useSendUnityEvent();
  const fadeStyles = useFadeStyles(isFirstSceneLoaded);
  const { user } = useContext(UserContext);
  const [isUnityReady, setIsUnityReady] = useState(false);
  const [devicePixelRatio, setDevicePixelRatio] = useState(window.devicePixelRatio);

  // State to track if Edit Mode is active
//  const [isEditMode, setIsEditMode] = useState(false);

  const profileImageUrl = user?.rpmURL
    ? user.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")
    : null;

  // Ensure the Unity environment is ready before attempting interactions
  useEffect(() => {
    if (isLoaded || isFirstSceneLoaded) {
      // Wait for 5 seconds before setting Unity ready state
      setTimeout(() => {
        setIsUnityReady(true);
        Logger.log("WebGLRenderer: Unity is ready to receive messages.");
      }, 5000);
    } else {
      Logger.warn("WebGLRenderer: Unity is NOT ready yet.");
    }
  }, [isLoaded, isFirstSceneLoaded]);

  // Handle user data sending to Unity
  useEffect(() => {
    const handleSendUserToUnity = (userData) => {
      Logger.log("WebGLRenderer: Received 'sendUserToUnity' event");
      sendUnityEvent('FirebaseUserFromReact', userData);
    };

    eventBus.subscribe(EventNames.sendUserToUnity, handleSendUserToUnity);
    return () => eventBus.unsubscribe(EventNames.sendUserToUnity, handleSendUserToUnity);
  }, [sendUnityEvent]);

  // Fullscreen context setup for Unity
  const { setFullscreenRef, fullscreenRef } = useFullscreenContext();

  useEffect(() => {
    setFullscreenRef(ref.current);
  }, [ref, setFullscreenRef]);

  // Function to handle edit mode toggle
  const handleEditModeToggle = (editMode) => {
    setIsEditMode(editMode);
    // Optionally send to Unity or other components if necessary
    sendUnityEvent('ToggleEditMode', { editMode });
  };

  return (
    <PortalManager containerRef={fullscreenRef.current ? fullscreenRef : document.body}>
      <div ref={ref} style={{ width: "100%", height: "100%", aspectRatio: "16/9" }}>
        {/* Background for Unity */}
        <Box position="relative" overflow="hidden" width="100%" height="100%"
          bgRepeat="no-repeat" bgSize="cover" bgPosition="center" bgColor="#666666"
          bgImage={settings.urlLoadingBackground ? `url('${settings.urlLoadingBackground}')` : ""}>
          
          {/* Loader for initial loading state */}
          <LoaderProgress />

          {/* Unity display */}
          <Box {...fadeStyles} width="100%" height="100%" position="absolute" zIndex="1">
            <Unity
              unityProvider={unityProvider}
              style={{ width: "100%", height: "100%" }}
              devicePixelRatio={devicePixelRatio}
            />
          </Box>

          {/* Event to send thumbnails */}
          <SendThumbnailUrlToUnity />
        </Box>

        {/* UI elements */}
        <Box {...fadeStyles} position="absolute" zIndex="2" top={4} left={4} display="flex" alignItems="flex-start" gap={3} height="50px">
          {settings.showDisruptiveLogo && <Image src={settings.urlDisruptiveLogo} width="100px" alt="Disruptive Logo" />}
        </Box>

        {/* Profile and authentication buttons */}
        <Box {...fadeStyles} position="absolute" zIndex="2" top={4} right={4} display="flex" alignItems="flex-start" gap={3}>
          {settings.showAuthButton && <AuthenticationButton />}
          <ProfileButton profileImageUrl={profileImageUrl} />
        </Box>

        {/* Bottom right controls */}
        <Box {...fadeStyles} position="absolute" zIndex="2" bottom={4} left={4} display="flex" alignItems="flex-start" gap={3} />
        <Box {...fadeStyles} position="absolute" zIndex="2" bottom={4} right={4} display="flex" alignItems="flex-start" gap={3}>
          {settings.showHelpButton && <HelpButton />}
          <FullScreenButton />
        </Box>

        {/* Video Player for handling play video events */}
        {/* Pass `isEditMode` to ensure it knows whether to play the video */}
        <VideoPlayer/>
{/* Experimental Movement System */}
{/* <VideoPlayer isEditMode={isEditMode} /> */}

{/* Conditionally render EditMode and test modal when Unity is ready */}
{/* {isUnityReady && ( */}
  {/* <> */}
    {/* <EditMode
      gameObjectName="TV2"
      isEditMode={isEditMode}
      onToggleEditMode={handleEditModeToggle}
    /> */}
    {/* <TestModalTrigger gameObjectName="TV2" isEditMode={isEditMode} /> */} {/* Add the test trigger */}
  {/* </> */}
{/* )} */}
      </div>
    </PortalManager>
  );
});

WebGLRenderer.displayName = 'WebGLRenderer';

WebGLRenderer.propTypes = {
  settings: PropTypes.shape({
    urlLoadingBackground: PropTypes.string,
    showAuthButton: PropTypes.bool,
    showDisruptiveLogo: PropTypes.bool,
    urlDisruptiveLogo: PropTypes.string,
    showHelpButton: PropTypes.bool,
  }),
};

export default WebGLRenderer;
