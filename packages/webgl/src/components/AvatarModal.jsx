import React, { useState, useContext, useMemo } from 'react';
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
    Icon,
    useColorModeValue,
    useToast,
    Spinner,
    Badge
} from "@chakra-ui/react";
import { FaPlus } from 'react-icons/fa';
import ReadyPlayerMeModal from './ReadyPlayerMeModal';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { uploadAvatarFromUrl, DEFAULT_AVATARS, getDefaultAvatarForUsername } from '@disruptive-spaces/shared/firebase/firebaseStorage';
import { useSendUnityEvent } from "../hooks/unityEvents/core/useSendUnityEvent";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

function AvatarModal({ isOpen, onClose }) {
    const [showRPM, setShowRPM] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useContext(UserContext);
    const sendUnityEvent = useSendUnityEvent();
    const toast = useToast();

    const handleCreateClick = (e) => {
        e.stopPropagation();
        setShowRPM(true);
    };

    const handleRPMClose = () => {
        setShowRPM(false);
        onClose();
    };

    const handleAvatarSelect = async (avatar) => {
        if (!user?.uid) {
            Logger.error('No authenticated user found to update avatar.');
            toast({
                title: 'Error',
                description: 'You must be signed in to change your avatar.',
                status: 'error',
                duration: 3000,
            });
            return;
        }

        setSelectedAvatar(avatar);
        setIsUploading(true);

        try {
            // Upload GLB to Firebase Storage and get our URL
            const firebaseUrl = await uploadAvatarFromUrl(user.uid, avatar.url);
            Logger.log('Avatar uploaded to Firebase Storage:', firebaseUrl);

            // Send to Unity
            sendUnityEvent("AvatarUrlFromReact", { url: firebaseUrl });

            toast({
                title: 'Avatar Updated',
                description: 'Your avatar has been saved.',
                status: 'success',
                duration: 2000,
            });

            onClose();
        } catch (error) {
            Logger.error('Error uploading avatar:', error);
            toast({
                title: 'Upload Failed',
                description: 'Failed to save avatar. Please try again.',
                status: 'error',
                duration: 3000,
            });
        } finally {
            setIsUploading(false);
        }
    };

    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
    const hoverBg = 'rgba(0, 0, 0, 0.3)';

    // Build avatar options from shared DEFAULT_AVATARS constant
    const avatarOptions = useMemo(() =>
        DEFAULT_AVATARS.map((url, index) => ({
            id: index + 1,
            url,
            name: `Avatar ${index + 1}`
        })),
    []);

    // Get the user's deterministic default avatar based on username
    const userDefaultAvatar = useMemo(() => {
        const username = user?.username || user?.uid || '';
        return getDefaultAvatarForUsername(username);
    }, [user?.username, user?.uid]);

    return (
        <>
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
                                <Text fontSize="sm">Choose from our collection or create your own unique avatar</Text>
                                
                                <SimpleGrid columns={5} spacing={2}>
                                    <Box
                                        position="relative"
                                        cursor="pointer"
                                        borderWidth="2px"
                                        borderStyle="dashed"
                                        borderColor={borderColor}
                                        borderRadius="lg"
                                        overflow="hidden"
                                        onClick={handleCreateClick}
                                        _hover={{ bg: hoverBg }}
                                        transition="all 0.2s"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        aspectRatio="1"
                                    >
                                        <VStack spacing={1}>
                                            <Icon as={FaPlus} boxSize={4} />
                                            <Text fontSize="xs">Create Custom Avatar</Text>
                                        </VStack>
                                    </Box>

                                    {avatarOptions.map((avatar) => {
                                        const isUserDefault = avatar.url === userDefaultAvatar;
                                        return (
                                            <Box
                                                key={avatar.id}
                                                position="relative"
                                                cursor={isUploading ? "not-allowed" : "pointer"}
                                                borderWidth="2px"
                                                borderColor={selectedAvatar?.id === avatar.id ? "blue.400" : isUserDefault ? "green.400" : borderColor}
                                                borderRadius="lg"
                                                overflow="hidden"
                                                onClick={() => !isUploading && handleAvatarSelect(avatar)}
                                                _hover={{ bg: isUploading ? undefined : hoverBg }}
                                                transition="all 0.2s"
                                                aspectRatio="1"
                                                opacity={isUploading && selectedAvatar?.id !== avatar.id ? 0.5 : 1}
                                            >
                                                <Image
                                                    src={avatar.url.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")}
                                                    alt={avatar.name}
                                                    width="100%"
                                                    height="100%"
                                                    objectFit="cover"
                                                />
                                                {isUploading && selectedAvatar?.id === avatar.id && (
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
                                                {isUserDefault && (
                                                    <Badge
                                                        position="absolute"
                                                        top={1}
                                                        right={1}
                                                        colorScheme="green"
                                                        fontSize="2xs"
                                                    >
                                                        Your Default
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
                                                    <Text fontSize="xs">{avatar.name}</Text>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </SimpleGrid>
                            </VStack>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </Portal>

            {showRPM && <ReadyPlayerMeModal open={showRPM} onClose={handleRPMClose} />}
        </>
    );
}

export default AvatarModal; 