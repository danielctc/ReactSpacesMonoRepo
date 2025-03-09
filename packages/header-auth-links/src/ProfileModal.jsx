import { 
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Avatar,
    Text,
    Flex,
    Input,
    Button,
    VStack,
    FormControl,
    FormLabel,
    useToast
} from "@chakra-ui/react";
import { useState, useContext, useEffect, useRef } from "react";
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import useKeyboardFocus from "@disruptive-spaces/shared/hooks/useKeyboardFocus";

const ProfileModal = ({ isOpen, onClose, user, profileImageUrl }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        Nickname: user?.Nickname || "",
        companyName: user?.companyName || "",
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        linkedInProfile: user?.linkedInProfile || ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useKeyboardFocus();
    const toast = useToast();
    const { sendUserToUnity } = useContext(UserContext);
    const inputRef = useRef(null);

    // Update local state when user prop changes
    useEffect(() => {
        setFormData({
            Nickname: user?.Nickname || "",
            companyName: user?.companyName || "",
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            linkedInProfile: user?.linkedInProfile || ""
        });
    }, [user]);

    // Handle focus when editing mode changes
    useEffect(() => {
        if (isEditing && inputRef.current) {
            const focusInput = () => {
                inputRef.current.focus();
                setIsFocused(true);
                const unityCanvas = document.querySelector('#unity-canvas');
                if (unityCanvas) {
                    unityCanvas.blur();
                }
            };

            focusInput();
            const timer1 = setTimeout(focusInput, 100);
            const timer2 = setTimeout(focusInput, 300);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        } else {
            setIsFocused(false);
        }
    }, [isEditing, setIsFocused]);

    const handleClose = () => {
        setIsEditing(false);
        setIsFocused(false);
        onClose();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        if (formData.Nickname.trim() === "") {
            toast({
                title: "Error",
                description: "Nickname cannot be empty",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            
            const unsubscribe = onSnapshot(userRef, (doc) => {
                if (doc.exists() && doc.data().Nickname === formData.Nickname) {
                    sendUserToUnity();
                    unsubscribe();
                }
            });

            await updateDoc(userRef, { 
                ...formData,
                lastUpdated: new Date().toISOString()
            });

            // Update the user context with the new data
            await updateUser();

            // Update local state with the new data
            setFormData({
                Nickname: formData.Nickname,
                companyName: formData.companyName,
                firstName: formData.firstName,
                lastName: formData.lastName,
                linkedInProfile: formData.linkedInProfile
            });

            toast({
                title: "Success",
                description: "Profile updated successfully",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            setIsEditing(false);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update profile",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            console.error("Error updating profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderViewMode = () => (
        <VStack spacing={4} align="stretch" w="100%">
            <Flex direction="column" align="center" gap={2}>
                <Text fontSize="2xl" fontWeight="bold">
                    {user.Nickname}
                </Text>
            </Flex>
            
            <VStack spacing={3} align="stretch" bg="gray.700" p={4} borderRadius="md">
                <Flex direction="column">
                    <Text color="gray.400" fontSize="sm">Company</Text>
                    <Text>{user.companyName || "Not specified"}</Text>
                </Flex>
                <Flex direction="column">
                    <Text color="gray.400" fontSize="sm">Full Name</Text>
                    <Text>{`${user.firstName || ""} ${user.lastName || ""}`.trim() || "Not specified"}</Text>
                </Flex>
                <Flex direction="column">
                    <Text color="gray.400" fontSize="sm">LinkedIn</Text>
                    <Text>{user.linkedInProfile || "Not specified"}</Text>
                </Flex>
            </VStack>

            <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
                _hover={{ bg: "gray.700" }}
                color="white"
                borderColor="gray.600"
            >
                Edit Profile
            </Button>
        </VStack>
    );

    const renderEditMode = () => (
        <VStack spacing={4} align="stretch" w="100%">
            <FormControl>
                <FormLabel color="gray.400" fontSize="sm">Nickname</FormLabel>
                <Input
                    ref={inputRef}
                    name="Nickname"
                    value={formData.Nickname}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setIsFocused(true);
                        const unityCanvas = document.querySelector('#unity-canvas');
                        if (unityCanvas) unityCanvas.blur();
                    }}
                    placeholder="Enter nickname"
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    _hover={{ bg: 'gray.600' }}
                    _focus={{
                        bg: 'gray.600',
                        boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                    }}
                />
            </FormControl>

            <FormControl>
                <FormLabel color="gray.400" fontSize="sm">Company Name</FormLabel>
                <Input
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    _hover={{ bg: 'gray.600' }}
                    _focus={{
                        bg: 'gray.600',
                        boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                    }}
                />
            </FormControl>

            <Flex gap={4}>
                <FormControl>
                    <FormLabel color="gray.400" fontSize="sm">First Name</FormLabel>
                    <Input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        bg="gray.700"
                        border="none"
                        color="white"
                        _placeholder={{ color: 'gray.500' }}
                        _hover={{ bg: 'gray.600' }}
                        _focus={{
                            bg: 'gray.600',
                            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                        }}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel color="gray.400" fontSize="sm">Last Name</FormLabel>
                    <Input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        bg="gray.700"
                        border="none"
                        color="white"
                        _placeholder={{ color: 'gray.500' }}
                        _hover={{ bg: 'gray.600' }}
                        _focus={{
                            bg: 'gray.600',
                            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                        }}
                    />
                </FormControl>
            </Flex>

            <FormControl>
                <FormLabel color="gray.400" fontSize="sm">LinkedIn Profile</FormLabel>
                <Input
                    name="linkedInProfile"
                    value={formData.linkedInProfile}
                    onChange={handleInputChange}
                    placeholder="Enter LinkedIn profile URL"
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    _hover={{ bg: 'gray.600' }}
                    _focus={{
                        bg: 'gray.600',
                        boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                    }}
                />
            </FormControl>

            <Flex gap={2} justify="flex-end" mt={2}>
                <Button
                    onClick={() => {
                        setFormData({
                            Nickname: user?.Nickname || "",
                            companyName: user?.companyName || "",
                            firstName: user?.firstName || "",
                            lastName: user?.lastName || "",
                            linkedInProfile: user?.linkedInProfile || ""
                        });
                        setIsEditing(false);
                    }}
                    variant="outline"
                    size="sm"
                    isDisabled={isLoading}
                    color="white"
                    borderColor="gray.600"
                    _hover={{ bg: "gray.700" }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    colorScheme="blue"
                    size="sm"
                    isLoading={isLoading}
                >
                    Save Changes
                </Button>
            </Flex>
        </VStack>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            isCentered
            closeOnOverlayClick={!isEditing}
            trapFocus={true}
            blockScrollOnMount={false}
            size="md"
        >
            <ModalOverlay backdropFilter="blur(10px)" />
            <ModalContent bg="gray.800" color="white">
                <ModalHeader>Profile</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={6}>
                        <Avatar
                            src={profileImageUrl}
                            size="2xl"
                            borderRadius="full"
                        />
                        {isEditing ? renderEditMode() : renderViewMode()}
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default ProfileModal; 