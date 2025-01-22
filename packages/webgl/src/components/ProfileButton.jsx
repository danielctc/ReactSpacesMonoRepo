import React, { useState, useContext, useEffect } from "react";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { 
  IconButton, Tooltip, Menu, MenuButton, MenuList, MenuItem, 
  Box, Avatar, Text, Divider 
} from "@chakra-ui/react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import ReadyPlayerMeModal from './ReadyPlayerMeModal';
import SpacesControlsModal from './SpacesControlsModal';
import SpacesSettingsModal from './SpacesSettingsModal';

function ProfileButton({ profileImageUrl }) {
  const { fullscreenRef } = useFullscreenContext();
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [openControlsModal, setOpenControlsModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Retrieve user data from UserContext
  const { user } = useContext(UserContext);
  const userNickname = user?.Nickname || "Unknown";

  useEffect(() => {
    const handlePlayerInstantiated = () => {
      setIsPlayerInstantiated(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Toggle ReadyPlayerMe modal visibility
  const handleModalToggle = () => setOpenModal(!openModal);

  // Toggle Controls modal visibility
  const handleControlsModalToggle = () => setOpenControlsModal(!openControlsModal);

  // Toggle settings modal visibility
  const handleSettingsToggle = () => setIsSettingsOpen(!isSettingsOpen);

  // Only render the button if the player is instantiated
  if (!isPlayerInstantiated) return null;

  return (
    <>
      <Tooltip
        label="Profile"
        hasArrow
        placement="top"
        closeOnClick
        isOpen={tooltipVisible} // Only show on hover over the profile button
        portalProps={{ containerRef: fullscreenRef }}
      >
        <div
          onMouseEnter={() => !isSettingsOpen && !openControlsModal && setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
        >
          <Menu
            onOpen={() => setTooltipVisible(false)} // Ensure tooltip is hidden when menu opens
            onClose={() => setTooltipVisible(false)}
          >
            <MenuButton
              as={IconButton}
              aria-label="Profile"
              variant="unstyled"
              borderRadius="full"
              bg="white"
              size="sm"
              width="40px"
              height="40px"
              style={{
                backgroundImage: profileImageUrl ? `url(${profileImageUrl})` : null,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <MenuList p={4} bg="gray.800" color="white" borderColor="gray.700">
              <Box display="flex" alignItems="center" mb={3} position="relative">
                {/* Avatar with hover effect */}
                <Box
                  position="relative"
                  onMouseEnter={() => setIsAvatarHovered(true)}
                  onMouseLeave={() => setIsAvatarHovered(false)}
                  cursor="pointer"
                  onClick={handleModalToggle}
                  mr={3} // Ensure spacing to the right
                >
                  <Avatar 
                    src={profileImageUrl} 
                    size="md"
                    borderRadius="full"
                    bg="white"
                  />
                  {/* Hover effect and "Edit" text */}
                  {isAvatarHovered && (
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      bottom="0"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      bg="rgba(0, 0, 0, 0.6)"
                      borderRadius="full"
                    >
                      <Text fontWeight="bold" color="white">Edit</Text>
                    </Box>
                  )}
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="lg" color="white">
                    {userNickname}
                  </Text>
                </Box>
              </Box>
              <Divider borderColor="gray.600" />
              <MenuItem _hover={{ bg: "gray.700", color: "white" }} _focus={{ bg: "gray.700" }} bg="gray.800">
                View Profile
              </MenuItem>
              <MenuItem 
                _hover={{ bg: "gray.700", color: "white" }} 
                _focus={{ bg: "gray.700" }} 
                bg="gray.800"
                onClick={handleSettingsToggle} // Open settings modal on click
              >
                Settings
              </MenuItem>
              <MenuItem 
                _hover={{ bg: "gray.700", color: "white" }} 
                _focus={{ bg: "gray.700" }} 
                bg="gray.800"
                onClick={handleControlsModalToggle}
              >
                Controls
              </MenuItem>
              <MenuItem _hover={{ bg: "gray.700", color: "white" }} _focus={{ bg: "gray.700" }} bg="gray.800">
                Log Out
              </MenuItem>
            </MenuList>
          </Menu>
        </div>
      </Tooltip>

      {/* ReadyPlayerMe Modal */}
      {openModal && <ReadyPlayerMeModal open={openModal} onClose={handleModalToggle} />}

      {/* Spaces Controls Modal */}
      {openControlsModal && <SpacesControlsModal open={openControlsModal} onClose={handleControlsModalToggle} />}

      {/* Spaces Settings Modal */}
      {isSettingsOpen && <SpacesSettingsModal open={isSettingsOpen} onClose={handleSettingsToggle} />}
    </>
  );
}

export default ProfileButton;