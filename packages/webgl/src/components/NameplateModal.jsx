import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Text,
  Box,
  Avatar,
  VStack,
  HStack,
  Link,
  Icon,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  Badge,
} from "@chakra-ui/react";
import { FaLinkedin, FaGlobe, FaStar, FaCrown } from 'react-icons/fa';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

function NameplateModal({ isOpen, onClose, playerName, playerId, uid }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get spaceID from URL or window
  const getSpaceId = () => {
    const pathParts = window.location.pathname.split("/");
    return pathParts[pathParts.length - 1] || window.spaceID || 'default-space-id';
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      
      if (!uid) {
        Logger.warn("NameplateModal: No UID provided for player:", playerName);
        setError("No user ID available for this player");
        setLoading(false);
        return;
      }

      try {
        Logger.log("NameplateModal: Fetching profile for UID:", uid);
        const userProfile = await getUserProfileData(uid);
        
        if (!userProfile) {
          setError("Could not find profile data for this player");
        } else {
          // Determine role (owner/host)
          const spaceID = getSpaceId();
          const ownerGroup = `space_${spaceID}_owners`;
          const hostGroup = `space_${spaceID}_hosts`;
          const role = userProfile.groups?.includes(ownerGroup) 
            ? "owner" 
            : userProfile.groups?.includes(hostGroup) 
            ? "host" 
            : null;

          setProfileData({
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            linkedInProfile: userProfile.linkedInProfile,
            websiteUrl: userProfile.websiteUrl,
            rpmURL: userProfile.rpmURL ? 
              userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") 
              : null,
            role: role
          });
        }
      } catch (error) {
        Logger.error('Error fetching profile data:', error);
        setError("Error loading profile data");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchProfileData();
    }
  }, [uid, isOpen, playerName]);

  // Full role badge component (matching UnityPlayerList style)
  const FullRoleBadge = ({ role }) => {
    if (role === 'owner') {
      return (
        <HStack spacing={1} bg="green.800" px={3} py={1} borderRadius="md">
          <Icon as={FaCrown} color="green.300" />
          <Badge colorScheme="green" variant="solid">Owner</Badge>
        </HStack>
      );
    }
    if (role === 'host') {
      return (
        <HStack spacing={1} bg="purple.800" px={3} py={1} borderRadius="md">
          <Icon as={FaStar} color="purple.300" />
          <Badge colorScheme="purple" variant="solid">Host</Badge>
        </HStack>
      );
    }
    return null;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg="rgba(0,0,0,0.85)" color="white" border="none" borderRadius="xl">
        <ModalCloseButton />
        <ModalBody p={6}>
          {loading ? (
            <Center py={8}>
              <Spinner size="xl" color="blue.400" />
            </Center>
          ) : error ? (
            <Alert status="warning" variant="solid" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : (
            <VStack align="center" spacing={3}>
              <Avatar 
                size="lg" 
                src={profileData?.rpmURL}
                bg="whiteAlpha.400"
                name={playerName}
              />
              <Text fontWeight="bold">{playerName}</Text>
              <FullRoleBadge role={profileData?.role} />
              {profileData?.firstName && (
                <Text fontSize="sm" color="gray.300">
                  {profileData.firstName} {profileData.lastName}
                </Text>
              )}
              <HStack spacing={4} pt={2}>
                {profileData?.linkedInProfile && (
                  <Link href={profileData.linkedInProfile} isExternal>
                    <Icon as={FaLinkedin} boxSize={5} />
                  </Link>
                )}
                {profileData?.websiteUrl && (
                  <Link href={profileData.websiteUrl} isExternal>
                    <Icon as={FaGlobe} boxSize={5} />
                  </Link>
                )}
              </HStack>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default NameplateModal; 