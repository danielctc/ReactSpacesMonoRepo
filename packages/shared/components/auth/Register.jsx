import React, { useContext, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useForm } from "react-hook-form";
import ReCAPTCHA from "react-google-recaptcha";
import {
    IconButton,
    Button,
    Link,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Flex,
    Text,
    FormControl,
    FormErrorMessage,
    Input,
    VStack,
    Heading,
    useToast,
    Spinner,
    Center,
    Box
} from "@chakra-ui/react";
import { useUnityInputManager } from '@disruptive-spaces/webgl/src/hooks/useUnityInputManager';
import UsernameConfirmation from './UsernameConfirmation';
import { generateUniqueUsername } from '@disruptive-spaces/shared/firebase/userFirestore';

// reCAPTCHA site key - should be moved to environment variables in production
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Le4oQUrAAAAAHe0GMH5Z0tpuqTV2qqDzK9Yk4Uv";

function Register({ mode, label, buttonProps = {}, isOpen: propIsOpen, onClose: propOnClose }) {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { register: userProviderRegister } = useContext(UserContext);
    const toast = useToast();
    const { fullscreenRef } = useFullscreenContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const recaptchaRef = useRef(null);
    
    // State for username confirmation step
    const [showUsernameConfirmation, setShowUsernameConfirmation] = useState(false);
    const [pendingUserData, setPendingUserData] = useState(null);
    const [registrationInProgress, setRegistrationInProgress] = useState(false);

    const isOpen = propIsOpen !== undefined ? propIsOpen : isModalOpen;
    const onClose = propOnClose || (() => setIsModalOpen(false));

    useUnityInputManager(isOpen || showUsernameConfirmation);

    // Reset captcha when modal closes/opens
    useEffect(() => {
        if (!isOpen && recaptchaRef.current) {
            recaptchaRef.current.reset();
            setCaptchaToken(null);
        }
    }, [isOpen]);

    const handleCaptchaChange = (token) => {
        setCaptchaToken(token);
    };

    const handleRegister = async (data) => {
        Logger.log("Register.jsx: Processing registration form submission");
        const { email, password, confirmPassword, ...additionalData } = data;
        Logger.log("Register.jsx: Registration data fields:", Object.keys(additionalData).join(', '));
        
        if (!captchaToken) {
            toast({
                title: "Verification Required",
                description: "Please complete the reCAPTCHA verification.",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top",
            });
            return;
        }
        
        if (password !== confirmPassword) {
            toast({
                title: "Error",
                description: "Passwords do not match.",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Generate a suggested username based on first and last name
            const suggestedUsername = await generateUniqueUsername(
                additionalData.firstName || "", 
                additionalData.lastName || ""
            );
            
            // Generate Nickname in the same format as in UserProvider 
            const Nickname = additionalData.firstName && additionalData.lastName 
                ? `${additionalData.firstName}${additionalData.lastName.charAt(0).toUpperCase()}`
                : "";
            
            Logger.log("Register.jsx: Generated username and nickname for new user");
            
            // Ensure all fields have proper values
            const userData = {
                // Start with all the form data
                ...additionalData,
                // Make sure critical fields are explicitly added with defaults
                firstName: additionalData.firstName || "",
                lastName: additionalData.lastName || "",
                companyName: additionalData.companyName || "",
                linkedInProfile: additionalData.linkedInProfile || "",
                // Add generated fields
                email,
                password,
                username: suggestedUsername,
                Nickname, // Include the Nickname field
                captchaToken, // Include the captcha token for verification
            };
            
            Logger.log("Register.jsx: Prepared registration data with fields:", Object.keys(userData).join(', '));
            
            // Store pending user data for the confirmation step
            setPendingUserData(userData);
            
            // Show username confirmation modal
            setShowUsernameConfirmation(true);
            
        } catch (error) {
            Logger.error("User: Registration Error:", error);
            
            // Provide specific error message for duplicate email
            let errorMessage = "An error occurred during registration. Please try again.";
            let showSignInLink = false;
            
            // Handle specific error codes from Firebase Auth
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already registered. Please sign in instead.";
                showSignInLink = true;
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "The email address is not valid. Please check and try again.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "The password is too weak. Please choose a stronger password.";
            } else if (error.message) {
                // If there's a specific error message, use it
                errorMessage = error.message;
            }
            
            toast({
                title: "Registration Failed",
                description: (
                    <>
                        {errorMessage}
                        {showSignInLink && (
                            <Text mt={2}>
                                <Link 
                                    color="blue.400" 
                                    onClick={() => {
                                        onClose();
                                        // Dispatch a custom event to open the SignIn modal
                                        window.dispatchEvent(new CustomEvent('openSignInModal'));
                                    }}
                                >
                                    Go to Sign In
                                </Link>
                            </Text>
                        )}
                    </>
                ),
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "top",
            });
        } finally {
            setIsSubmitting(false);
            
            // Reset reCAPTCHA
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }
        }
    };
    
    // Complete registration with username and nickname
    const completeRegistration = async (userData) => {
        setIsSubmitting(true);
        
        try {
            Logger.log("Register.jsx: Completing registration with confirmed username");
            
            // Extract auth data
            const { email, password, ...additionalData } = userData;
            
            // Prepare the final registration data
            const finalData = {
                // Start with all additionalData fields
                ...additionalData,
                // Explicitly include critical fields with defaults to ensure they're present
                firstName: additionalData.firstName || "",
                lastName: additionalData.lastName || "",
                companyName: additionalData.companyName || "",
                linkedInProfile: additionalData.linkedInProfile || "",
                username: additionalData.username || "",
                Nickname: additionalData.Nickname || ""
            };
            
            Logger.log("Register.jsx: Final registration data includes fields:", Object.keys(finalData).join(', '));
            
            // Register user with Firebase (the global overlay will be shown by UserProvider)
            const registeredUserData = await userProviderRegister(email, password, finalData);
            
            // Success! The overlay will be shown by UserProvider
            onClose();
            setShowUsernameConfirmation(false);
            
            Logger.log('User: Registration process complete.');
            
            // Reset the state
            setPendingUserData(null);
            setRegistrationInProgress(false);
            
        } catch (error) {
            Logger.error("User: Registration Error during final step:", error);
            
            // Handle specific error scenarios
            let errorMessage = "An error occurred during registration. Please try again.";
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use. Please try another one.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast({
                title: "Registration Failed",
                description: errorMessage,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "top",
            });
            
            setShowUsernameConfirmation(false);
            setPendingUserData(null);
            setRegistrationInProgress(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleModal = () => {
        if (propOnClose) {
            propOnClose();
        } else {
            setIsModalOpen(!isModalOpen);
        }
    }

    const registerTrigger = mode === 'link' ? (
        <Link variant="header" onClick={toggleModal}>
            {label}
        </Link>
    ) : (
        <Button
            onClick={toggleModal}
            {...buttonProps}
        >
            {label}
        </Button>
    );

    // Close both modals
    const handleCloseAll = () => {
        setShowUsernameConfirmation(false);
        onClose();
    };

    return (
        <>
            {!propIsOpen && registerTrigger}
            <Modal 
                isOpen={isOpen && !showUsernameConfirmation} 
                onClose={onClose} 
                size="md" 
                portalProps={{ containerRef: fullscreenRef }}
                isCentered
                motionPreset="slideInBottom"
                blockScrollOnMount={false}
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
                    zIndex={9999}
                    sx={{
                        isolation: 'isolate',
                        '& input': {
                            position: 'relative',
                            zIndex: 10000,
                            isolation: 'isolate'
                        },
                        '& *': {
                            pointerEvents: 'auto !important'
                        }
                    }}
                    onKeyDown={(e) => {
                        e.stopPropagation();
                    }}
                >
                    <ModalHeader p={8} textAlign="center">
                        <Heading size="lg" mb={2}>Create Account</Heading>
                        <Text fontSize="sm" color="gray.400">
                            Fill in your details to get started
                        </Text>
                    </ModalHeader>
                    <ModalCloseButton color="gray.400" />
                    <ModalBody px={8}>
                        <form onSubmit={handleSubmit(handleRegister)}>
                            <VStack spacing={4}>
                                <FormControl isInvalid={errors.companyName} isRequired>
                                    <Input
                                        placeholder="Company Name"
                                        bg="gray.700"
                                        border="none"
                                        color="white"
                                        _placeholder={{ color: 'gray.500' }}
                                        _hover={{ bg: 'gray.600' }}
                                        _focus={{
                                            bg: 'gray.600',
                                            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                        }}
                                        {...register("companyName", { 
                                            required: "Company name is required",
                                            setValueAs: v => v === "" ? "" : v
                                        })}
                                    />
                                    <FormErrorMessage>{errors.companyName && errors.companyName.message}</FormErrorMessage>
                                </FormControl>

                                <Flex gap={4} w="100%">
                                    <FormControl isInvalid={errors.firstName} isRequired>
                                        <Input
                                            placeholder="First Name"
                                            bg="gray.700"
                                            border="none"
                                            color="white"
                                            _placeholder={{ color: 'gray.500' }}
                                            _hover={{ bg: 'gray.600' }}
                                            _focus={{
                                                bg: 'gray.600',
                                                boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                            }}
                                            {...register("firstName", { 
                                                required: "First name is required",
                                                setValueAs: v => v === "" ? "" : v
                                            })}
                                        />
                                        <FormErrorMessage>{errors.firstName && errors.firstName.message}</FormErrorMessage>
                                    </FormControl>
                                    <FormControl isInvalid={errors.lastName} isRequired>
                                        <Input
                                            placeholder="Last Name"
                                            bg="gray.700"
                                            border="none"
                                            color="white"
                                            _placeholder={{ color: 'gray.500' }}
                                            _hover={{ bg: 'gray.600' }}
                                            _focus={{
                                                bg: 'gray.600',
                                                boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                            }}
                                            {...register("lastName", { 
                                                required: "Last name is required",
                                                setValueAs: v => v === "" ? "" : v
                                            })}
                                        />
                                        <FormErrorMessage>{errors.lastName && errors.lastName.message}</FormErrorMessage>
                                    </FormControl>
                                </Flex>

                                <FormControl isInvalid={errors.email} isRequired>
                                    <Input
                                        type="email"
                                        placeholder="Work Email Address"
                                        bg="gray.700"
                                        border="none"
                                        color="white"
                                        _placeholder={{ color: 'gray.500' }}
                                        _hover={{ bg: 'gray.600' }}
                                        _focus={{
                                            bg: 'gray.600',
                                            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                        }}
                                        {...register("email", {
                                            required: "Email is required",
                                            pattern: {
                                                value: /^[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+$/,
                                                message: "Invalid email address"
                                            }
                                        })}
                                    />
                                    <FormErrorMessage>{errors.email && errors.email.message}</FormErrorMessage>
                                </FormControl>

                                <Flex gap={4} w="100%">
                                    <FormControl isInvalid={errors.password} isRequired>
                                        <Input
                                            type="password"
                                            placeholder="Password"
                                            bg="gray.700"
                                            border="none"
                                            color="white"
                                            _placeholder={{ color: 'gray.500' }}
                                            _hover={{ bg: 'gray.600' }}
                                            _focus={{
                                                bg: 'gray.600',
                                                boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                            }}
                                            {...register("password", {
                                                required: "Password is required",
                                                minLength: {
                                                    value: 8,
                                                    message: "Password must be at least 8 characters long"
                                                }
                                            })}
                                        />
                                        <FormErrorMessage>{errors.password && errors.password.message}</FormErrorMessage>
                                    </FormControl>
                                    <FormControl isInvalid={errors.confirmPassword} isRequired>
                                        <Input
                                            type="password"
                                            placeholder="Confirm Password"
                                            bg="gray.700"
                                            border="none"
                                            color="white"
                                            _placeholder={{ color: 'gray.500' }}
                                            _hover={{ bg: 'gray.600' }}
                                            _focus={{
                                                bg: 'gray.600',
                                                boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                            }}
                                            {...register("confirmPassword", { required: "Confirm password is required" })}
                                        />
                                        <FormErrorMessage>{errors.confirmPassword && errors.confirmPassword.message}</FormErrorMessage>
                                    </FormControl>
                                </Flex>

                                <FormControl>
                                    <Input
                                        placeholder="LinkedIn Profile (optional)"
                                        bg="gray.700"
                                        border="none"
                                        color="white"
                                        _placeholder={{ color: 'gray.500' }}
                                        _hover={{ bg: 'gray.600' }}
                                        _focus={{
                                            bg: 'gray.600',
                                            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                        }}
                                        {...register("linkedInProfile", {
                                            setValueAs: v => v === "" ? "" : v
                                        })}
                                    />
                                </FormControl>

                                {/* Add reCAPTCHA at the end of the form */}
                                <Box width="100%" display="flex" justifyContent="center" my={4}>
                                    <ReCAPTCHA
                                        ref={recaptchaRef}
                                        sitekey={RECAPTCHA_SITE_KEY}
                                        onChange={handleCaptchaChange}
                                        theme="dark"
                                    />
                                </Box>
                            </VStack>
                        </form>
                    </ModalBody>
                    <ModalFooter px={8} pb={8} flexDirection="column" gap={4}>
                        <Button
                            type="submit"
                            colorScheme="blue"
                            size="lg"
                            width="100%"
                            onClick={handleSubmit(handleRegister)}
                            isLoading={isSubmitting}
                            loadingText="Processing"
                            isDisabled={!captchaToken}
                        >
                            Next: Set Your Username
                        </Button>
                        <Text fontSize="sm" color="gray.400" textAlign="center">
                            Already have an account?{" "}
                            <Link color="blue.400" onClick={() => {
                                onClose();
                                // Dispatch a custom event to open the SignIn modal
                                window.dispatchEvent(new CustomEvent('openSignInModal'));
                            }}>
                                Sign In
                            </Link>
                        </Text>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            
            {/* Username Confirmation Modal */}
            {showUsernameConfirmation && (
                <UsernameConfirmation
                    isOpen={showUsernameConfirmation}
                    onClose={() => setShowUsernameConfirmation(false)}
                    userData={pendingUserData}
                    onConfirm={completeRegistration}
                    fullscreenRef={fullscreenRef}
                    isRegistering={registrationInProgress}
                />
            )}
        </>
    );
}

Register.propTypes = {
    mode: PropTypes.oneOf(['button', 'link']),
    label: PropTypes.string,
    buttonProps: PropTypes.object,
    isOpen: PropTypes.bool,
    onClose: PropTypes.func
};


export default Register;
