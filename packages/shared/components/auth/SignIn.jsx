import React, { useContext, useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { useForm } from "react-hook-form";
import Register from "./Register";
import { useUnityInputManager } from '@disruptive-spaces/webgl/src/hooks/useUnityInputManager';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from '@disruptive-spaces/shared/firebase/firebase';
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
    Text,
    FormControl,
    FormErrorMessage,
    Input,
    InputGroup,
    InputLeftElement,
    VStack,
    Box,
    Heading,
    useToast,
    Flex,
    Checkbox
} from "@chakra-ui/react";
import { EmailIcon, LockIcon } from "@chakra-ui/icons";

// reCAPTCHA site key - should be moved to environment variables in production
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Le4oQUrAAAAAHe0GMH5Z0tpuqTV2qqDzK9Yk4Uv";

function SignIn({ mode = 'button', label = 'Sign In', buttonProps = {}, initialIsOpen = false }) {
    const { signIn, createGuestUser } = useContext(UserContext);
    const { fullscreenRef } = useFullscreenContext();
    const toast = useToast();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(initialIsOpen);
    const [showRegister, setShowRegister] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const [allowGuestUsers, setAllowGuestUsers] = useState(false);
    const [isCreatingGuest, setIsCreatingGuest] = useState(false);
    const recaptchaRef = useRef(null);

    useUnityInputManager(isOpen || showResetPassword);
    
    // Check if guest users are allowed for current space
    useEffect(() => {
        const checkGuestAccess = async () => {
            try {
                // Get current space ID from URL
                const path = window.location.pathname;
                const spaceSlugMatch = path.match(/\/(w|embed)\/([^\/]+)/);
                if (spaceSlugMatch) {
                    const spaceId = spaceSlugMatch[2];
                    const spaceData = await getSpaceItem(spaceId);
                    setAllowGuestUsers(spaceData?.allowGuestUsers || false);
                }
            } catch (error) {
                Logger.error('SignIn: Error checking guest access:', error);
                setAllowGuestUsers(false);
            }
        };

        if (isOpen) {
            checkGuestAccess();
        }
    }, [isOpen]);
    
    // Listen for custom event to open the SignIn modal
    useEffect(() => {
        const handleOpenSignInModal = () => {
            setIsOpen(true);
        };
        
        window.addEventListener('openSignInModal', handleOpenSignInModal);
        
        return () => {
            window.removeEventListener('openSignInModal', handleOpenSignInModal);
        };
    }, []);

    const handleCaptchaChange = (token) => {
        setCaptchaToken(token);
    };

    const handleSignIn = async (data) => {
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

        setIsSubmitting(true);

        try {
            await signIn(data.email, data.password, captchaToken);
            Logger.log('User: Sign-in process complete.');
            setIsOpen(false);

            // Refresh the page after successful sign-in
            // This is needed to reload the Unity canvas with the new user context
            // TODO: In the future, consider implementing a more elegant solution
            // that doesn't require a full page refresh, such as:
            // 1. Using Unity's reload API
            // 2. Implementing a context update system
            // 3. Using a pub/sub system to notify Unity of user changes
            window.location.reload();
            
        } catch (error) {
            Logger.error("User: SignIn Error:", error);
            
            // Check if the error is about email verification
            const errorMessage = error.message || "An error occurred while logging in. Please check your credentials.";
            const isVerificationError = errorMessage.includes("verify your email");
            
            toast({
                title: isVerificationError ? "Email Verification Required" : "Error",
                description: errorMessage,
                status: isVerificationError ? "warning" : "error",
                duration: 10000,
                isClosable: true,
                position: "top",
                container: fullscreenRef.current
            });
        } finally {
            setIsSubmitting(false);
            
            // Reset reCAPTCHA
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }
        }
    };

    const handleResetPassword = async () => {
        if (!resetEmail) {
            toast({
                title: "Email Required",
                description: "Please enter your email address to reset your password.",
                status: "warning",
                duration: 3000,
                isClosable: true,
                position: "top",
                container: fullscreenRef.current
            });
            return;
        }

        try {
            setIsResetting(true);
            await sendPasswordResetEmail(auth, resetEmail);
            
            toast({
                title: "Password Reset Email Sent",
                description: "Check your email for instructions to reset your password.",
                status: "success",
                duration: 5000,
                isClosable: true,
                position: "top",
                container: fullscreenRef.current
            });
            
            setShowResetPassword(false);
        } catch (error) {
            Logger.error("User: Reset Password Error:", error);
            
            toast({
                title: "Error",
                description: error.message || "Failed to send password reset email. Please try again.",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "top",
                container: fullscreenRef.current
            });
        } finally {
            setIsResetting(false);
        }
    };

    const toggleModal = () => setIsOpen(prev => !prev);

    const handleShowRegister = () => {
        setIsOpen(false);
        setShowRegister(true);
    };

    const handleShowResetPassword = () => {
        setShowResetPassword(true);
    };

    const handleContinueAsGuest = async () => {
        try {
            setIsCreatingGuest(true);
            
            // Get current space ID from URL
            const path = window.location.pathname;
            const spaceSlugMatch = path.match(/\/(w|embed)\/([^\/]+)/);
            if (spaceSlugMatch) {
                const spaceId = spaceSlugMatch[2];
                await createGuestUser(spaceId);
                
                toast({
                    title: "Welcome, Guest!",
                    description: "You're now entering as a guest user.",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                    position: "top",
                    container: fullscreenRef.current
                });
                
                setIsOpen(false);
                
                // Refresh the page to reload Unity with guest user
                window.location.reload();
            }
        } catch (error) {
            Logger.error('SignIn: Error creating guest user:', error);
            toast({
                title: "Error",
                description: "Failed to create guest user. Please try again.",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "top",
                container: fullscreenRef.current
            });
        } finally {
            setIsCreatingGuest(false);
        }
    };

    const signInTrigger = mode === 'link' ? (
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

    return (
        <>
            {signInTrigger}
            <Modal 
                isOpen={isOpen} 
                onClose={toggleModal} 
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
                <form onSubmit={handleSubmit(handleSignIn)}>
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
                            <Heading size="lg" mb={2} color="white">Welcome Back</Heading>
                            <Text fontSize="sm" color="gray.400">
                                Enter your credentials to access your account
                            </Text>
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
                        <ModalBody px={8} pb={8}>
                            <VStack spacing={4}>
                                <FormControl isInvalid={errors.email}>
                                    <InputGroup>
                                        <InputLeftElement pointerEvents="none">
                                            <EmailIcon color="gray.500" />
                                        </InputLeftElement>
                                        <Input
                                            type="email"
                                            placeholder="Email"
                                            bg="gray.700"
                                            border="none"
                                            color="white"
                                            _placeholder={{ color: 'gray.500' }}
                                            _hover={{ bg: 'gray.600' }}
                                            _focus={{
                                                bg: 'gray.600',
                                                boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                            }}
                                            {...register("email", { required: "Email is required." })}
                                        />
                                    </InputGroup>
                                    <FormErrorMessage>
                                        {errors.email && errors.email.message}
                                    </FormErrorMessage>
                                </FormControl>

                                <FormControl isInvalid={errors.password}>
                                    <InputGroup>
                                        <InputLeftElement pointerEvents="none">
                                            <LockIcon color="gray.500" />
                                        </InputLeftElement>
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
                                            {...register("password", { required: "Password is required." })}
                                        />
                                    </InputGroup>
                                    <FormErrorMessage>
                                        {errors.password && errors.password.message}
                                    </FormErrorMessage>
                                </FormControl>
                                
                                <Box alignSelf="flex-end">
                                    <Link 
                                        color="blue.400" 
                                        fontSize="sm"
                                        onClick={handleShowResetPassword}
                                    >
                                        Forgot Password?
                                    </Link>
                                </Box>

                                {/* Add reCAPTCHA */}
                                <Flex width="100%" justifyContent="center" my={4}>
                                    <ReCAPTCHA
                                        ref={recaptchaRef}
                                        sitekey={RECAPTCHA_SITE_KEY}
                                        onChange={handleCaptchaChange}
                                        theme="dark"
                                    />
                                </Flex>
                            </VStack>
                        </ModalBody>

                        <ModalFooter px={8} pb={8} flexDirection="column" gap={4}>
                            <Button
                                type="submit"
                                colorScheme="blue"
                                size="lg"
                                width="100%"
                                isLoading={isSubmitting}
                                loadingText="Signing In"
                                isDisabled={!captchaToken}
                            >
                                Sign In
                            </Button>
                            
                            {allowGuestUsers && (
                                <Button
                                    colorScheme="gray"
                                    variant="outline"
                                    size="lg"
                                    width="100%"
                                    onClick={handleContinueAsGuest}
                                    isLoading={isCreatingGuest}
                                    loadingText="Creating Guest Account..."
                                    _hover={{ bg: "gray.700" }}
                                >
                                    Continue as Guest
                                </Button>
                            )}
                            
                            <Text fontSize="sm" color="gray.400" textAlign="center">
                                Don't have an account?{" "}
                                <Link color="blue.400" onClick={handleShowRegister}>
                                    Sign Up
                                </Link>
                            </Text>
                        </ModalFooter>
                    </ModalContent>
                </form>
            </Modal>
            
            <Modal
                isOpen={showResetPassword}
                onClose={() => setShowResetPassword(false)}
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
                        <Heading size="lg" mb={2} color="white">Reset Password</Heading>
                        <Text fontSize="sm" color="gray.400">
                            Enter your email to receive password reset instructions
                        </Text>
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
                    <ModalBody px={8} pb={4}>
                        <FormControl>
                            <InputGroup>
                                <InputLeftElement pointerEvents="none">
                                    <EmailIcon color="gray.500" />
                                </InputLeftElement>
                                <Input
                                    type="email"
                                    placeholder="Email"
                                    bg="gray.700"
                                    border="none"
                                    color="white"
                                    _placeholder={{ color: 'gray.500' }}
                                    _hover={{ bg: 'gray.600' }}
                                    _focus={{
                                        bg: 'gray.600',
                                        boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                    }}
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                />
                            </InputGroup>
                        </FormControl>
                    </ModalBody>
                    <ModalFooter px={8} pb={8} flexDirection="column" gap={4}>
                        <Button
                            colorScheme="blue"
                            size="lg"
                            width="100%"
                            onClick={handleResetPassword}
                            isLoading={isResetting}
                            loadingText="Sending"
                        >
                            Send Reset Link
                        </Button>
                        <Text fontSize="sm" color="gray.400" textAlign="center">
                            Remember your password?{" "}
                            <Link 
                                color="blue.400" 
                                onClick={() => setShowResetPassword(false)}
                            >
                                Back to Sign In
                            </Link>
                        </Text>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            
            <Register 
                mode="link" 
                isOpen={showRegister} 
                onClose={() => setShowRegister(false)} 
            />
        </>
    );
}

SignIn.propTypes = {
    mode: PropTypes.oneOf(['button', 'link']),
    label: PropTypes.string,
    buttonProps: PropTypes.object,
    initialIsOpen: PropTypes.bool
};

export default SignIn;
