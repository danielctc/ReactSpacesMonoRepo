import React, { useState, useEffect } from 'react';
import { 
  Avatar, 
  Tooltip, 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalCloseButton, 
  ModalBody,
  Box,
  Text,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  useToast,
  useClipboard,
  Flex
} from "@chakra-ui/react";
import { FaCopy, FaCheck, FaWifi } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useHLSStream } from '../hooks/unityEvents';
import { useUnity } from '../providers/UnityProvider';
import { isSpaceOwner } from '@disruptive-spaces/shared/firebase/userPermissions';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userFirestore';
import { useContext } from 'react';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { getSpaceHLSStream } from '@disruptive-spaces/shared/firebase/spacesFirestore';

/**
 * Button component to show livestream info
 */
const LiveStreamButton = ({ 
  size = "md", 
  tooltipPlacement = "top",
  className = 'livestream-button'
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const { savedStreamData, reloadStreamData } = useHLSStream();
  const { spaceID } = useUnity();
  const { user } = useContext(UserContext);
  const toast = useToast();
  
  // Track if user has permission to see the button
  const [hasPermission, setHasPermission] = useState(false);
  
  // Set up clipboard for RTMP URL
  const rtmpUrlClipboard = useClipboard(savedStreamData?.rtmpUrl || "");
  
  // Set up clipboard for Stream Key
  const streamKeyClipboard = useClipboard(savedStreamData?.streamKey || "");
  
  // Force reload stream data when component mounts
  useEffect(() => {
    if (spaceID) {
      // Force reload stream data from Firebase
      Logger.log('LiveStreamButton: Forcing reload of stream data');
      reloadStreamData();
      
      // Also set up listener for stream settings changes
      const handleStreamSettingsChanged = () => {
        Logger.log('LiveStreamButton: Stream settings changed, reloading data');
        reloadStreamData();
      };
      
      window.addEventListener('StreamSettingsChanged', handleStreamSettingsChanged);
      
      return () => {
        window.removeEventListener('StreamSettingsChanged', handleStreamSettingsChanged);
      };
    }
  }, [spaceID, reloadStreamData]);
  
  // Check if user is disruptiveAdmin or space owner
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.uid || !spaceID) {
        setHasPermission(false);
        return;
      }
      
      try {
        // Check if user is a disruptiveAdmin
        const isAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
        
        // Check if user is a space owner
        const isOwner = await isSpaceOwner(user, spaceID);
        
        // Set permission if user is either admin or owner
        setHasPermission(isAdmin || isOwner);
      } catch (error) {
        Logger.error('Error checking user permissions:', error);
        setHasPermission(false);
      }
    };
    
    checkPermissions();
  }, [user?.uid, spaceID]);
  
  // Add effect to log streaming status whenever savedStreamData changes
  useEffect(() => {
    Logger.log('LiveStreamButton: Current streaming data:', { 
      enabled: savedStreamData?.enabled,
      hasRtmpUrl: !!savedStreamData?.rtmpUrl, 
      hasStreamKey: !!savedStreamData?.streamKey,
      hasPermission,
      isPlayerReady
    });
  }, [savedStreamData, hasPermission, isPlayerReady]);
  
  // Listen for player instantiated event
  useEffect(() => {
    const handlePlayerInstantiated = () => {
      Logger.log("LiveStreamButton: Player instantiated, showing button");
      setIsPlayerReady(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);
    
    if (window.isPlayerInstantiated) {
      Logger.log("LiveStreamButton: Player was already instantiated");
      setIsPlayerReady(true);
    }

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);
  
  // Function to handle modal open
  const handleOpenModal = () => {
    // Announce modal opened for keyboard capture
    window.dispatchEvent(new Event('modal-opened'));
    setIsModalOpen(true);
  };
  
  // Function to handle modal close
  const handleCloseModal = () => {
    // Announce modal closed for keyboard capture
    window.dispatchEvent(new Event('modal-closed'));
    setIsModalOpen(false);
  };
  
  // If player is not ready, or user doesn't have permission, or streaming is disabled, don't render the button
  if (!isPlayerReady || !hasPermission || savedStreamData?.enabled !== true) {
    // Add more detailed logging about why the button is not showing
    Logger.log('LiveStreamButton: Not rendering button because:', {
      playerNotReady: !isPlayerReady,
      noPermission: !hasPermission,
      streamingDisabled: savedStreamData?.enabled !== true,
      enabledValue: savedStreamData?.enabled
    });
    return null;
  }
  
  return (
    <>
      <Tooltip 
        label="Live Stream Info" 
        placement={tooltipPlacement}
        hasArrow
      >
        <Avatar
          size={size}
          borderRadius="full"
          bg="black"
          icon={<FaWifi color="white" />}
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          className={className}
          data-testid="livestream-button"
          cursor="pointer"
          onClick={handleOpenModal}
        />
      </Tooltip>
      
      {/* Modal for Live Stream Info */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} isCentered size="md">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent 
          bg="rgba(23, 25, 35, 0.95)" 
          color="white" 
          borderRadius="md"
          boxShadow="0 4px 20px rgba(0, 0, 0, 0.5)"
        >
          <ModalHeader 
            borderBottom="1px solid" 
            borderColor="whiteAlpha.200" 
            py={2} 
            fontSize="md"
            fontWeight="600"
          >
            Live Stream Info
          </ModalHeader>
          <ModalCloseButton 
            size="sm"
            color="whiteAlpha.700"
            _hover={{ color: "white", bg: "whiteAlpha.100" }}
          />
          <ModalBody p={4}>
            {savedStreamData?.rtmpUrl && savedStreamData?.streamKey ? (
              <Box>
                <Text fontSize="sm" mb={4} color="white">Copy these details to your streaming software (OBS, Streamlabs, etc.)</Text>
                
                {/* RTMP URL */}
                <Box mb={4}>
                  <Text fontSize="xs" fontWeight="600" mb={1} color="white">RTMP URL</Text>
                  <Flex>
                    <InputGroup size="sm">
                      <Input
                        value={savedStreamData.rtmpUrl}
                        isReadOnly
                        bg="whiteAlpha.100"
                        borderColor="whiteAlpha.200"
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        pr="2.5rem"
                        color="white"
                      />
                      <InputRightElement>
                        <IconButton
                          aria-label="Copy RTMP URL"
                          icon={rtmpUrlClipboard.hasCopied ? <FaCheck /> : <FaCopy />}
                          size="xs"
                          colorScheme={rtmpUrlClipboard.hasCopied ? "green" : "blue"}
                          onClick={() => {
                            rtmpUrlClipboard.onCopy();
                            toast({
                              title: "RTMP URL copied",
                              status: "success",
                              duration: 2000,
                              isClosable: true,
                              position: "top",
                            });
                          }}
                        />
                      </InputRightElement>
                    </InputGroup>
                  </Flex>
                </Box>
                
                {/* Stream Key */}
                <Box mb={4}>
                  <Text fontSize="xs" fontWeight="600" mb={1} color="white">Stream Key</Text>
                  <Flex>
                    <InputGroup size="sm">
                      <Input
                        value={savedStreamData.streamKey}
                        isReadOnly
                        bg="whiteAlpha.100"
                        borderColor="whiteAlpha.200"
                        _hover={{ borderColor: "whiteAlpha.300" }}
                        pr="2.5rem"
                        type="password"
                        color="white"
                      />
                      <InputRightElement>
                        <IconButton
                          aria-label="Copy Stream Key"
                          icon={streamKeyClipboard.hasCopied ? <FaCheck /> : <FaCopy />}
                          size="xs"
                          colorScheme={streamKeyClipboard.hasCopied ? "green" : "blue"}
                          onClick={() => {
                            streamKeyClipboard.onCopy();
                            toast({
                              title: "Stream Key copied",
                              status: "success",
                              duration: 2000,
                              isClosable: true,
                              position: "top",
                            });
                          }}
                        />
                      </InputRightElement>
                    </InputGroup>
                  </Flex>
                </Box>
                
                <Text fontSize="xs" color="whiteAlpha.800" mt={4}>
                  Stream to this RTMP server using the Stream Key above. View and manage stream settings in the Space Manager.
                </Text>
              </Box>
            ) : (
              <Box textAlign="center" p={4}>
                <Text color="white">No stream configuration found for this space.</Text>
                <Text fontSize="xs" mt={2} color="whiteAlpha.800">
                  Configure streaming in the Space Manager under Stream tab.
                </Text>
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default LiveStreamButton; 