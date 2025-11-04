// @jsxImportSource react
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
    useToast,
    InputGroup,
    InputLeftAddon,
    FormHelperText
} from "@chakra-ui/react";
import { useState, useContext, useEffect, useRef } from "react";
import { doc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { blockUnityKeyboardInput, focusUnity } from "@disruptive-spaces/webgl/src/utils/unityKeyboard";
import { isUsernameTaken, updateUsername } from '@disruptive-spaces/shared/firebase/userFirestore';
import { isUsernameSafe } from '@disruptive-spaces/shared/utils/profanityFilter';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const ProfileModal = ({ isOpen, onClose, user, profileImageUrl }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        Nickname: user?.Nickname || "",
        username: user?.username || "",
        companyName: user?.companyName || "",
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        linkedInProfile: user?.linkedInProfile || ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [checkingUsername, setCheckingUsername] = useState(false);
    const toast = useToast();
    const { sendUserToUnity, updateUser } = useContext(UserContext);
    const inputRef = useRef(null);

    // Update local state when user prop changes
    useEffect(() => {
        setFormData({
            Nickname: user?.Nickname || "",
            username: user?.username || "",
            companyName: user?.companyName || "",
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            linkedInProfile: user?.linkedInProfile || ""
        });
    }, [user]);

    // Block Unity keyboard input when modal is open
    useEffect(() => {
        if (isOpen) {
            
            blockUnityKeyboardInput(true);
            
            // Dispatch modal-opened event for WebGLRenderer to listen for
            window.dispatchEvent(new CustomEvent('modal-opened'));
        } else {
            
            blockUnityKeyboardInput(false).then(() => {
                setTimeout(() => {
                    focusUnity(true);
                }, 100);
            });
            
            // Dispatch modal-closed event for WebGLRenderer to listen for
            window.dispatchEvent(new CustomEvent('modal-closed'));
        }
        
        return () => {
            if (isOpen) {
                
                blockUnityKeyboardInput(false);
                window.dispatchEvent(new CustomEvent('modal-closed'));
            }
        };
    }, [isOpen]);

    // Handle focus when editing mode changes
    useEffect(() => {
        if (isEditing && inputRef.current) {
            const focusInput = () => {
                inputRef.current.focus();
                setIsInputFocused(true);
                blockUnityKeyboardInput(true);
            };

            focusInput();
            const timer1 = setTimeout(focusInput, 100);
            const timer2 = setTimeout(focusInput, 300);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        } else {
            setIsInputFocused(false);
        }
    }, [isEditing]);

    // Check username availability when it changes
    useEffect(() => {
        const checkUsernameAvailability = async () => {
            if (formData.username && formData.username !== user?.username) {
                setCheckingUsername(true);
                setUsernameError("");
                
                try {
                    // Validate username format
                    if (!/^[a-z0-9]{1,15}$/.test(formData.username)) {
                        setUsernameError("Username must be 1-15 characters, lowercase letters and numbers only");
                        setCheckingUsername(false);
                        return;
                    }
                    
                    // Check for profanity in username
                    if (!isUsernameSafe(formData.username)) {
                        setUsernameError("Username contains inappropriate content");
                        setCheckingUsername(false);
                        return;
                    }
                    
                    const isTaken = await isUsernameTaken(formData.username);
                    if (isTaken) {
                        setUsernameError("Username is already taken");
                    }
                } catch (error) {
                    Logger.error("Error checking username:", error);
                    setUsernameError("Error checking username availability");
                } finally {
                    setCheckingUsername(false);
                }
            }
        };
        
        const debounceTimer = setTimeout(checkUsernameAvailability, 500);
        return () => clearTimeout(debounceTimer);
    }, [formData.username, user?.username]);

    const handleClose = () => {
        setIsEditing(false);
        setIsInputFocused(false);
        onClose();
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // For username, convert to lowercase and restrict to alphanumeric
        if (name === "username") {
            const formattedValue = value.toLowerCase().replace(/[^a-z0-9]/g, '');
            setFormData(prev => ({
                ...prev,
                [name]: formattedValue
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSave = async () => {
        if (formData.Nickname.trim() === "") {
            toast({
                title: "Error",
                description: "Display Name cannot be empty",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // Check for profanity in Display Name
        if (!isUsernameSafe(formData.Nickname)) {
            toast({
                title: "Error",
                description: "Display Name contains inappropriate content",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        
        // Check for profanity in first name
        if (formData.firstName && !isUsernameSafe(formData.firstName)) {
            toast({
                title: "Error",
                description: "First name contains inappropriate content",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        
        // Check for profanity in last name
        if (formData.lastName && !isUsernameSafe(formData.lastName)) {
            toast({
                title: "Error",
                description: "Last name contains inappropriate content",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        
        // Check for profanity in company name
        if (formData.companyName && !isUsernameSafe(formData.companyName)) {
            toast({
                title: "Error",
                description: "Company name contains inappropriate content",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (usernameError) {
            toast({
                title: "Error",
                description: usernameError,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsLoading(true);
        
        try {
            // Always check username uniqueness again before updating
            if (formData.username !== user.username) {
                // Check for profanity in username one more time
                if (!isUsernameSafe(formData.username)) {
                    setUsernameError("Username contains inappropriate content");
                    toast({
                        title: "Error",
                        description: "Username contains inappropriate content",
                        status: "error",
                        duration: 3000,
                        isClosable: true,
                    });
                    setIsLoading(false);
                    return;
                }
                
                const isTaken = await isUsernameTaken(formData.username);
                if (isTaken) {
                    setUsernameError("Username is already taken");
                    toast({
                        title: "Error",
                        description: "Username is already taken",
                        status: "error",
                        duration: 3000,
                        isClosable: true,
                    });
                    setIsLoading(false);
                    return;
                }
            }
            
            const userRef = doc(db, "users", user.uid);
            
            // First update username separately using the provided function
            if (formData.username !== user.username) {
                try {
                    Logger.log("ProfileModal: Updating username from", user.username, "to", formData.username);
                    const success = await updateUsername(user.uid, formData.username);
                    if (!success) {
                        throw new Error("Failed to update username");
                    }
                    Logger.log("ProfileModal: Username updated successfully");
                } catch (error) {
                    Logger.error("Error updating username:", error);
                    toast({
                        title: "Error",
                        description: "Failed to update username: " + (error.message || "Please try again"),
                        status: "error",
                        duration: 3000,
                        isClosable: true,
                    });
                    setIsLoading(false);
                    return;
                }
            }
            
            // Then update the rest of the profile
            Logger.log("ProfileModal: Updating user profile");
            
            try {
                // Create a profile update object without the username field (already updated)
                const profileUpdate = { 
                    Nickname: formData.Nickname,
                    companyName: formData.companyName,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    linkedInProfile: formData.linkedInProfile,
                    username: formData.username, // Include username to ensure consistency
                    lastUpdated: new Date().toISOString()
                };
                
                await updateDoc(userRef, profileUpdate);
                Logger.log("ProfileModal: Profile updated successfully");
                
                // Set up listener for updates
                const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const userData = docSnapshot.data();
                        if (userData.Nickname === formData.Nickname) {
                            try {
                                sendUserToUnity();
                            } catch (error) {
                                Logger.error("Error sending user to Unity:", error);
                            }
                            unsubscribe();
                        }
                    }
                }, (error) => {
                    Logger.error("Error in profile update listener:", error);
                });
                
                // Update the user context with the new data
                try {
                    await updateUser();
                } catch (error) {
                    Logger.error("Error updating user context:", error);
                }
                
                // Update local state with the new data
                setFormData({
                    Nickname: formData.Nickname,
                    username: formData.username,
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
                Logger.error("Error updating profile data:", error);
                toast({
                    title: "Error",
                    description: "Failed to update profile: " + (error.message || "Please try again"),
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            }
        } catch (error) {
            Logger.error("Error in handleSave:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred: " + (error.message || "Please try again"),
                status: "error",
                duration: 3000,
                isClosable: true,
            });
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
                <Text fontSize="md" color="gray.400">
                    @{user.username}
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
                <FormLabel color="gray.400" fontSize="sm">Display Name</FormLabel>
                <Input
                    ref={inputRef}
                    name="Nickname"
                    value={formData.Nickname}
                    onChange={handleInputChange}
                    onFocus={() => {
                        setIsInputFocused(true);
                        blockUnityKeyboardInput(true);
                    }}
                    placeholder="Enter display name"
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    _hover={{ bg: 'gray.600' }}
                    _focus={{
                        bg: 'gray.600',
                        boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                    }}
                    maxLength={15}
                />
            </FormControl>

            <FormControl isInvalid={!!usernameError}>
                <FormLabel color="gray.400" fontSize="sm">Username</FormLabel>
                <InputGroup>
                    <InputLeftAddon 
                        bg="gray.700" 
                        color="gray.400" 
                        border="none"
                        children="@" 
                    />
                    <Input
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="username"
                        bg="gray.700"
                        border="none"
                        color="white"
                        _placeholder={{ color: 'gray.500' }}
                        _hover={{ bg: 'gray.600' }}
                        _focus={{
                            bg: 'gray.600',
                            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                        }}
                        maxLength={15}
                        isDisabled={checkingUsername}
                    />
                </InputGroup>
                {usernameError && (
                    <Text color="red.400" fontSize="sm" mt={1}>
                        {usernameError}
                    </Text>
                )}
                <FormHelperText color="gray.400">
                    Lowercase letters and numbers only, max 15 characters
                </FormHelperText>
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
                            username: user?.username || "",
                            companyName: user?.companyName || "",
                            firstName: user?.firstName || "",
                            lastName: user?.lastName || "",
                            linkedInProfile: user?.linkedInProfile || ""
                        });
                        setIsEditing(false);
                        setUsernameError("");
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
                    isLoading={isLoading || checkingUsername}
                    isDisabled={!!usernameError || checkingUsername}
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
            <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(8px)" />
            <ModalContent bg="#1a1a1a" color="white" borderRadius="xl" border="1px solid #333">
                <ModalHeader fontSize="md" fontWeight="600" pb={1} pt={3} px={4} color="white">
                    Profile
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
                <ModalBody pb={6}>
                    <VStack spacing={6}>
                        <Avatar
                            src={profileImageUrl}
                            size="2xl"
                            borderRadius="full"
                        />
                        {isEditing ? renderEditMode() : renderViewMode()}
                        
                        {/* Support Button */}
                        {!isEditing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                colorScheme="blue"
                                width="100%"
                                onClick={() => window.open('https://support.spacesmetaverse.com/', '_blank')}
                            >
                                Visit Support Site
                            </Button>
                        )}
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default ProfileModal; 