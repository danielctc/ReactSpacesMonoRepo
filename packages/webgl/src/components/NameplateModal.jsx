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
  IconButton,
  Divider,
  Spinner,
  Center,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { FaLinkedin, FaGlobe } from 'react-icons/fa';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

function NameplateModal({ isOpen, onClose, playerName, playerId, uid }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          setProfileData({
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            linkedinUrl: userProfile.linkedinUrl,
            websiteUrl: userProfile.websiteUrl,
            rpmURL: userProfile.rpmURL ? 
              userProfile.rpmURL.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75") 
              : null
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent bg="gray.900" color="white" borderRadius="xl">
        <ModalHeader>Player Info</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
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
            <VStack spacing={4} align="center">
              <Avatar 
                size="2xl" 
                src={profileData?.rpmURL}
                bg="whiteAlpha.300"
                name={playerName}
                borderWidth="2px"
                borderColor="whiteAlpha.300"
              />
              
              <VStack spacing={1}>
                <Text fontSize="2xl" fontWeight="bold">
                  {playerName}
                </Text>
                
                {profileData?.firstName && (
                  <Text fontSize="md" color="gray.400">
                    {profileData.firstName} {profileData.lastName}
                  </Text>
                )}
                
                <Text fontSize="xs" color="gray.500" mt={1}>
                  ID: {playerId}
                </Text>
              </VStack>
              
              {(profileData?.linkedinUrl || profileData?.websiteUrl) && (
                <>
                  <Divider borderColor="whiteAlpha.300" />
                  
                  <HStack spacing={4} pt={2}>
                    {profileData?.linkedinUrl && (
                      <Link href={profileData.linkedinUrl} isExternal>
                        <IconButton
                          icon={<FaLinkedin />}
                          variant="ghost"
                          colorScheme="linkedin"
                          size="lg"
                          aria-label="LinkedIn profile"
                          _hover={{ bg: 'whiteAlpha.200' }}
                        />
                      </Link>
                    )}
                    
                    {profileData?.websiteUrl && (
                      <Link href={profileData.websiteUrl} isExternal>
                        <IconButton
                          icon={<FaGlobe />}
                          variant="ghost"
                          colorScheme="blue"
                          size="lg"
                          aria-label="Personal website"
                          _hover={{ bg: 'whiteAlpha.200' }}
                        />
                      </Link>
                    )}
                  </HStack>
                </>
              )}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default NameplateModal; 