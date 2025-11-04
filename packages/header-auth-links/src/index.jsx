import React from 'react';
import { Box } from '@chakra-ui/react';
import SignIn from '@disruptive-spaces/shared/components/auth/SignIn';
import Register from '@disruptive-spaces/shared/components/auth/Register';
import Profile from '@disruptive-spaces/shared/components/auth/Profile';
import { useContext } from 'react';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

const HeaderAuthLinks = () => {
    const { user, loading } = useContext(UserContext);

    // Don't show anything while loading to prevent flash of login screen
    if (loading) {
        return null;
    }

    return (
        <Box 
            position="relative"
            zIndex="9999"
        >
            {!user ? (
                <>
                    <SignIn mode="link" label="Sign In" />
                    <Register mode="link" label="Register" />
                </>
            ) : (
                <Profile />
            )}
        </Box>
    );
};

export default HeaderAuthLinks; 