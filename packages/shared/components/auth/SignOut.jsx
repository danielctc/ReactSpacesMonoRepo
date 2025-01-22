import React, { useContext } from "react";
import PropTypes from "prop-types";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';

import { Logger } from '@disruptive-spaces/shared/logging/react-log';

import {
    IconButton,
    useToast,
    Tooltip,
    Link
} from "@chakra-ui/react";
import { UnlockIcon } from "@chakra-ui/icons";


function SignOut({ mode, label }) {

    const toast = useToast();
    const { signOut } = useContext(UserContext);
    const { fullscreenRef } = useFullscreenContext();

    const handleSignOut = async () => {
        try {
            await signOut();
            toast({
                title: "Logged Out",
                description: "You have been successfully logged out.",
                status: "success",
                duration: 3000,
                isClosable: true,
                position: "top",
                container: fullscreenRef.current
            });
        } catch (error) {
            console.error("SignOut Error:", error);
            toast({
                title: "Error",
                description: "An error occurred while logging out.",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top",
                container: fullscreenRef.current
            });
        }
    }


    const signOutTrigger = mode === 'link' ? (
        <Link variant="header" onClick={handleSignOut} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            {label}
        </Link>
    ) : (

        <Tooltip label="Sign Out" hasArrow portalProps={{ containerRef: fullscreenRef }}>
            <IconButton
                aria-label="Sign Out"
                icon={<UnlockIcon />}
                onClick={handleSignOut}
                variant="iconButton"
            />
        </Tooltip>

    );


    return (

        <>
            {signOutTrigger}
        </>

    );
}

SignOut.propTypes = {
    mode: PropTypes.oneOf(['button', 'link']),
    label: PropTypes.string,
};

SignOut.defaultProps = {
    mode: 'button',
    label: 'Sign Out',
};
export default SignOut;
