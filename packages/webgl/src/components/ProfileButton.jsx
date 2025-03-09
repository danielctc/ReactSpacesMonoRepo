import React, { useState, useContext, useEffect } from "react";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { Box, Avatar, Text, Tooltip } from "@chakra-ui/react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import AvatarModal from './AvatarModal';

function ProfileButton() {
  const { fullscreenRef } = useFullscreenContext();
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const { user } = useContext(UserContext);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const getInitials = (firstName, lastName) => {
    if (!firstName || !lastName) return "?";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const fetchProfileData = async () => {
    if (user?.uid) {
      setIsLoading(true);
      try {
        const userProfile = await getUserProfileData(user.uid);
        setProfileData({
          rpmURL: userProfile.rpmURL ? 
            userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") 
            : null,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName
        });
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
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

  const handleModalToggle = () => setOpenModal(!openModal);

  const handleModalClose = () => {
    setOpenModal(false);
    // Fetch new profile data when modal closes
    fetchProfileData();
  };

  if (!isPlayerInstantiated) return null;

  return (
    <>
      <Tooltip
        label="Edit Avatar"
        hasArrow
        placement="top"
        closeOnClick
        isOpen={tooltipVisible}
        portalProps={{ containerRef: fullscreenRef }}
      >
        <Box
          position="relative"
          onMouseEnter={() => {
            setIsAvatarHovered(true);
            setTooltipVisible(true);
          }}
          onMouseLeave={() => {
            setIsAvatarHovered(false);
            setTooltipVisible(false);
          }}
          cursor="pointer"
          onClick={handleModalToggle}
        >
          <Avatar 
            src={!isLoading ? profileData?.rpmURL : undefined}
            size="md"
            borderRadius="full"
            bg="white"
            name={isLoading ? getInitials(profileData?.firstName, profileData?.lastName) : " "}
            borderWidth="1px"
            borderColor="whiteAlpha.300"
          />
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
              bg="rgba(0, 0, 0, 0.4)"
              borderRadius="full"
            >
              <Text fontSize="xs" fontWeight="bold" color="white">Edit</Text>
            </Box>
          )}
        </Box>
      </Tooltip>

      <AvatarModal isOpen={openModal} onClose={handleModalClose} />
    </>
  );
}

export default ProfileButton;