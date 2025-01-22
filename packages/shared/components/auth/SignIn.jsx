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
    Text,
    FormControl,
    FormErrorMessage,
    Input,
    Tooltip,
    useToast,
} from "@chakra-ui/react";
import { LockIcon } from "@chakra-ui/icons";

function SignIn({ mode, label }) {
    const { signIn } = useContext(UserContext);
    const { fullscreenRef } = useFullscreenContext();
    const toast = useToast();
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            email: 'neil@pursey.net',
            password: '123456',
        }
    });
    const [isOpen, setIsOpen] = useState(false);

    const handleSignIn = async (data) => {
        try {
            await signIn(data.email, data.password);
            Logger.log('User: Sign-in process complete.');
            setIsOpen(false); // Close modal on successful login
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

    const toggleModal = () => {
        console.log("clicked sign in");
        setIsOpen(prev => {
            const newState = !prev;
            console.log("Modal open state:", newState);
            return newState;
        });
    };

    const signInTrigger = mode === 'link' ? (
        <Link variant="header" onClick={toggleModal}>
            {label}
        </Link>
    ) : (
        <Tooltip label="Sign In" hasArrow portalProps={{ containerRef: fullscreenRef }}>
            <IconButton
                aria-label={label}
                icon={<LockIcon />}
                onClick={toggleModal}
                variant="iconButton"
            />
        </Tooltip>
    );

    return (
        <>
            {signInTrigger}
            <Modal isOpen={isOpen} onClose={toggleModal} size="md" portalProps={{ containerRef: fullscreenRef }} >

                <ModalOverlay />
                <form onSubmit={handleSubmit(handleSignIn)}>
                    <ModalContent textAlign="left">
                        <ModalHeader>Sign In</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody>
                            <Text variant="formIntro">Please enter your email and password to access your account.</Text>
                            <FormControl isInvalid={errors.email} mt={4}>
                                <Input
                                    type="email"
                                    placeholder="Email"
                                    {...register("email", { required: "Email is required." })}
                                />
                                <FormErrorMessage>
                                    {errors.email && errors.email.message}
                                </FormErrorMessage>
                            </FormControl>
                            <FormControl isInvalid={errors.password} mt={4}>
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    {...register("password", { required: "Password is required." })}
                                />
                                <FormErrorMessage>
                                    {errors.password && errors.password.message}
                                </FormErrorMessage>
                            </FormControl>
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="secondary" onClick={toggleModal}>
                                Go Back
                            </Button>
                            <Button type="submit" variant="primary" ml={3}>
                                Sign In
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </form>
            </Modal>
        </>
    );
}

SignIn.propTypes = {
    mode: PropTypes.oneOf(['button', 'link']), // 'button' or 'link' to specify the trigger type
    label: PropTypes.string, // Label for the button or link
};

SignIn.defaultProps = {
    mode: 'button',
    label: 'Sign In',
};

export default SignIn;
