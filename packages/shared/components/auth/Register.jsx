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
    Tooltip,
    useToast
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";

function Register({ mode, label }) {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { register: userProviderRegister } = useContext(UserContext);
    const toast = useToast();
    const { fullscreenRef } = useFullscreenContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            await userProviderRegister(email, password, additionalData);
            Logger.log('User: Registration process complete.');
            setIsModalOpen(false);
            toast({
                title: "Registration Successful",
                description: "Your account has been created.",
                status: "success",
                duration: 3000,
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
        setIsModalOpen(!isModalOpen);
    }

    const registerTrigger = mode === 'link' ? (
        <Link variant="header" onClick={toggleModal}>
            {label}
        </Link>
    ) : (
        <Tooltip label={label} hasArrow portalProps={{ containerRef: fullscreenRef }}>
            <IconButton
                aria-label={label}
                icon={<EditIcon />}
                onClick={toggleModal}
                variant="iconButton"
                mr={1}
            />
        </Tooltip>
    );

    return (
        <>
            {registerTrigger}
            <Modal isOpen={isModalOpen} onClose={toggleModal} size="md" portalProps={{ containerRef: fullscreenRef }}>
                <ModalOverlay />
                <ModalContent textAlign="left">
                    <ModalHeader>Register</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <form onSubmit={handleSubmit(handleRegister)}>
                            <Text variant="formIntro">Please complete the details below to create an account.</Text>

                            <FormControl isInvalid={errors.companyName} isRequired mt={4}>
                                <Input
                                    placeholder="Company Name"
                                    {...register("companyName", { required: "Company name is required" })}
                                />
                                <FormErrorMessage>{errors.companyName && errors.companyName.message}</FormErrorMessage>
                            </FormControl>

                            <Flex>
                                <FormControl isInvalid={errors.firstName} isRequired mt={4} mr={4}>
                                    <Input
                                        placeholder="First Name"
                                        {...register("firstName", { required: "First name is required" })}
                                    />
                                    <FormErrorMessage>{errors.firstName && errors.firstName.message}</FormErrorMessage>
                                </FormControl>
                                <FormControl isInvalid={errors.lastName} isRequired mt={4}>
                                    <Input
                                        placeholder="Last Name"
                                        {...register("lastName", { required: "Last name is required" })}
                                    />
                                    <FormErrorMessage>{errors.lastName && errors.lastName.message}</FormErrorMessage>
                                </FormControl>
                            </Flex>

                            <FormControl isInvalid={errors.email} isRequired mt={6}>
                                <Input
                                    type="email"
                                    placeholder="Work Email Address"
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

                            <Flex>
                                <FormControl isInvalid={errors.password} isRequired mt={4} mr={4}>
                                    <Input
                                        type="password"
                                        placeholder="Password"
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
                                <FormControl isInvalid={errors.confirmPassword} isRequired mt={4}>
                                    <Input
                                        type="password"
                                        placeholder="Confirm Password"
                                        {...register("confirmPassword", { required: "Confirm password is required" })}
                                    />
                                    <FormErrorMessage>{errors.confirmPassword && errors.confirmPassword.message}</FormErrorMessage>
                                </FormControl>
                            </Flex>

                            <FormControl mt={6}>
                                <Input
                                    placeholder="Access Code"
                                    {...register("accessCode")}
                                />

                            </FormControl>

                            <FormControl mt={4}>
                                <Input
                                    placeholder="LinkedIn Profile (optional)"
                                    {...register("linkedInProfile")}
                                />
                            </FormControl>
                        </form>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="secondary" onClick={toggleModal} disabled={isSubmitting}>Go Back</Button>
                        <Button type="submit" variant="primary" ml={3} onClick={handleSubmit(handleRegister)} isLoading={isSubmitting}>Register</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
}

Register.propTypes = {
    mode: PropTypes.oneOf(['button', 'link']),
    label: PropTypes.string,
};

Register.defaultProps = {
    mode: 'button',
    label: 'Register',
};

export default Register;
