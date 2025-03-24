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

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const currentUserRef = useRef(null); // Initialize ref with null

    const [loading, setLoading] = useState(true);
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
            // Generate nickname from first name and first letter of last name
            const { firstName, lastName } = additionalData;
            const Nickname = `${firstName}${lastName.charAt(0).toUpperCase()}`;

            // Add default RPM URL and ensure groups field is included in the registration data
            const registrationData = {
                ...additionalData,
                Nickname,
                rpmURL: "https://models.readyplayer.me/67c8408d38f7924e15a8bd0a.glb",
                groups: ['users'] // Ensure the user is added to the 'users' group
            };

            // Register the user with the updated data
            const userData = await registerUser(email, password, registrationData);
            
            // Create a full user object with display name
            const displayName = getDisplayName(registrationData);
            const fullUserDetails = {
                uid: userData.uid,
                email: userData.email,
                ...registrationData,
                displayName
            };
            
            // Update the user state
            setUser(fullUserDetails);
            currentUserRef.current = fullUserDetails;
            
            Logger.log('UserProvider: User registered successfully with groups:', registrationData.groups);
            return fullUserDetails;
        } catch (error) {
            Logger.error("UserProvider: Error creating user:", error);
            throw error;
        }
    };

    const signIn = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            
            // Check if email is verified
            if (!userCredential.user.emailVerified) {
                // Send another verification email if needed
                await sendEmailVerification(userCredential.user);
                Logger.log('UserProvider: Verification email sent again to:', email);
                throw new Error('Please verify your email before signing in. A new verification email has been sent.');
            }
            
            const userProfile = await getUserProfileData(userCredential.user.uid);
            const displayName = getDisplayName(userProfile);
            const fullUserDetails = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                emailVerified: userCredential.user.emailVerified,
                ...userProfile,
                displayName
            };
            setUser(fullUserDetails);
            sendUserToUnity(fullUserDetails);
        } catch (error) {
            Logger.error("UserProvider: Error signing in:", error);
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

    return (
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
        }}>
            {children}
        </UserContext.Provider>
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
