import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    FormControl,
    FormLabel,
    FormErrorMessage,
    FormHelperText,
    Text,
    Box,
    Flex,
    VStack,
    InputGroup,
    InputLeftAddon,
    Heading,
    useToast,
    Center,
    Spinner
} from "@chakra-ui/react";
import { isUsernameTaken } from "@disruptive-spaces/shared/firebase/userFirestore";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const UsernameConfirmation = ({ 
    isOpen, 
    onClose, 
    userData, 
    onConfirm,
    fullscreenRef
}) => {
    const [username, setUsername] = useState(userData?.username || "");
    const [nickname, setNickname] = useState(userData?.Nickname || "");
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    // Validate username format (alphanumeric, no spaces, max 15 chars)
    const isUsernameValid = (username) => {
        return /^[a-z0-9]{1,15}$/.test(username);
    };

    // Check if username is available (not taken)
    const checkUsername = async (username) => {
        if (!isUsernameValid(username)) {
            setError("Username must be 1-15 characters, lowercase letters and numbers only");
            return false;
        }

        setIsChecking(true);
        setError(null);
        
        try {
            // Add retry logic for username availability check
            let isTaken = false;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    // Double check with the most recent data
                    isTaken = await isUsernameTaken(username);
                    // If successful, break out of retry loop
                    break;
                } catch (checkError) {
                    Logger.error(`Attempt ${retryCount + 1}: Error checking username:`, checkError);
                    retryCount++;
                    
                    // Only throw on the last attempt
                    if (retryCount >= maxRetries) {
                        throw checkError;
                    }
                    
                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            if (isTaken) {
                setError("Username is already taken");
                return false;
            }
            
            // Username is available
            return true;
        } catch (error) {
            Logger.error("Error checking username after retries:", error);
            
            // Show a more user-friendly error depending on the type of error
            if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
                setError("Username check unavailable. Please try again or pick a unique name.");
            } else {
                setError("Error checking username availability. Please try again.");
            }
            
            // Return true if it's just a permission error - allow registration to proceed
            // This is a fallback that lets the Firebase function handle any conflicts later
            return error.code === 'permission-denied' || error.message?.includes('permissions');
        } finally {
            setIsChecking(false);
        }
    };

    // Debounce the username check
    useEffect(() => {
        if (!username) {
            setError("Username cannot be empty");
            return;
        }
        
        // Only validate when the input changes from initial value
        if (username !== userData?.username) {
            const handler = setTimeout(async () => {
                await checkUsername(username);
            }, 500);
            
            return () => clearTimeout(handler);
        }
    }, [username]);

    // When first/last name changes, regenerate the Nickname suggestion
    useEffect(() => {
        // When component first loads, ensure Nickname is set to the format from UserProvider
        if (userData && userData.firstName && userData.lastName) {
            const generatedNickname = `${userData.firstName}${userData.lastName.charAt(0).toUpperCase()}`;
            setNickname(generatedNickname);
        }
    }, [userData]);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        
        try {
            // Validate username one last time
            const isValid = await checkUsername(username);
            
            if (!isValid) {
                setIsSubmitting(false);
                return;
            }
            
            // Validate nickname (max 15 chars)
            if (nickname.length > 15) {
                setError("Display Name must be at most 15 characters");
                setIsSubmitting(false);
                return;
            }
            
            // Log minimal information about the operation
            Logger.log("UsernameConfirmation: Preparing to confirm user registration");
            
            // Generate the exact format of Nickname as used in UserProvider
            const generatedNickname = userData.firstName && userData.lastName 
                ? `${userData.firstName}${userData.lastName.charAt(0).toUpperCase()}` 
                : "";
                
            // All good, proceed with registration
            const dataToConfirm = {
                // First spread userData to get all original fields
                ...userData,
                // Then explicitly include critical fields with defaults
                firstName: userData.firstName || "",
                lastName: userData.lastName || "",
                companyName: userData.companyName || "",
                linkedInProfile: userData.linkedInProfile || "",
                // Remove accessCode, it's redundant
                // Add the custom fields
                username,
                // Set the Nickname field (from the input or defaulting to generated)
                Nickname: nickname || generatedNickname,
                // Keep these auth fields if they exist
                email: userData.email,
                password: userData.password
            };
            
            Logger.log("UsernameConfirmation: Processed registration data with fields:", Object.keys(dataToConfirm).join(', '));
            
            await onConfirm(dataToConfirm);
            
            onClose();
        } catch (error) {
            Logger.error("Error during username confirmation:", error);
            toast({
                title: "Error",
                description: "An error occurred. Please try again.",
                status: "error",
                duration: 3000,
                isClosable: true
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Prevent modal closing during submission
    const handleClose = () => {
        if (isSubmitting) {
            return; // Do nothing if submission is in progress
        }
        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose}
            size="md"
            portalProps={{ containerRef: fullscreenRef }}
            isCentered
            motionPreset="slideInBottom"
            closeOnOverlayClick={!isSubmitting}
            closeOnEsc={!isSubmitting}
        >
            <ModalOverlay 
                bg="blackAlpha.800" 
                backdropFilter="blur(5px)"
            />
            <ModalContent
                bg="gray.800"
                borderRadius="xl"
                boxShadow="xl"
                color="white"
                maxW="md"
                mx={4}
                position="relative"
            >
                <ModalHeader>
                    <Heading size="lg" mb={2}>Customize Your Profile</Heading>
                    <Text fontSize="sm" color="gray.400">
                        Set your username and nickname
                    </Text>
                </ModalHeader>
                <ModalCloseButton color="gray.400" isDisabled={isSubmitting} />
                
                <ModalBody>
                    <VStack spacing={6} align="stretch">
                        <FormControl isInvalid={!!error}>
                            <FormLabel>Username</FormLabel>
                            <InputGroup>
                                <InputLeftAddon 
                                    bg="gray.700" 
                                    color="gray.400" 
                                    border="none"
                                    children="@" 
                                />
                                <Input
                                    placeholder="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                    bg="gray.700"
                                    border="none"
                                    color="white"
                                    _placeholder={{ color: 'gray.500' }}
                                    _hover={{ bg: "gray.600" }}
                                    _focus={{
                                        bg: "gray.600",
                                        boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)"
                                    }}
                                    maxLength={15}
                                />
                            </InputGroup>
                            {error ? (
                                <FormErrorMessage>{error}</FormErrorMessage>
                            ) : (
                                <FormHelperText color="gray.400">
                                    Lowercase letters and numbers only, max 15 characters
                                </FormHelperText>
                            )}
                        </FormControl>
                        
                        <FormControl>
                            <FormLabel>Nickname</FormLabel>
                            <Input
                                placeholder="Nickname"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                bg="gray.700"
                                border="none"
                                color="white"
                                _placeholder={{ color: 'gray.500' }}
                                _hover={{ bg: "gray.600" }}
                                _focus={{
                                    bg: "gray.600",
                                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)"
                                }}
                                maxLength={15}
                            />
                            <FormHelperText color="gray.400">
                                This is the name shown to others, max 15 characters
                            </FormHelperText>
                        </FormControl>
                    </VStack>
                </ModalBody>
                
                <ModalFooter>
                    <Flex gap={3} width="100%">
                        <Button 
                            variant="outline" 
                            onClick={handleClose}
                            flex="1"
                            isDisabled={isSubmitting}
                        >
                            Back
                        </Button>
                        <Button 
                            colorScheme="blue" 
                            onClick={handleConfirm}
                            isLoading={isSubmitting || isChecking}
                            isDisabled={!!error || !username || isSubmitting}
                            flex="2"
                        >
                            Finish
                        </Button>
                    </Flex>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

UsernameConfirmation.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    userData: PropTypes.object.isRequired,
    onConfirm: PropTypes.func.isRequired,
    fullscreenRef: PropTypes.object
};

export default UsernameConfirmation; 