import React, { useState, useEffect, useContext } from 'react';
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
  Portal
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { FaUsers } from 'react-icons/fa';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import SpacesControlsModal from './SpacesControlsModal';
import SpacesSettingsModal from './SpacesSettingsModal';
import ReadyPlayerMeModal from './ReadyPlayerMeModal';

export const CanvasMainMenu = ({ onTogglePlayerList }) => {
  const { fullscreenRef } = useFullscreenContext();
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [openControlsModal, setOpenControlsModal] = useState(false);
  const [openAvatarModal, setOpenAvatarModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  
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

  if (!isPlayerInstantiated) return null;

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
                  icon={<Box w="4" h="4" />}
                  variant="ghost"
                  colorScheme="whiteAlpha"
                  size="sm"
                  aria-label="Action 2"
                  _hover={{ bg: 'whiteAlpha.200' }}
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