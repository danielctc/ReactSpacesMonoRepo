import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { onAuthStateChanged, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore'; // Import onSnapshot for real-time updates
import { auth, db } from '@disruptive-spaces/shared/firebase/firebase'; // Ensure db is your Firestore instance
import { getUserProfileData, registerUser } from '@disruptive-spaces/shared/firebase/userFirestore';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import { userProperties } from '@disruptive-spaces/shared/firebase/userProperties';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { createGuestUser, isGuestUser } from '@disruptive-spaces/shared/utils/guestUserGenerator';
import { checkClientRateLimit } from '@disruptive-spaces/shared/utils/clientRateLimiter';

export const UserContext = createContext(null);
export const RegistrationContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const currentUserRef = useRef(null); // Initialize ref with null
    const [loading, setLoading] = useState(true);
    const [registrationInProgress, setRegistrationInProgress] = useState(false);
    const [guestUser, setGuestUser] = useState(null);
    const guestUserRef = useRef(null);
    const auth = getAuth();

    const getDisplayName = (userProfile) => {
        if (!userProfile) return "Anon";
        if (userProfile.Nickname) {
            return userProfile.Nickname;
        }
        return `${userProfile.firstName} ${userProfile.lastName}`;
    };

    // Function to check if guest users are allowed and create one if needed
    const checkAndCreateGuestUser = async () => {
        try {
            // Get current space ID from URL or other source
            const spaceId = getCurrentSpaceId();
            if (!spaceId) {
                Logger.log('UserProvider: No space ID found, skipping guest user creation');
                return;
            }

            // Check if we already have a guest user for this session
            if (guestUser && guestUser.guestSpaceId === spaceId) {
                Logger.log('UserProvider: Guest user already exists for this space');
                return;
            }

            // Client-side rate limiting: Prevent guest user spam
            const rateLimitCheck = checkClientRateLimit('guestUserCreate', spaceId);
            if (!rateLimitCheck.allowed) {
                Logger.warn('UserProvider: Guest user creation rate limited:', rateLimitCheck.message);
                console.warn(rateLimitCheck.message);
                return;
            }

            // STRICT: Check if space allows guest users - fail if we can't verify
            try {
                const spaceData = await getSpaceItem(spaceId);
                if (!spaceData) {
                    Logger.log('UserProvider: Space data not found, denying guest access');
                    return;
                }
                if (!spaceData.allowGuestUsers) {
                    Logger.log('UserProvider: Guest users explicitly not allowed for this space');
                    return;
                }
                Logger.log('UserProvider: Guest users confirmed allowed for space:', spaceId);
            } catch (permissionError) {
                Logger.log('UserProvider: Cannot verify space guest settings, denying guest access for security');
                return;
            }

            // Create new guest user
            const newGuestUser = createGuestUser(spaceId);
            setGuestUser(newGuestUser);
            guestUserRef.current = newGuestUser;
            
            Logger.log('UserProvider: Created guest user:', newGuestUser.username);
            
            // Send guest user to Unity
            sendUserToUnity(newGuestUser);
            
        } catch (error) {
            Logger.error('UserProvider: Error creating guest user:', error);
        }
    };

    // Helper function to get current space ID from DOM element or URL
    const getCurrentSpaceId = () => {
        try {
            // First, try to get space ID from webgl-root element (micro-frontend setup)
            const webglRoot = document.getElementById('webgl-root');
            if (webglRoot) {
                const spaceIdFromElement = webglRoot.getAttribute('data-space-id');
                if (spaceIdFromElement) {
                    Logger.log('UserProvider: Found space ID from webgl-root element:', spaceIdFromElement);
                    return spaceIdFromElement;
                }
            }
            
            // Fallback: try to get from URL (for other setups)
            const currentUrl = window.location.href;
            const path = window.location.pathname;
            const search = window.location.search;
            
            Logger.log('UserProvider: No space ID in DOM element, trying URL extraction');
            Logger.log('UserProvider: URL:', currentUrl);
            
            // Pattern: /w/spaceSlug or /embed/spaceSlug
            const spaceSlugMatch = path.match(/\/(w|embed)\/([^\/]+)/);
            if (spaceSlugMatch) {
                Logger.log('UserProvider: Found space ID from path pattern:', spaceSlugMatch[2]);
                return spaceSlugMatch[2];
            }
            
            // Pattern: direct space ID in URL params
            const urlParams = new URLSearchParams(search);
            const spaceId = urlParams.get('spaceId') || urlParams.get('space');
            if (spaceId) {
                Logger.log('UserProvider: Found space ID from URL params:', spaceId);
                return spaceId;
            }
            
            // For development/hosting environments, use a default
            if (currentUrl.includes('localhost') || currentUrl.includes('web.app') || currentUrl.includes('firebaseapp.com')) {
                Logger.log('UserProvider: Using default space ID for development/hosting');
                return 'SpacesMetaverse_SDK';
            }
            
            Logger.log('UserProvider: No space ID found');
            return null;
        } catch (error) {
            Logger.error('UserProvider: Error getting space ID:', error);
            return null;
        }
    };

    useEffect(() => {
        let isMounted = true;  // Track if component is still mounted
        
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            Logger.log('UserProvider: Firebase onAuthStateChanged() fired');
            
            if (authUser) {
                // Set user immediately with minimal data (don't wait for profile)
                const minimalUser = {
                    uid: authUser.uid,
                    email: authUser.email,
                    emailVerified: authUser.emailVerified,
                    displayName: authUser.email?.split('@')[0] || 'User'
                };
                
                if (isMounted) {
                    setUser(minimalUser);
                    currentUserRef.current = minimalUser;
                    setLoading(false);  // Set loading false immediately so space data can load
                }
                
                // Then fetch full profile in background (non-blocking)
                try {
                    const userProfile = await getUserProfileData(authUser.uid);
                    
                    if (!isMounted) return;
                    
                    const displayName = getDisplayName(userProfile);
                    const fullUserDetails = {
                        uid: authUser.uid,
                        email: authUser.email,
                        emailVerified: authUser.emailVerified,
                        ...userProfile,
                        displayName: displayName || minimalUser.displayName
                    };
                    
                    Logger.log(`UserProvider: User authenticated: ${authUser.uid}`);
                    setUser(fullUserDetails);
                    currentUserRef.current = fullUserDetails;
                    sendUserToUnity(fullUserDetails);
                } catch (error) {
                    Logger.warn('UserProvider: Profile fetch failed, using minimal user data:', error.message);
                    // Keep the minimal user we already set
                    if (isMounted) {
                        sendUserToUnity(minimalUser);
                    }
                }
            } else {
                // No authenticated user
                if (!isMounted) return;
                
                setUser(null);
                currentUserRef.current = null;
                setLoading(false);  // Set loading false immediately
                
                // Check if we should create a guest user (non-blocking)
                checkAndCreateGuestUser().catch(error => {
                    Logger.error('UserProvider: Error creating guest user:', error);
                });
            }
        });
        

        // ==================================================================================
        // OVERRIDE FUNCTIONALITY - EVENT LISTENER
        // ==================================================================================
        // Listen for Override settings changes from SpaceManageModal
        // When Override is toggled or URLs are updated, this automatically refreshes
        // the user data sent to Unity with the new Override settings
        // Event dispatched from: SpaceManageModal.jsx > handleOverrideToggle() and handleSaveOverrideSettings()
        // ==================================================================================
        const handleOverrideUpdate = (event) => {
            Logger.log('UserProvider: Override settings updated, refreshing user data for Unity');
            sendUserToUnity();
        };

        window.addEventListener('SpaceOverrideUpdated', handleOverrideUpdate);
        // ==================================================================================

        return () => {
            isMounted = false;  // Mark as unmounted
            if (unsubscribe) {
                unsubscribe();
            }
            window.removeEventListener('SpaceOverrideUpdated', handleOverrideUpdate);
        };
    }, []);

    const register = async (email, password, additionalData) => {
        try {
            setRegistrationInProgress(true);
            
            Logger.log("UserProvider: Starting registration process");
            Logger.log("UserProvider: Registration includes fields:", Object.keys(additionalData || {}).join(', '));

            // Create a sanitized registration data object
            const registrationData = { ...additionalData };
            
            // Security: Ensure critical fields exist but don't log their values
            const requiredFields = ['firstName', 'lastName', 'username', 'companyName', 'linkedInProfile'];
            const missingFields = requiredFields.filter(field => !registrationData[field]);
            
            if (missingFields.length > 0) {
                Logger.warn(`UserProvider: Registration missing fields: ${missingFields.join(', ')}`);
            }
            
            // Generate a default nickname if not provided
            const defaultNickname = registrationData.firstName && registrationData.lastName 
                ? `${registrationData.firstName}${registrationData.lastName.charAt(0).toUpperCase()}`
                : "";
                
            Logger.log("UserProvider: Generated default nickname for registration");

            const registrationDataToSend = {
                // Set defaults first
                firstName: "",
                lastName: "",
                companyName: "",
                linkedInProfile: "",
                username: "",
                Nickname: registrationData.Nickname || defaultNickname, // Use provided or generated
                groups: ['users'], // Ensure the user is added to the 'users' group
                rpmURL: "https://models.readyplayer.me/67c8408d38f7924e15a8bd0a.glb",
                // Then apply any remaining user data
                ...registrationData
            };
            
            Logger.log("UserProvider: Prepared registration data with fields:", Object.keys(registrationDataToSend).join(', '));

            // Register the user with the updated data
            const userData = await registerUser(email, password, registrationDataToSend);
            Logger.log("UserProvider: Registration successful, received user data");
            
            // Verify key fields exist in returned data
            const missingReturnedFields = requiredFields.filter(field => !userData[field]);
            if (missingReturnedFields.length > 0) {
                Logger.warn(`UserProvider: Returned user data missing fields: ${missingReturnedFields.join(', ')}`);
            }
            
            // Check for missing critical fields and use our original data if missing
            const fieldsToCheck = ['firstName', 'lastName', 'Nickname', 'username', 'companyName'];
            fieldsToCheck.forEach(field => {
                if (!userData[field]) {
                    Logger.warn(`UserProvider: ${field} is missing in returned data, using original value`);
                    userData[field] = registrationDataToSend[field];
                }
            });
            
            // Create a full user object for our app
            const fullUserDetails = {
                uid: userData.uid,
                email: userData.email,
                ...userData,
                displayName: getDisplayName(userData)
            };
            
            Logger.log("UserProvider: Created user object with fields:", Object.keys(fullUserDetails).join(', '));
            
            // Update the user state
            setUser(fullUserDetails);
            currentUserRef.current = fullUserDetails;
            
            Logger.log('UserProvider: User registered successfully with groups:', registrationDataToSend.groups);
            
            // Wait for a moment to ensure Firebase has fully processed everything
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Registration complete
            setRegistrationInProgress(false);
            return fullUserDetails;
        } catch (error) {
            setRegistrationInProgress(false);
            Logger.error("UserProvider: Error during registration:", error);
            throw error;
        }
    };

    const signIn = async (email, password, captchaToken) => {
        try {
            Logger.log('UserProvider: Signing in user');
            
            // Verify captchaToken is provided
            if (!captchaToken) {
                throw new Error("CAPTCHA verification is required");
            }
            
            // Here we could verify the captchaToken with a server-side API if needed
            // For now, we'll just proceed with the sign-in
            
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const authUser = userCredential.user;
            
            // We don't need to set user here as the onAuthStateChanged will handle that
            Logger.log('UserProvider: User signed in successfully:', authUser.uid);  // Log UID instead of email
            return authUser;
        } catch (error) {
            Logger.error('UserProvider: Error signing in:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            Logger.log('UserProvider: User signed out.');
        } catch (error) {
            Logger.error("UserProvider: Error signing out:", error);
            throw error;
        }
    };

    const sendUserToUnity = async (userToSend = null) => {
        // Use provided user or fall back to current authenticated user or guest user
        let targetUser = userToSend || currentUserRef.current || guestUserRef.current;
        
        // If no user exists and no specific user was provided, try to create a guest user
        if (!targetUser && !userToSend) {
            Logger.log("UserProvider: No user available, attempting to create guest user for Unity request");
            await checkAndCreateGuestUser();
            targetUser = guestUserRef.current;
        }
        
        if (targetUser) {
            const filteredUser = filterUserPropertiesForUnity(targetUser);
            
            // ==================================================================================
            // OVERRIDE FUNCTIONALITY - TEMPORARY RPM URL REPLACEMENT
            // ==================================================================================
            // This section checks if the current space has Override enabled and temporarily
            // replaces the user's RPM URL with one from the Override.customPlayers list.
            // This is a TEMPORARY change - the user's actual Firestore profile is NOT modified.
            // The override only applies while the user is in this specific space.
            // Configured in: SpaceManageModal.jsx > Custom Tab > Override Settings
            // Firebase path: spaces/{spaceId}/Override.enabled and Override.customPlayers
            // ==================================================================================
            try {
                const spaceId = getCurrentSpaceId();
                if (spaceId) {
                    const spaceData = await getSpaceItem(spaceId);
                    
                    if (spaceData && spaceData.Override && spaceData.Override.enabled === true) {
                        Logger.log("UserProvider: Override is enabled for space:", spaceId);
                        
                        // Check if there are custom player URLs
                        if (spaceData.Override.customPlayers && spaceData.Override.customPlayers.length > 0) {
                            // Get a random URL from the list (or implement your own logic)
                            const randomIndex = Math.floor(Math.random() * spaceData.Override.customPlayers.length);
                            const customPlayerUrl = spaceData.Override.customPlayers[randomIndex].url;
                            
                            if (customPlayerUrl) {
                                Logger.log("UserProvider: Applying Override RPM URL:", customPlayerUrl);
                                Logger.log("UserProvider: Original RPM URL was:", filteredUser.rpmURL);
                                
                                // Temporarily override the RPM URL (does NOT save to Firestore)
                                filteredUser.rpmURL = customPlayerUrl;
                            }
                        } else {
                            Logger.log("UserProvider: Override enabled but no custom player URLs configured");
                        }
                    }
                }
            } catch (overrideError) {
                Logger.error("UserProvider: Error checking Override settings, using original RPM URL:", overrideError);
                // Continue with original RPM URL if override check fails
            }
            // ==================================================================================
            // END OVERRIDE FUNCTIONALITY
            // ==================================================================================
            
            // Enhanced logging for debugging guest user data
            Logger.log("UserProvider: sendUserToUnity() - Raw user data:", {
                uid: targetUser.uid,
                username: targetUser.username,
                Nickname: targetUser.Nickname,
                displayName: targetUser.displayName,
                rpmURL: targetUser.rpmURL,
                isGuest: targetUser.isGuest || false
            });
            
            Logger.log("UserProvider: sendUserToUnity() - Filtered data being sent to Unity:", filteredUser);
            
            // Special check for guest users
            if (targetUser.isGuest) {
                Logger.log("UserProvider: GUEST USER - Verifying required fields:");
                Logger.log("UserProvider: GUEST - Nickname in filtered data:", filteredUser.Nickname);
                Logger.log("UserProvider: GUEST - rpmURL in filtered data:", filteredUser.rpmURL);
                Logger.log("UserProvider: GUEST - uid in filtered data:", filteredUser.uid);
                
                if (!filteredUser.Nickname || !filteredUser.rpmURL) {
                    Logger.error("UserProvider: GUEST USER MISSING REQUIRED FIELDS!");
                    Logger.error("UserProvider: Missing Nickname:", !filteredUser.Nickname);
                    Logger.error("UserProvider: Missing rpmURL:", !filteredUser.rpmURL);
                }
            }
            
            eventBus.publish(EventNames.sendUserToUnity, filteredUser);
        } else {
            Logger.log("UserProvider: No current user or guest user to send to Unity.");
        }
    };

    const filterUserPropertiesForUnity = (userObject) => {
        const filteredUser = {};
        // Add uid to the list of properties to send
        const propertiesForUnity = [...userProperties, 'uid'];
        
        Logger.log("UserProvider: Properties to send to Unity:", propertiesForUnity);
        Logger.log("UserProvider: Available properties in user object:", Object.keys(userObject));
        
        propertiesForUnity.forEach(field => {
            if (userObject.hasOwnProperty(field)) {
                filteredUser[field] = userObject[field];
                Logger.log(`UserProvider: Including field '${field}' with value:`, userObject[field]);
            } else {
                Logger.log(`UserProvider: Field '${field}' not found in user object`);
            }
        });
        
        Logger.log("UserProvider: Final filtered user object:", filteredUser);
        return filteredUser;
    };

    // Check if the current user belongs to a specific group
    const isUserInGroup = async (groupName) => {
        if (!user || !user.uid) return false;
        return await userBelongsToGroup(user.uid, groupName);
    };

    // Quick helper: check banned collection
    const isUserBannedFromSpace = async (spaceId) => {
        try {
            if (!user || !user.uid) return false;
            // quick check on user groups first
            if (user.groups && user.groups.includes(`space_${spaceId}_banned`)) {
                return true;
            }
            const bannedDoc = await getDoc(doc(db, `spaces/${spaceId}/BannedUsers`, user.uid));
            return bannedDoc.exists();
        } catch (e) {
            // If we get permission-denied we assume not banned
            if (e.code !== 'permission-denied') {
                Logger.error('UserProvider: isUserBannedFromSpace error:', e);
            }
            return false;
        }
    };

    // Checks if the current user has access to a specific space
    const userHasAccessToSpace = async (spaceId) => {
        if (!user || !user.uid) return false; // Ensure there's a logged-in user

        try {
            if (await isUserBannedFromSpace(spaceId)) {
                Logger.warn(`UserProvider: User ${user.uid} banned from ${spaceId}`);
                return false;
            }

            const spaceData = await getSpaceItem(spaceId); // Fetch space data
            
            // Check if user is allowed in the space, is an admin, or is a moderator
            const hasDirectAccess = spaceData.usersAllowed.includes(user.uid) ||
                spaceData.userAdmin.includes(user.uid) ||
                spaceData.usersModerators.includes(user.uid);
                
            if (hasDirectAccess) {
                return true;
            }
            
            // Check if user is in a space-specific group (owner or host)
            if (user.groups && Array.isArray(user.groups)) {
                const ownerGroupId = `space_${spaceId}_owners`;
                const hostGroupId = `space_${spaceId}_hosts`;
                
                if (user.groups.includes(ownerGroupId) || user.groups.includes(hostGroupId)) {
                    Logger.log(`UserProvider: User ${user.uid} has access to space ${spaceId} as owner/host`);
                    return true;
                }
            }
            
            // Check if the space is accessible to all users and the user is in the 'users' group
            if (spaceData.accessibleToAllUsers === true && user.groups) {
                return user.groups.includes('users');
            }
            
            return false;
        } catch (error) {
            Logger.error('UserProvider: Error verifying user access to space:', error);
            return false;
        }
    };

    // Checks if the current user is an admin of a specific space
    const userIsAdminOfSpace = async (spaceId) => {
        if (!user || !user.uid) return false;

        try {
            const spaceData = await getSpaceItem(spaceId);
            return spaceData.userAdmin.includes(user.uid);
        } catch (error) {
            Logger.error('UserProvider: Error verifying user admin status for space:', error);
            return false;
        }
    };

    // Checks if the current user is a moderator of a specific space
    const userIsModeratorOfSpace = async (spaceId) => {
        if (!user || !user.uid) return false;

        try {
            const spaceData = await getSpaceItem(spaceId);
            return spaceData.usersModerators.includes(user.uid);
        } catch (error) {
            Logger.error('UserProvider: Error verifying user moderator status for space:', error);
            return false;
        }
    };

    const resendVerificationEmail = async () => {
        try {
            const currentUser = auth.currentUser;
            if (currentUser && !currentUser.emailVerified) {
                await sendEmailVerification(currentUser);
                Logger.log('UserProvider: Verification email resent to user:', currentUser.uid);  // Log UID instead of email
                return true;
            }
            return false;
        } catch (error) {
            Logger.error("UserProvider: Error resending verification email:", error);
            throw error;
        }
    };

    // Add an updateUser function to refresh user data from Firestore
    const updateUser = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                Logger.warn('UserProvider: updateUser called but no current user exists');
                return null;
            }

            Logger.log('UserProvider: Updating user data from Firestore');
            const userProfile = await getUserProfileData(currentUser.uid);
            
            if (!userProfile) {
                Logger.error('UserProvider: Failed to fetch updated user profile');
                return null;
            }
            
            const displayName = getDisplayName(userProfile);
            const fullUserDetails = {
                uid: currentUser.uid,
                email: currentUser.email,
                emailVerified: currentUser.emailVerified,
                ...userProfile,
                displayName
            };
            
            Logger.log('UserProvider: User data updated with fields:', Object.keys(fullUserDetails).join(', '));
            
            // Update state and ref
            setUser(fullUserDetails);
            currentUserRef.current = fullUserDetails;
            
            // Update Unity if needed
            sendUserToUnity(fullUserDetails);
            
            return fullUserDetails;
        } catch (error) {
            Logger.error('UserProvider: Error updating user data:', error);
            throw error;
        }
    };

    // Function to get the current active user (authenticated or guest)
    const getCurrentUser = () => {
        return user || guestUser;
    };

    // Function to create a guest user manually (for testing or special cases)
    const createManualGuestUser = async (spaceId) => {
        try {
            const newGuestUser = createGuestUser(spaceId);
            setGuestUser(newGuestUser);
            guestUserRef.current = newGuestUser;
            sendUserToUnity(newGuestUser);
            return newGuestUser;
        } catch (error) {
            Logger.error('UserProvider: Error creating manual guest user:', error);
            throw error;
        }
    };

    // Function to clear guest user
    const clearGuestUser = () => {
        setGuestUser(null);
        guestUserRef.current = null;
        Logger.log('UserProvider: Guest user cleared');
    };

    return (
        <RegistrationContext.Provider value={{ registrationInProgress }}>
            <UserContext.Provider value={{
                user,
                guestUser,
                currentUser: getCurrentUser(),
                loading,
                register,
                signIn,
                signOut,
                sendUserToUnity,
                isUserInGroup,
                userHasAccessToSpace,
                userIsAdminOfSpace,
                userIsModeratorOfSpace,
                resendVerificationEmail,
                updateUser,
                isUserBannedFromSpace,
                createGuestUser: createManualGuestUser,
                clearGuestUser,
                isGuestUser: (userObj) => isGuestUser(userObj || getCurrentUser()),
            }}>
                {children}
            </UserContext.Provider>
        </RegistrationContext.Provider>
    );
};

// Add a custom hook for using the user context
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

// Add a custom hook for using the registration context
export const useRegistration = () => {
    const context = useContext(RegistrationContext);
    if (context === undefined) {
        throw new Error('useRegistration must be used within a UserProvider');
    }
    return context;
};
