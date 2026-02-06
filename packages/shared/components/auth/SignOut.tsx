import React, { useContext } from "react";
import PropTypes from "prop-types";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface SignOutProps {
    mode?: 'button' | 'link';
    label?: string;
}

function SignOut({ mode = 'button', label = 'Sign Out' }: SignOutProps) {
    const { signOut } = useContext(UserContext);
    const { fullscreenRef } = useFullscreenContext();

    const handleSignOut = async () => {
        try {
            await signOut();
            alert("Logged Out\n\nYou have been successfully logged out.");
            // Redirect using window.location instead of react-router
            window.location.href = '/';
        } catch (error) {
            console.error("SignOut Error:", error);
            alert("Error\n\nAn error occurred while logging out.");
        }
    }

    const signOutTrigger = mode === 'link' ? (
        <a className="link" onClick={handleSignOut} style={{ cursor: 'pointer' }}>
            {label}
        </a>
    ) : null;

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

export default SignOut;
