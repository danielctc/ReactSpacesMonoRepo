import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { onAuthStateChanged, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore'; // Import onSnapshot for real-time updates
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
                    console.log(fullUserDetails);
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
            // Set registration in progress
            setRegistrationInProgress(true);
            
            console.log("UserProvider: Starting registration with additionalData:", JSON.stringify(additionalData));
            console.log("UserProvider: Fields in additionalData:", Object.keys(additionalData).join(', '));
            
            // Check if we received critical fields
            if (!additionalData) {
                throw new Error("Registration data is missing");
            }
            
            // Extract and verify captcha token
            const captchaToken = additionalData.captchaToken;
            if (!captchaToken) {
                throw new Error("CAPTCHA verification is required");
            }
            
            // Remove captchaToken from the data we pass to Firebase
            const { captchaToken: _, ...registrationData } = additionalData;
            
            // Log detailed field values for debugging
            console.log("UserProvider: Received field values:");
            console.log("- firstName:", registrationData.firstName);
            console.log("- lastName:", registrationData.lastName);
            console.log("- companyName:", registrationData.companyName);
            console.log("- linkedInProfile:", registrationData.linkedInProfile);
            console.log("- username:", registrationData.username);
            console.log("- Nickname:", registrationData.Nickname);
            
            // Generate nickname from first name and first letter of last name
            const firstName = registrationData.firstName || "";
            const lastName = registrationData.lastName || "";
            const defaultNickname = firstName && lastName 
                ? `${firstName}${lastName.charAt(0).toUpperCase()}`
                : "";
                
            console.log("UserProvider: Generated default Nickname:", defaultNickname);
            
            // Create the registration data
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
            
            console.log("UserProvider: Prepared registrationData:", JSON.stringify(registrationDataToSend));
            console.log("UserProvider: Fields in registrationData:", Object.keys(registrationDataToSend).join(', '));
            console.log("UserProvider: Critical values - firstName:", registrationDataToSend.firstName, 
                "lastName:", registrationDataToSend.lastName, "Nickname:", registrationDataToSend.Nickname);

            // Register the user with the updated data
            const userData = await registerUser(email, password, registrationDataToSend);
            console.log("UserProvider: Received userData from registerUser:", JSON.stringify(userData));
            
            // Verify received data
            console.log("UserProvider: Verifying returned user data:");
            console.log("- firstName:", userData.firstName || "MISSING");
            console.log("- lastName:", userData.lastName || "MISSING");
            console.log("- Nickname:", userData.Nickname || "MISSING");
            console.log("- username:", userData.username || "MISSING");
            console.log("- companyName:", userData.companyName || "MISSING");
            
            // Check for missing critical fields and use our original data if missing
            if (!userData.firstName) {
                console.warn("UserProvider: firstName is missing in returned data, using original value");
                userData.firstName = registrationDataToSend.firstName;
            }
            
            if (!userData.lastName) {
                console.warn("UserProvider: lastName is missing in returned data, using original value");
                userData.lastName = registrationDataToSend.lastName;
            }
            
            if (!userData.Nickname) {
                console.warn("UserProvider: Nickname is missing in returned data, using original value");
                userData.Nickname = registrationDataToSend.Nickname;
            }
            
            if (!userData.companyName) {
                console.warn("UserProvider: companyName is missing in returned data, using original value");
                userData.companyName = registrationDataToSend.companyName;
            }
            
            // Create a full user object with display name
            const displayName = getDisplayName(userData);
            const fullUserDetails = {
                uid: userData.uid,
                email: userData.email,
                ...userData,
                displayName
            };
            
            console.log("UserProvider: Created fullUserDetails:", JSON.stringify(fullUserDetails));
            
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
            Logger.error("UserProvider: Error creating user:", error);
            // Ensure registration state is reset even if there's an error
            setRegistrationInProgress(false);
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

    // Checks if the current user has access to a specific space
    const userHasAccessToSpace = async (spaceId) => {
        if (!user || !user.uid) return false; // Ensure there's a logged-in user

        try {
            const spaceData = await getSpaceItem(spaceId); // Fetch space data from Firestore
            
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
