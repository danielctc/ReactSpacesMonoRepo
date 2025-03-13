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
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { FaUsers, FaDesktop, FaEdit } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { useVoiceChat, ScreenShareMenuOption } from '../voice-chat';
import AgoraRTC from 'agora-rtc-sdk-ng';
import SpacesControlsModal from './SpacesControlsModal';
import SpacesSettingsModal from './SpacesSettingsModal';
import ReadyPlayerMeModal from './ReadyPlayerMeModal';
import AuthenticationButton from './AuthenticationButton';

export const CanvasMainMenu = ({ onTogglePlayerList, spaceID }) => {
  const { fullscreenRef } = useFullscreenContext();
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(true); // Default to true to enable screen sharing
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openControlsModal, setOpenControlsModal] = useState(false);
  const [openAvatarModal, setOpenAvatarModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const toast = useToast();
  
  const { user } = useContext(UserContext);
  const userNickname = user?.Nickname || "Unknown";

  // Fetch Firebase profile data for the avatar
  const fetchProfileData = async () => {
    if (user?.uid) {
      try {
        const userProfile = await getUserProfileData(user.uid);
        setProfileData({
          rpmURL: userProfile.rpmURL ? 
            userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") 
            : null
        });
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchProfileData();
  }, [user?.uid]);

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

  const handleSettingsToggle = () => setIsSettingsOpen(!isSettingsOpen);
  const handleControlsModalToggle = () => setOpenControlsModal(!openControlsModal);
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
    
    // Log the change
    console.log(`Edit Mode ${newEditModeState ? 'enabled' : 'disabled'}`);
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
                  <Text fontWeight="bold">{userNickname}</Text>
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
                
                <IconButton
                  icon={<FaEdit />}
                  variant="ghost"
                  colorScheme={editModeEnabled ? "green" : "whiteAlpha"}
                  size="sm"
                  aria-label="Edit Mode"
                  _hover={{ bg: 'whiteAlpha.200' }}
                  onClick={handleToggleEditMode}
                />
                
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
                {/* Edit Mode Toggle */}
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
                
                {/* Screen Share as text option */}
                {user && spaceID && (
                  <ScreenShareMenuOption 
                    onClose={handleCloseMenu}
                  />
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
                <Text fontSize="md" cursor="pointer" _hover={{ bg: "whiteAlpha.200" }} p={2} borderRadius="md">
                  Help
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
    </>
  );
};

// Use the imported ScreenShareMenuOption from voice-chat 