import React, { useRef, useEffect, useContext } from 'react';
import { Box, Portal } from "@chakra-ui/react";
import { useSendUnityEvent } from "../hooks/unityEvents/core/useSendUnityEvent";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider"; // Import UserContext to get user ID
import { updateRpmUrlInFirestore } from '../../../../packages/shared/firebase/userFirestore'; // Import the Firestore update function

function ReadyPlayerMeModal({ open, onClose }) {
  const iframeRef = useRef(null);
  const sendUnityEvent = useSendUnityEvent();
  const { user } = useContext(UserContext); // Get the current user from context

  const handleClickOutside = (event) => {
    if (iframeRef.current && !iframeRef.current.contains(event.target)) {
      onClose();
    }
  };

  // Function to handle incoming messages from the iframe
  const handleMessage = async (event) => {
    const json = parse(event);

    if (json?.source !== 'readyplayerme') {
      return;
    }

    // Subscribe to all events sent from Ready Player Me once frame is ready
    if (json.eventName === 'v1.frame.ready') {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          target: 'readyplayerme',
          type: 'subscribe',
          eventName: 'v1.**'
        }),
        '*'
      );
    }

    // Get avatar GLB URL and send it to Unity
    if (json.eventName === 'v1.avatar.exported') {
      const avatarUrl = json.data.url;
      

      // Use sendUnityEvent to send the avatar URL to Unity
      sendUnityEvent("AvatarUrlFromReact", { url: avatarUrl });

      // Update the rpmURL field in Firestore for the current user
      if (user && user.uid) {
        try {
          await updateRpmUrlInFirestore(user.uid, avatarUrl);
          onClose(); // Close the modal after successful update
        } catch (error) {
          console.error('Error updating RPM URL:', error);
        }
      } else {
        console.error('No authenticated user found to update rpmURL.');
      }
    }
  };

  // Parse event data safely
  const parse = (event) => {
    try {
      return JSON.parse(event.data);
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    // Add event listener to detect clicks outside of the iframe and messages from iframe
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('message', handleMessage);
    }

    // Cleanup event listener on component unmount or when modal is closed
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('message', handleMessage);
    };
  }, [open]);

  return (
    open && (
      <Portal>
        <Box 
          position="fixed" 
          top="0" 
          left="0" 
          width="100%" 
          height="100%" 
          bg="rgba(0, 0, 0, 0.8)" 
          zIndex={10000}
          display="flex"
          justifyContent="center"
          alignItems="center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Wrapper for centered content */}
          <Box position="relative" maxWidth="1080px" maxHeight="800px" width="90%" height="90%">
            <iframe
              ref={iframeRef}
              src="https://spacesmetaverse.readyplayer.me/avatar?frameApi"
              title="Ready Player Me"
              width="100%"
              height="100%"
              style={{ border: "none", borderRadius: "8px" }}
              allow="camera *; microphone *; clipboard-write"
            />
          </Box>
        </Box>
      </Portal>
    )
  );
}

export default ReadyPlayerMeModal;
