import React, { createContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore'; // Import onSnapshot for real-time updates
import { auth, db } from '@disruptive-spaces/shared/firebase/firebase'; // Ensure db is your Firestore instance
import { getUserProfileData, registerUser } from '@disruptive-spaces/shared/firebase/userFirestore';
import { userProperties } from '@disruptive-spaces/shared/firebase/userProperties';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

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
            const user = await registerUser(email, password, additionalData);
            console.log(additionalData);
            setUser(user);
            currentUserRef.current = user;
        } catch (error) {
            Logger.error("UserProvider: Error creating user:", error);
            throw error;
        }
    };

    const signIn = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userProfile = await getUserProfileData(userCredential.user.uid);
            const displayName = getDisplayName(userProfile);
            const fullUserDetails = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
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
        const currentUser = currentUserRef.current; // Correct reference to the current user
        if (currentUser) {
            const filteredUser = filterUserPropertiesForUnity(currentUser); // Correctly filters user properties
            Logger.log("UserProvider: sendUserToUnity() using the eventBus", filteredUser);
            eventBus.publish(EventNames.sendUserToUnity, filteredUser);
        } else {
            Logger.log("UserProvider: No current user to send to Unity.");
        }
    };

    const filterUserPropertiesForUnity = (userObject) => {
        const filteredUser = {};
        userProperties.forEach(field => {
            if (userObject.hasOwnProperty(field)) {
                filteredUser[field] = userObject[field];
            }
        });
        return filteredUser;
    };

    // Checks if the current user has access to a specific space
    const userHasAccessToSpace = async (spaceId) => {
        if (!user || !user.uid) return false; // Ensure there's a logged-in user

        try {
            const spaceData = await getSpaceItem(spaceId); // Fetch space data from Firestore
            // Check if user is allowed in the space, is an admin, or is a moderator
            return spaceData.usersAllowed.includes(user.uid) ||
                spaceData.userAdmin.includes(user.uid) ||
                spaceData.usersModerators.includes(user.uid);
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

    return (
        <UserContext.Provider value={{
            user,
            loading,
            register,
            signIn,
            signOut,
            sendUserToUnity,
            userHasAccessToSpace,
            userIsAdminOfSpace,
            userIsModeratorOfSpace,
        }}>
            {children}
        </UserContext.Provider>
    );
};
