import React, { useContext, useState } from "react";
import PropTypes from "prop-types";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useForm } from "react-hook-form";
import Register from "./Register";
import { useUnityInputManager } from '@disruptive-spaces/webgl/src/hooks/useUnityInputManager';

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
} from "@chakra-ui/react";
import { EmailIcon, LockIcon } from "@chakra-ui/icons";

function SignIn({ mode = 'button', label = 'Sign In', buttonProps = {} }) {
    const { signIn } = useContext(UserContext);
    const { fullscreenRef } = useFullscreenContext();
    const toast = useToast();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            email: 'neil@pursey.net',
            password: '123456',
        }
    });
    const [isOpen, setIsOpen] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    useUnityInputManager(isOpen);

    const handleSignIn = async (data) => {
        try {
            await signIn(data.email, data.password);
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
            toast({
                title: "Error",
                description: "An error occurred while logging in. Please check your credentials.",
                status: "error",
                duration: 10000,
                isClosable: true,
                position: "top",
                container: fullscreenRef.current
            });
        }
    };

    const toggleModal = () => setIsOpen(prev => !prev);

    const handleShowRegister = () => {
        setIsOpen(false);
        setShowRegister(true);
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
                            <Heading size="lg" mb={2}>Welcome Back</Heading>
                            <Text fontSize="sm" color="gray.400">
                                Enter your credentials to access your account
                            </Text>
                        </ModalHeader>
                        <ModalCloseButton color="gray.400" />
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
                            >
                                Sign In
                            </Button>
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
    buttonProps: PropTypes.object
};

export default SignIn;
