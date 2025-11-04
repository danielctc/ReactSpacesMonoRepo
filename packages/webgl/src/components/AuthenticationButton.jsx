// @jsxImportSource react
import { useContext, useEffect, useState } from "react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider"; // Adjust the path as needed
import { getSpaceItem } from "@disruptive-spaces/shared/firebase/spacesFirestore";
// import { Logger } from '@disruptive-spaces/shared/logging/react-log';

import SignIn from "@disruptive-spaces/shared/components/auth/SignIn";
import SignOut from "@disruptive-spaces/shared/components/auth/SignOut";
import Register from "@disruptive-spaces/shared/components/auth/Register";

function AuthenticationButton() {
    const { user, currentUser, isGuestUser } = useContext(UserContext);
    const [allowGuestUsers, setAllowGuestUsers] = useState(false);
    const [hideGuestSignInButton, setHideGuestSignInButton] = useState(false);
    const [showAuthButton, setShowAuthButton] = useState(true);
    const [spaceId, setSpaceId] = useState(null);
    
    // Get current space ID from URL
    useEffect(() => {
        const getCurrentSpaceId = () => {
            try {
                // First, try to get space ID from webgl-root element (micro-frontend setup)
                const webglRoot = document.getElementById('webgl-root');
                if (webglRoot) {
                    const spaceIdFromElement = webglRoot.getAttribute('data-space-id');
                    if (spaceIdFromElement) {
                        
                        return spaceIdFromElement;
                    }
                }
                
                // Fallback: try to get from URL (for other setups)
                const path = window.location.pathname;
                const spaceSlugMatch = path.match(/\/(w|embed)\/([^\/]+)/);
                if (spaceSlugMatch) {
                    
                    return spaceSlugMatch[2];
                }
                
                const urlParams = new URLSearchParams(window.location.search);
                const spaceIdFromParams = urlParams.get('spaceId') || urlParams.get('space');
                if (spaceIdFromParams) {
                    
                    return spaceIdFromParams;
                }
                
                
                return null;
            } catch (error) {
                console.error('AuthenticationButton: Error getting space ID:', error);
                return null;
            }
        };
        
        const detectedSpaceId = getCurrentSpaceId();
        
        setSpaceId(detectedSpaceId);
    }, []);
    
    // Check if guest users are allowed for current space
    useEffect(() => {
        const checkGuestAccess = async () => {
            if (!spaceId) {
                
                return;
            }
            
            
            
            try {
                const spaceData = await getSpaceItem(spaceId);
                
                
                setAllowGuestUsers(spaceData?.allowGuestUsers || false);
                setHideGuestSignInButton(spaceData?.hideGuestSignInButton || false);
                setShowAuthButton(spaceData?.showAuthButton !== undefined ? spaceData.showAuthButton : true);
            } catch (error) {
                console.error('AuthenticationButton: Error fetching space data:', error);
                
                setAllowGuestUsers(false);
                setHideGuestSignInButton(false);
            }
        };
        
        checkGuestAccess();
        
        // Listen for space settings changes
        const handleSpaceSettingsChanged = () => {
            
            checkGuestAccess();
        };
        
        window.addEventListener('SpaceSettingsChanged', handleSpaceSettingsChanged);
        
        return () => {
            window.removeEventListener('SpaceSettingsChanged', handleSpaceSettingsChanged);
        };
    }, [spaceId]);

    // If we have an authenticated user, show sign out (only if showAuthButton is enabled)
    if (user && currentUser && !isGuestUser(currentUser)) {
        if (!showAuthButton) {
            return null;
        }
        return (
            <div>
                <SignOut />
            </div>
        );
    }
    
    // If we have a guest user, show sign in to upgrade (unless hidden by admin)
    if (currentUser && isGuestUser(currentUser)) {
        
        
        // If admin has chosen to hide the sign-in button for guests, return nothing
        if (hideGuestSignInButton) {
            
            return null;
        }
        
        
        return (
            <div>
                <SignIn 
                    mode="button" 
                    label="Sign In" 
                    buttonProps={{
                        bg: "black",
                        color: "white",
                        borderRadius: "lg",
                        _hover: { bg: "gray.800" },
                        _active: { bg: "gray.900" }
                    }}
                />
            </div>
        );
    }
    
    // If no user and guest access is enabled, don't show auth buttons
    if (allowGuestUsers) {
        return null;
    }
    
    // If no user and guest access is disabled, show auth buttons (only if showAuthButton is enabled)
    if (!showAuthButton) {
        return null;
    }
    
    return (
        <div>
            <Register />
            <SignIn />
        </div>
    );
}

export default AuthenticationButton;
