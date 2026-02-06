import React from 'react';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { useContext } from 'react';
import SignIn from '@disruptive-spaces/shared/components/auth/SignIn';
import Register from '@disruptive-spaces/shared/components/auth/Register';

const HeaderAuthLinks = () => {
    const { user, loading } = useContext(UserContext);

    // Don't show anything while loading to prevent flash of login screen
    if (loading) {
        return null;
    }

    return (
        <div className="relative z-[9999]">
            {!user ? (
                <>
                    <SignIn mode="link" label="Sign In" />
                    <Register mode="link" label="Register" />
                </>
            ) : (
                <div>Profile placeholder</div>
            )}
        </div>
    );
};

export default HeaderAuthLinks;
