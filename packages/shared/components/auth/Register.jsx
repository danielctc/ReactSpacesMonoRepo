import React, { useContext, useState } from "react";
import PropTypes from "prop-types";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useForm } from "react-hook-form";
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
    useToast
} from "@chakra-ui/react";
import { useUnityInputManager } from '@disruptive-spaces/webgl/src/hooks/useUnityInputManager';

function Register({ mode, label, buttonProps = {}, isOpen: propIsOpen, onClose: propOnClose }) {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { register: userProviderRegister } = useContext(UserContext);
    const toast = useToast();
    const { fullscreenRef } = useFullscreenContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isOpen = propIsOpen !== undefined ? propIsOpen : isModalOpen;
    const onClose = propOnClose || (() => setIsModalOpen(false));

    useUnityInputManager(isOpen);

    const handleRegister = async (data) => {
        const { email, password, confirmPassword, ...additionalData } = data;
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
            const userData = await userProviderRegister(email, password, additionalData);
            Logger.log('User: Registration process complete.');
            onClose();
            toast({
                title: "Registration Successful",
                description: "Your account has been created. Please check your email to verify your account before signing in.",
                status: "success",
                duration: 7000,
                isClosable: true,
                position: "top",
            });
        } catch (error) {
            Logger.error("User: Registration Error:", error);
            toast({
                title: "Error",
                description: "An error occurred during registration. Please try again.",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top",
            });
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

    return (
        <>
            {!propIsOpen && registerTrigger}
            <Modal 
                isOpen={isOpen} 
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
                                        {...register("companyName", { required: "Company name is required" })}
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
                                            {...register("firstName", { required: "First name is required" })}
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
                                            {...register("lastName", { required: "Last name is required" })}
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
                                        placeholder="Access Code"
                                        bg="gray.700"
                                        border="none"
                                        color="white"
                                        _placeholder={{ color: 'gray.500' }}
                                        _hover={{ bg: 'gray.600' }}
                                        _focus={{
                                            bg: 'gray.600',
                                            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
                                        }}
                                        {...register("accessCode")}
                                    />
                                </FormControl>

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
                                        {...register("linkedInProfile")}
                                    />
                                </FormControl>
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
                            loadingText="Creating Account"
                        >
                            Create Account
                        </Button>
                        <Text fontSize="sm" color="gray.400" textAlign="center">
                            Already have an account?{" "}
                            <Link color="blue.400" onClick={onClose}>
                                Sign In
                            </Link>
                        </Text>
                    </ModalFooter>
                </ModalContent>
            </Modal>
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
