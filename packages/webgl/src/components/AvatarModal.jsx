import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    Text,
    Portal,
    SimpleGrid,
    Box,
    Image,
    useColorModeValue,
    useToast,
    Spinner,
    Badge,
    Skeleton
} from "@chakra-ui/react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { getAllAvatars } from '@disruptive-spaces/shared/firebase/avatarsFirestore';
import { updateUserAvatar } from '@disruptive-spaces/shared/firebase/userFirestore';
import { useSendUnityEvent } from "../hooks/unityEvents/core/useSendUnityEvent";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

function AvatarModal({ isOpen, onClose }) {
    const [avatars, setAvatars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const { user, currentUser } = useContext(UserContext);
    const sendUnityEvent = useSendUnityEvent();
    const toast = useToast();

    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
    const hoverBg = 'rgba(0, 0, 0, 0.3)';

    const fetchAvatars = useCallback(async () => {
        setIsLoading(true);
        try {
            const avatarList = await getAllAvatars();
            setAvatars(avatarList);
            Logger.log('AvatarModal: Fetched avatars:', avatarList.length);
        } catch (error) {
            Logger.error('AvatarModal: Error fetching avatars:', error);
            toast({
                title: 'Error',
                description: 'Failed to load avatars. Please try again.',
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    // Fetch avatars from Firestore when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchAvatars();
        }
    }, [isOpen, fetchAvatars]);

    const handleAvatarSelect = async (avatar) => {
        if (!user?.uid) {
            Logger.error('AvatarModal: No authenticated user found.');
            toast({
                title: 'Error',
                description: 'You must be signed in to change your avatar.',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        setSelectedAvatar(avatar);
        setIsUpdating(true);

        try {
            // Update user document with avatar selection
            await updateUserAvatar(user.uid, avatar.id, avatar.glbUrl, avatar.thumbnailUrl);
            Logger.log('AvatarModal: Avatar updated in Firestore:', avatar.id);

            // Send GLB URL to Unity
            sendUnityEvent("AvatarUrlFromReact", { url: avatar.glbUrl });
            Logger.log('AvatarModal: Sent avatar to Unity:', avatar.glbUrl);

            toast({
                title: 'Avatar Updated',
                description: 'Your avatar has been saved.',
                status: 'success',
                duration: 2000,
            });

            onClose();
        } catch (error) {
            Logger.error('AvatarModal: Error updating avatar:', error);
            toast({
                title: 'Update Failed',
                description: 'Failed to save avatar. Please try again.',
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    // Get current user's avatar ID for highlighting
    const currentAvatarId = currentUser?.avatarId;

    return (
        <Portal>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                isCentered
                size="xl"
                zIndex={9999}
            >
                <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(8px)" />
                <ModalContent bg="#1a1a1a" color="white" borderRadius="xl" border="1px solid #333" maxW="900px">
                    <ModalHeader fontSize="md" fontWeight="600" pb={1} pt={3} px={4} color="white">
                        Customise Your Avatar
                    </ModalHeader>
                    <ModalCloseButton
                        color="white"
                        bg="rgba(255,255,255,0.1)"
                        _hover={{ color: "gray.400", bg: "transparent" }}
                        borderRadius="full"
                        size="sm"
                        top={2}
                        right={3}
                    />
                    <ModalBody pb={4}>
                        <VStack spacing={4} align="stretch">
                            <Text fontSize="sm">Choose from our collection of avatars</Text>

                            {isLoading ? (
                                <SimpleGrid columns={5} spacing={2}>
                                    {Array.from({ length: 10 }, (_, i) => `skeleton-${i}`).map((key) => (
                                        <Skeleton key={key} height="120px" borderRadius="lg" />
                                    ))}
                                </SimpleGrid>
                            ) : avatars.length === 0 ? (
                                <Box textAlign="center" py={8}>
                                    <Text color="gray.400">No avatars available yet.</Text>
                                </Box>
                            ) : (
                                <SimpleGrid columns={5} spacing={2}>
                                    {avatars.map((avatar) => {
                                        const isCurrentAvatar = avatar.id === currentAvatarId;
                                        const isSelected = selectedAvatar?.id === avatar.id;

                                        return (
                                            <Box
                                                key={avatar.id}
                                                position="relative"
                                                cursor={isUpdating ? "not-allowed" : "pointer"}
                                                borderWidth="2px"
                                                borderColor={isSelected ? "blue.400" : isCurrentAvatar ? "green.400" : borderColor}
                                                borderRadius="lg"
                                                overflow="hidden"
                                                onClick={() => !isUpdating && handleAvatarSelect(avatar)}
                                                _hover={{ bg: isUpdating ? undefined : hoverBg }}
                                                transition="all 0.2s"
                                                aspectRatio="1"
                                                opacity={isUpdating && !isSelected ? 0.5 : 1}
                                            >
                                                <Image
                                                    src={avatar.thumbnailUrl}
                                                    alt={avatar.name}
                                                    width="100%"
                                                    height="100%"
                                                    objectFit="cover"
                                                    fallback={<Skeleton height="100%" />}
                                                />
                                                {isUpdating && isSelected && (
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
                                                    >
                                                        <Spinner color="white" size="lg" />
                                                    </Box>
                                                )}
                                                {isCurrentAvatar && (
                                                    <Badge
                                                        position="absolute"
                                                        top={1}
                                                        right={1}
                                                        colorScheme="green"
                                                        fontSize="2xs"
                                                    >
                                                        Current
                                                    </Badge>
                                                )}
                                                <Box
                                                    position="absolute"
                                                    bottom="0"
                                                    left="0"
                                                    right="0"
                                                    p={1}
                                                    bg="rgba(0, 0, 0, 0.7)"
                                                >
                                                    <Text fontSize="xs" noOfLines={1}>{avatar.name}</Text>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </SimpleGrid>
                            )}
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Portal>
    );
}

export default AvatarModal;
