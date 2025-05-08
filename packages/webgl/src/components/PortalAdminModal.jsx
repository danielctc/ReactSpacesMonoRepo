import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  List,
  ListItem,
  Spinner,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  VStack,
  useToast
} from '@chakra-ui/react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { savePortal } from '@disruptive-spaces/shared/firebase/portalsFirestore';
import { usePlacePortal } from '../hooks/unityEvents';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const PortalAdminModal = ({ isOpen, onClose, currentSpaceId }) => {
  const [spaces, setSpaces] = useState([]);
  const [isFetchingSpaces, setIsFetchingSpaces] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [isPlacingPortal, setIsPlacingPortal] = useState(false);

  const toast = useToast();
  const { placePortal, directPlacePortal, isUnityLoaded } = usePlacePortal();

  const modalBg = useColorModeValue("rgba(240, 240, 240, 0.95)", "rgba(35, 35, 35, 0.95)");
  const modalColor = useColorModeValue("gray.800", "white");
  const listItemHoverBg = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerBorderColor = useColorModeValue("gray.200", "whiteAlpha.300");

  useEffect(() => {
    if (isOpen) {
      const fetchSpaces = async () => {
        setIsFetchingSpaces(true);
        setFetchError(null);
        setSpaces([]);
        try {
          const spacesCollectionRef = collection(db, 'spaces');
          const querySnapshot = await getDocs(spacesCollectionRef);
          const spacesList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || `Space ID: ${doc.id}`
          }));
          setSpaces(spacesList);
        } catch (err) {
          Logger.error("PortalAdminModal: Error fetching spaces:", err);
          setFetchError("Failed to load spaces. Please check your connection and try again.");
        }
        setIsFetchingSpaces(false);
      };
      fetchSpaces();
    }
  }, [isOpen]);

  const handlePlacePortal = async (targetSpaceId, targetSpaceName) => {
    if (!currentSpaceId) {
      Logger.error("PortalAdminModal: currentSpaceId is not defined. Cannot save portal.");
      toast({
        title: "Error",
        description: "Cannot place portal: Current space ID is missing.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsPlacingPortal(true);
    Logger.log(`PortalAdminModal: Attempting to place portal to ${targetSpaceName} (${targetSpaceId}) in space ${currentSpaceId}`);

    const portalPrefabIdentifier = "PortalObjectPrefab";
    const defaultPosition = { x: 0, y: 1.5, z: 0 };
    const defaultRotation = { x: 0, y: 0, z: 0 };
    const defaultScale = { x: 1, y: 1, z: 1 };
    
    const uniquePortalId = `portal_${currentSpaceId}_${targetSpaceId}_${Date.now()}`;

    const portalDataForFirebase = {
      type: 'portal',
      targetSpaceId: targetSpaceId,
      targetSpaceName: targetSpaceName,
      portalId: uniquePortalId,
      position: defaultPosition,
      rotation: defaultRotation,
      scale: defaultScale,
      prefabName: portalPrefabIdentifier
    };

    try {
      // Save to Firebase first
      const savedSuccessfully = await savePortal(
        currentSpaceId,
        uniquePortalId,
        portalDataForFirebase
      );

      if (!savedSuccessfully) {
        Logger.error(`PortalAdminModal: Failed to save portal data to Firebase for space ${currentSpaceId}.`);
        toast({
          title: "Save Error",
          description: "Failed to save portal data to database.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setIsPlacingPortal(false);
        return;
      }

      Logger.log(`PortalAdminModal: Portal data saved to Firebase for space ${currentSpaceId}.`);

      // Now try to place in Unity
      let unityPlacementSuccess = false;
      try {
        // Use the placePortal hook to place the portal in Unity
        unityPlacementSuccess = placePortal(
          uniquePortalId,
          portalPrefabIdentifier,
          defaultPosition,
          defaultRotation,
          defaultScale
        );

        if (!unityPlacementSuccess) {
          // Try direct method as fallback
          unityPlacementSuccess = directPlacePortal(
            uniquePortalId,
            portalPrefabIdentifier,
            defaultPosition,
            defaultRotation,
            defaultScale
          );
        }

        Logger.log("PortalAdminModal: Portal placement in Unity:", unityPlacementSuccess);

      } catch (unityError) {
        Logger.error("PortalAdminModal: Error placing portal in Unity:", unityError);
        // Don't show error toast here since the portal is already saved
      }

      if (unityPlacementSuccess) {
        toast({
          title: "Portal Placed",
          description: `Portal to ${targetSpaceName} created successfully.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onClose();
      } else {
        // Show a warning that the portal is saved but not visible yet
        toast({
          title: "Portal Saved",
          description: "Portal data saved. It will appear when Unity is ready.",
          status: "info",
          duration: 5000,
          isClosable: true,
        });
        onClose();
      }

    } catch (firebaseError) {
      Logger.error("PortalAdminModal: Error saving portal data to Firebase:", firebaseError);
      toast({
        title: "Firebase Save Error",
        description: "Failed to save portal data to the database.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
    
    setIsPlacingPortal(false);
  };

  const isLoading = isFetchingSpaces || isPlacingPortal;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
      <ModalContent
        bg={modalBg}
        backdropFilter="blur(18px)"
        color={modalColor}
        borderRadius="lg"
        maxHeight="80vh"
        boxShadow="2xl"
      >
        <ModalHeader borderBottom="1px solid" borderColor={headerBorderColor} fontSize="lg" fontWeight="semibold">
          Select a Space to Create Portal To
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6}>
          {isLoading && (
            <VStack justifyContent="center" alignItems="center" height="200px">
              <Spinner size="xl" thickness="4px" speed="0.65s" emptyColor="gray.200" color="blue.500" />
              <Text mt={3}>Loading Spaces...</Text>
            </VStack>
          )}
          {fetchError && (
            <Alert status="error" borderRadius="md" variant="subtle">
              <AlertIcon />
              {fetchError}
            </Alert>
          )}
          {!isFetchingSpaces && !fetchError && spaces.length === 0 && (
            <Text textAlign="center" py={10}>No spaces found or you may not have permission to view them.</Text>
          )}
          {!isFetchingSpaces && !fetchError && spaces.length > 0 && (
            <List spacing={3}>
              {spaces.map(space => (
                <ListItem
                  key={space.id}
                  p={3}
                  borderRadius="md"
                  _hover={{ 
                    bg: listItemHoverBg, 
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transform: isLoading ? 'none' : 'scale(1.02)' 
                  }}
                  transition="background-color 0.2s ease-in-out, transform 0.2s ease-in-out"
                  onClick={() => !isLoading && handlePlacePortal(space.id, space.name)}
                  borderWidth="1px"
                  borderColor="transparent"
                  _focus={{ boxShadow: "outline" }}
                  opacity={isLoading ? 0.7 : 1}
                  pointerEvents={isLoading ? 'none' : 'auto'}
                >
                  {space.name}
                </ListItem>
              ))}
            </List>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PortalAdminModal;
