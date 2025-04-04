import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  IconButton, 
  Menu,
  MenuButton,
  MenuList,
  VStack,
  Text,
  Box,
  HStack,
  Divider,
  Avatar,
  Portal,
  useToast,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Button,
  Flex,
  Spacer,
  MenuItem,
  MenuDivider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Icon,
  Switch,
  FormControl,
  FormLabel,
  Tooltip,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { FaUsers, FaDesktop, FaEdit, FaCog, FaStar, FaCrown, FaShieldAlt, FaVideo, FaCubes } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import { ScreenShareMenuOption } from '../voice-chat';
import AgoraRTC from 'agora-rtc-sdk-ng';
import SpacesControlsModal from './SpacesControlsModal';
import SpacesSettingsModal from './SpacesSettingsModal';
import SpaceManageModal from './SpaceManageModal';
import ReadyPlayerMeModal from './ReadyPlayerMeModal';
import AuthenticationButton from './AuthenticationButton';

export const CanvasMainMenu = ({ onTogglePlayerList, spaceID }) => {
  const { fullscreenRef } = useFullscreenContext();
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(true); // Default to true to enable screen sharing
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openControlsModal, setOpenControlsModal] = useState(false);
  const [openAvatarModal, setOpenAvatarModal] = useState(false);
  const [openManageSpaceModal, setOpenManageSpaceModal] = useState(false); // New state for Manage Space modal
  const [profileData, setProfileData] = useState(null);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [canEditSpace, setCanEditSpace] = useState(false); // Permission check for Edit Mode
  const [isSpaceHost, setIsSpaceHost] = useState(false); // Permission check for host status
  const [isDisruptiveAdmin, setIsDisruptiveAdmin] = useState(false); // New state for disruptiveAdmin check
  const toast = useToast();
  
  const { user } = useContext(UserContext);
  const userNickname = user?.Nickname || "Unknown";
  const [voiceDisabled, setVoiceDisabled] = useState(false);

  // Fetch Firebase profile data for the avatar and check permissions
  const fetchProfileData = async () => {
    if (user?.uid && spaceID) {
      try {
        const userProfile = await getUserProfileData(user.uid);
        
        // Check if user is an owner or host based on their groups
        let isOwner = false;
        let isHost = false;
        
        if (userProfile.groups) {
          const ownerGroupId = `space_${spaceID}_owners`;
          const hostGroupId = `space_${spaceID}_hosts`;
          
          isOwner = userProfile.groups.includes(ownerGroupId);
          isHost = userProfile.groups.includes(hostGroupId);
        }
        
        // Check if user is a disruptiveAdmin
        const isAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
        setIsDisruptiveAdmin(isAdmin);
        
        // Update state with profile data and permissions
        setProfileData({
          rpmURL: userProfile.rpmURL ? 
            userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") 
            : null
        });
        
        // If user is a disruptiveAdmin, they can edit regardless of other permissions
        setCanEditSpace(isOwner || isAdmin);
        setIsSpaceHost(isHost);
        
        // If user doesn't have permission but edit mode is enabled, disable it
        if (!isOwner && !isAdmin && editModeEnabled) {
          setEditModeEnabled(false);
          // Dispatch event to notify other components
          const editModeEvent = new CustomEvent('editModeChanged', { 
            detail: { enabled: false } 
          });
          window.dispatchEvent(editModeEvent);
          
          toast({
            title: "Edit Mode Disabled",
            description: "You don't have permission to edit this space.",
            status: "warning",
            duration: 5000,
            isClosable: true,
            position: "top",
          });
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setCanEditSpace(false);
        setIsSpaceHost(false);
        setIsDisruptiveAdmin(false);
      }
    } else {
      setCanEditSpace(false);
      setIsSpaceHost(false);
      setIsDisruptiveAdmin(false);
    }
  };

  // Initial fetch and refresh when user or spaceID changes
  useEffect(() => {
    fetchProfileData();
  }, [user?.uid, spaceID, editModeEnabled]);

  // Still listen for player instantiation, but don't block functionality
  useEffect(() => {
    const handlePlayerInstantiated = () => {
      setIsPlayerInstantiated(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Check if voice is disabled for the space
  useEffect(() => {
    const checkVoiceDisabled = async () => {
      try {
        // Try to get voice disabled state from window
        if (window.agoraClient && typeof window.agoraClient.voiceDisabled === 'boolean') {
          setVoiceDisabled(window.agoraClient.voiceDisabled);
        }
      } catch (error) {
        console.error("Error checking if voice is disabled:", error);
      }
    };
    
    checkVoiceDisabled();
    
    // Listen for voice setting changes
    const handleVoiceSettingChanged = (event) => {
      if (event.detail && typeof event.detail.voiceDisabled === 'boolean') {
        console.log("Voice setting changed:", event.detail.voiceDisabled);
        setVoiceDisabled(event.detail.voiceDisabled);
      }
    };
    
    window.addEventListener("SpaceVoiceSettingChanged", handleVoiceSettingChanged);
    
    return () => {
      window.removeEventListener("SpaceVoiceSettingChanged", handleVoiceSettingChanged);
    };
  }, []);

  const handleSettingsToggle = () => setIsSettingsOpen(!isSettingsOpen);
  const handleControlsModalToggle = () => setOpenControlsModal(!openControlsModal);
  const handleManageSpaceToggle = () => {
    setOpenManageSpaceModal(!openManageSpaceModal);
    handleCloseMenu();
  };
  const handleModalClose = () => {
    setOpenAvatarModal(false);
    // Fetch new profile data when modal closes
    fetchProfileData();
  };

  const handleTogglePlayerList = (e) => {
    // Stop event propagation to prevent menu from closing
    e.stopPropagation();
    
    if (typeof onTogglePlayerList === 'function') {
      Logger.log("CanvasMainMenu: Toggling player list");
      onTogglePlayerList();
      // Don't close the menu
    }
  };
  
  const handleCloseMenu = () => {
    setIsOpen(false);
  };

  const handleToggleEditMode = (e) => {
    // Stop event propagation to prevent menu from closing
    e.stopPropagation();
    
    // Check if user has permission to edit (owner or disruptiveAdmin)
    if (!canEditSpace) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit this space. Only space owners can use Edit Mode.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return;
    }
    
    const newEditModeState = !editModeEnabled;
    setEditModeEnabled(newEditModeState);
    
    // Dispatch a custom event that other components can listen for
    const editModeEvent = new CustomEvent('editModeChanged', { 
      detail: { enabled: newEditModeState } 
    });
    window.dispatchEvent(editModeEvent);
    
    // Show toast notification
    toast({
      title: newEditModeState ? "Edit Mode Enabled" : "Edit Mode Disabled",
      description: newEditModeState 
        ? "You can now make changes to the scene." 
        : "Scene editing is now disabled.",
      status: newEditModeState ? "info" : "success",
      duration: 3000,
      isClosable: true,
      position: "top",
    });
  };

  return (
    <>
      <Menu isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <MenuButton
          as={IconButton}
          icon={<HamburgerIcon />}
          aria-label="Main menu"
          variant="ghost"
          color="white"
          bg={isOpen ? "whiteAlpha.400" : "whiteAlpha.200"}
          _hover={{ bg: isOpen ? "whiteAlpha.500" : "whiteAlpha.300" }}
          size="md"
          onClick={() => setIsOpen(!isOpen)}
        />
        <Portal containerRef={fullscreenRef}>
          <MenuList
            bg="rgba(0,0,0,0.4)"
            backdropFilter="blur(10px)"
            border="none"
            boxShadow="lg"
            color="white"
            width="300px"
            p={4}
            borderRadius="xl"
            zIndex={9999}
            transform="none !important"
          >
            <VStack align="stretch" spacing={4}>
              {/* Header */}
              <HStack>
                <Avatar 
                  size="md"
                  src={profileData?.rpmURL}
                  bg="white"
                  name=" "
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
                />
                <VStack align="start" spacing={0}>
                  <HStack>
                    <Text fontWeight="bold">{userNickname}</Text>
                    {/* Show owner icon only if user is an owner and not a disruptiveAdmin */}
                    {canEditSpace && !isDisruptiveAdmin && (
                      <Tooltip 
                        label="Owner" 
                        placement="top" 
                        hasArrow 
                        zIndex={10000}
                        openDelay={300}
                        gutter={8}
                        portalProps={{ containerRef: fullscreenRef }}
                      >
                        <Box display="inline-block">
                          <Icon as={FaCrown} color="green.400" boxSize={3} />
                        </Box>
                      </Tooltip>
                    )}
                    {/* Show host icon only if user is a host and not a disruptiveAdmin */}
                    {!canEditSpace && isSpaceHost && !isDisruptiveAdmin && (
                      <Tooltip 
                        label="Host" 
                        placement="top" 
                        hasArrow 
                        zIndex={10000}
                        openDelay={300}
                        gutter={8}
                        portalProps={{ containerRef: fullscreenRef }}
                      >
                        <Box display="inline-block">
                          <Icon as={FaStar} color="purple.400" boxSize={3} />
                        </Box>
                      </Tooltip>
                    )}
                    {/* Show admin icon only if user is a disruptiveAdmin */}
                    {isDisruptiveAdmin && (
                      <Tooltip 
                        label="Admin" 
                        placement="top" 
                        hasArrow 
                        zIndex={10000}
                        openDelay={300}
                        gutter={8}
                        portalProps={{ containerRef: fullscreenRef }}
                      >
                        <Box display="inline-block">
                          <Icon as={FaShieldAlt} color="blue.400" boxSize={3} />
                        </Box>
                      </Tooltip>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="whiteAlpha.800">Spaces Metaverse</Text>
                </VStack>
              </HStack>

              {/* Rest of the menu content */}
              <HStack spacing={4} justify="center">
                <IconButton
                  icon={<FaUsers />}
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  size="sm"
                  aria-label="People"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={handleTogglePlayerList}
                />
                
                {/* Show edit button if user is an owner or disruptiveAdmin */}
                {canEditSpace && (
                  <IconButton
                    icon={<FaEdit />}
                    variant="ghost"
                    colorScheme={editModeEnabled ? "green" : "whiteAlpha"}
                    size="sm"
                    aria-label="Edit Mode"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    onClick={handleToggleEditMode}
                  />
                )}
                
                {/* Old prefab placer button - now removed as prefab placer opens automatically with edit mode */}
                
                <IconButton
                  icon={<Box w="4" h="4" />}
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  size="sm"
                  aria-label="Action 3"
                  _hover={{ bg: 'whiteAlpha.200' }}
                />
                <IconButton
                  icon={<Box w="4" h="4" />}
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  size="sm"
                  aria-label="Action 4"
                  _hover={{ bg: 'whiteAlpha.200' }}
                />
              </HStack>

              <Divider borderColor="whiteAlpha.300" />

              <VStack align="stretch" spacing={2}>
                {/* Edit Mode Toggle - Show for space owners and disruptiveAdmins */}
                {canEditSpace && (
                  <HStack 
                    p={2} 
                    borderRadius="md" 
                    _hover={{ bg: "whiteAlpha.200" }}
                    onClick={(e) => e.stopPropagation()}
                    justify="space-between"
                  >
                    <Text fontSize="md">Edit Mode</Text>
                    <Switch 
                      id="edit-mode-toggle" 
                      isChecked={editModeEnabled}
                      onChange={handleToggleEditMode}
                      colorScheme="green"
                      sx={{
                        '& .chakra-switch__track': {
                          bg: editModeEnabled ? 'green.500' : 'black'
                        }
                      }}
                    />
                  </HStack>
                )}
                
                {/* Manage Space option - Show for space owners and disruptiveAdmins */}
                {canEditSpace && (
                  <Text 
                    fontSize="md" 
                    cursor="pointer" 
                    _hover={{ bg: "whiteAlpha.200" }} 
                    p={2} 
                    borderRadius="md"
                    onClick={handleManageSpaceToggle}
                  >
                    Manage Space
                  </Text>
                )}
                
                {/* Screen Share option - Only show if voice is not disabled */}
                {user && spaceID && !voiceDisabled && (
                  <ScreenShareMenuOption onClose={handleCloseMenu} />
                )}
                
                <Text 
                  fontSize="md" 
                  cursor="pointer" 
                  _hover={{ bg: "whiteAlpha.200" }} 
                  p={2} 
                  borderRadius="md"
                  onClick={handleSettingsToggle}
                >
                  Settings
                </Text>
                <Text 
                  fontSize="md" 
                  cursor="pointer" 
                  _hover={{ bg: "whiteAlpha.200" }} 
                  p={2} 
                  borderRadius="md"
                  onClick={handleControlsModalToggle}
                >
                  Controls
                </Text>
                <Text 
                  fontSize="md" 
                  cursor="pointer" 
                  _hover={{ bg: "whiteAlpha.200" }} 
                  p={2} 
                  borderRadius="md"
                  onClick={() => window.open('https://support.spacesmetaverse.com/', '_blank')}
                >
                  Support
                </Text>
                <Text fontSize="md" cursor="pointer" _hover={{ bg: "whiteAlpha.200" }} p={2} borderRadius="md" color="red.300">
                  Leave
                </Text>
              </VStack>
            </VStack>
          </MenuList>
        </Portal>
      </Menu>

      {/* Modals */}
      {openControlsModal && <SpacesControlsModal open={openControlsModal} onClose={handleControlsModalToggle} />}
      {isSettingsOpen && <SpacesSettingsModal open={isSettingsOpen} onClose={handleSettingsToggle} />}
      {openAvatarModal && <ReadyPlayerMeModal open={openAvatarModal} onClose={handleModalClose} />}
      
      {/* Manage Space Modal */}
      <SpaceManageModal isOpen={openManageSpaceModal} onClose={handleManageSpaceToggle} />
    </>
  );
};

export default CanvasMainMenu; 