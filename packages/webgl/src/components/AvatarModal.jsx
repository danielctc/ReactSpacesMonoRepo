import React, { useState, useContext } from 'react';
import { 
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    VStack,
    Text,
    useDisclosure,
    Portal,
    SimpleGrid,
    Box,
    Image,
    Icon,
    useColorModeValue
} from "@chakra-ui/react";
import { FaPlus } from 'react-icons/fa';
import ReadyPlayerMeModal from './ReadyPlayerMeModal';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { updateRpmUrlInFirestore } from '@disruptive-spaces/shared/firebase/userFirestore';
import { useSendUnityEvent } from "../hooks/unityEvents/core/useSendUnityEvent";

function AvatarModal({ isOpen, onClose }) {
    const [showRPM, setShowRPM] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const { user } = useContext(UserContext);
    const sendUnityEvent = useSendUnityEvent();

    const handleCreateClick = (e) => {
        e.stopPropagation();
        setShowRPM(true);
    };

    const handleRPMClose = () => {
        setShowRPM(false);
        onClose();
    };

    const handleAvatarSelect = async (avatar) => {
        setSelectedAvatar(avatar);
        
        if (user && user.uid) {
            try {
                await updateRpmUrlInFirestore(user.uid, avatar.url);
                sendUnityEvent("AvatarUrlFromReact", { url: avatar.url });
                onClose();
            } catch (error) {
                console.error('Error updating RPM URL:', error);
            }
        } else {
            console.error('No authenticated user found to update rpmURL.');
        }
    };

    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
    const hoverBg = 'rgba(0, 0, 0, 0.3)';

    const avatarOptions = [
        { id: 1, url: "https://models.readyplayer.me/67c8408d38f7924e15a8bd0a.glb", name: "Default Avatar 1" },
        { id: 2, url: "https://models.readyplayer.me/67c8576838e3cf57cc697c15.glb", name: "Default Avatar 2" },
        { id: 3, url: "https://models.readyplayer.me/67c884144c4878c55e515ff5.glb", name: "Default Avatar 3" },
        { id: 4, url: "https://models.readyplayer.me/67c885af25f4d62e75c0ff1e.glb", name: "Default Avatar 4" },
        { id: 5, url: "https://models.readyplayer.me/67c8860f4c4878c55e5189b6.glb", name: "Default Avatar 5" },
        { id: 6, url: "https://models.readyplayer.me/67c8869db6d0b438b7abd822.glb", name: "Default Avatar 6" },
        { id: 7, url: "https://models.readyplayer.me/67c886ed28ee0e0bfac89688.glb", name: "Default Avatar 7" },
        { id: 8, url: "https://models.readyplayer.me/67c88731795ea3e2e6ea84db.glb", name: "Default Avatar 8" },
        { id: 9, url: "https://models.readyplayer.me/67c8878b0cdc0f22383f0f8f.glb", name: "Default Avatar 9" },
    ];

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
                    <ModalOverlay bg="rgba(0, 0, 0, 0.7)" />
                    <ModalContent bg="gray.800" color="white" maxW="900px">
                        <ModalHeader fontSize="lg">Customise Your Avatar</ModalHeader>
                        <ModalCloseButton 
                            color="white"
                            _hover={{ bg: 'transparent', color: 'whiteAlpha.800' }}
                            _focus={{ boxShadow: 'none' }}
                            size="lg"
                            position="absolute"
                            right={2}
                            top={2}
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

                                    {avatarOptions.map((avatar) => (
                                        <Box
                                            key={avatar.id}
                                            position="relative"
                                            cursor="pointer"
                                            borderWidth="2px"
                                            borderColor={selectedAvatar?.id === avatar.id ? "blue.400" : borderColor}
                                            borderRadius="lg"
                                            overflow="hidden"
                                            onClick={() => handleAvatarSelect(avatar)}
                                            _hover={{ bg: hoverBg }}
                                            transition="all 0.2s"
                                            aspectRatio="1"
                                        >
                                            <Image
                                                src={avatar.url.replace(".glb", ".png?scene=fullbody-portrait-closeupfront&w=640&q=75")}
                                                alt={avatar.name}
                                                width="100%"
                                                height="100%"
                                                objectFit="cover"
                                            />
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
                                    ))}
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