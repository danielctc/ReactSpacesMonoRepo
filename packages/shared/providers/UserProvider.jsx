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

export const UserContext = createContext(null);
export const RegistrationContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const currentUserRef = useRef(null); // Initialize ref with null
    const [loading, setLoading] = useState(true);
    const [registrationInProgress, setRegistrationInProgress] = useState(false);
    const auth = getAuth();

    const getDisplayName = (userProfile) => {
        if (!userProfile) return "Anon";
        if (userProfile.Nickname) {
            return userProfile.Nickname;
        }
        return `${userProfile.firstName} ${userProfile.lastName}`;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            Logger.log('UserProvider: Firebase onAuthStateChanged() fired');
            if (authUser) {
                try {
                    const userProfile = await getUserProfileData(authUser.uid);
                    const displayName = getDisplayName(userProfile);
                    const fullUserDetails = {
                        uid: authUser.uid,
                        email: authUser.email,
                        emailVerified: authUser.emailVerified,
                        ...userProfile,
                        displayName
                    };
                    // Sensitive user details should not be logged
                    Logger.log(`UserProvider: User authenticated: ${authUser.uid}`);
                    setUser(fullUserDetails);
                    currentUserRef.current = fullUserDetails;
                    sendUserToUnity(fullUserDetails);
                } catch (error) {
                    Logger.error('UserProvider: Error fetching user profile data:', error);
                }
            } else {
                setUser(null);
                currentUserRef.current = null;
            }
            setLoading(false);
        });

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
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
            Logger.log('UserProvider: User signed in successfully:', authUser.email);
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

    const sendUserToUnity = () => {
        const currentUser = currentUserRef.current;
        if (currentUser) {
            const filteredUser = filterUserPropertiesForUnity(currentUser);
            Logger.log("UserProvider: sendUserToUnity() using the eventBus", filteredUser);
            eventBus.publish(EventNames.sendUserToUnity, filteredUser);
        } else {
            Logger.log("UserProvider: No current user to send to Unity.");
        }
    };

    const filterUserPropertiesForUnity = (userObject) => {
        const filteredUser = {};
        // Add uid to the list of properties to send
        const propertiesForUnity = [...userProperties, 'uid'];
        
        propertiesForUnity.forEach(field => {
            if (userObject.hasOwnProperty(field)) {
                filteredUser[field] = userObject[field];
            }
        });
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
                Logger.log('UserProvider: Verification email resent to:', currentUser.email);
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

    return (
        <RegistrationContext.Provider value={{ registrationInProgress }}>
            <UserContext.Provider value={{
                user,
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
