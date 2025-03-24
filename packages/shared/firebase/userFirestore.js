import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

// Function to get complete user profile data based on user ID
const getUserProfileData = async (userID) => {
    try {
        Logger.log("userFirestore: Get user Profile data for user ID: " + userID);
        const userDocRef = doc(db, 'users', userID);
        const userDocSnapshot = await getDoc(userDocRef);

        if (userDocSnapshot.exists()) {
            Logger.log("userFirestore: Found Profile for : " + userDocSnapshot.data().Nickname);
            return userDocSnapshot.data(); // Return the complete user document data
        } else {
            Logger.error('userFirestore: user profile document not found');
            return null;
        }
    } catch (error) {
        Logger.error('userFirestore: Error fetching user profile data:', error);
        throw error;
    }
};

// Function to register a new user and store additional profile data
const registerUser = async (email, password, additionalData) => {
    try {
        Logger.log('userFirestore: Registering new user with email:', email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Send email verification
        await sendEmailVerification(user);
        Logger.log('userFirestore: Verification email sent to:', email);

        // Add default groups array with 'users' group
        const userData = { 
            email: user.email, 
            createdAt: new Date(), 
            groups: ['users'], // Add default 'users' group
            emailVerified: false, // Set to false to properly track verification status
            ...additionalData 
        };

        Logger.log('userFirestore: Creating user document with data:', userData);
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, userData);

        Logger.log('userFirestore: User created successfully with groups:', userData.groups);
        return { ...user, ...userData }; // Return the user object with additional data
    } catch (error) {
        Logger.error("userFirestore: Error creating user:", error);
        throw error;
    }
};

// Add new function for real-time RPM URL updates
const onUserRpmUrlChange = (userId, callback) => {
    try {
        Logger.log(`userFirestore: Setting up RPM URL listener for user ID: ${userId}`);
        const userDocRef = doc(db, 'users', userId);
        
        // Set up real-time listener
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                if (userData.rpmURL) {
                    Logger.log('userFirestore: RPM URL updated');
                    callback(userData.rpmURL);
                }
            }
        }, (error) => {
            Logger.error('userFirestore: Error in RPM URL listener:', error);
        });

        return unsubscribe;
    } catch (error) {
        Logger.error('userFirestore: Error setting up RPM URL listener:', error);
        throw error;
    }
};

// Update the existing updateRpmUrlInFirestore function to trigger a refresh
const updateRpmUrlInFirestore = async (userId, newRpmUrl) => {
    try {
        Logger.log(`userFirestore: Updating rpmURL for user ID: ${userId}`);
        const userDocRef = doc(db, 'users', userId);

        // Perform the update with the new rpmURL
        await updateDoc(userDocRef, { 
            rpmURL: newRpmUrl,
            lastUpdated: new Date().toISOString() // Add timestamp to force refresh
        });

        Logger.log('userFirestore: rpmURL updated successfully.');
    } catch (error) {
        Logger.error('userFirestore: Error updating rpmURL:', error);
        throw error;
    }
};

// Add a function to check if a user belongs to a specific group
const userBelongsToGroup = async (userId, groupName) => {
    try {
        const userProfile = await getUserProfileData(userId);
        if (userProfile && userProfile.groups) {
            return userProfile.groups.includes(groupName);
        }
        return false;
    } catch (error) {
        Logger.error('userFirestore: Error checking group membership:', error);
        return false;
    }
};

// Add a function to add a user to a group
const addUserToGroup = async (userId, groupName) => {
    try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const groups = userData.groups || [];
            
            // Only add the group if the user isn't already in it
            if (!groups.includes(groupName)) {
                const updatedGroups = [...groups, groupName];
                await updateDoc(userRef, { groups: updatedGroups });
                Logger.log(`userFirestore: Added user ${userId} to group ${groupName}`);
                return true;
            }
            
            Logger.log(`userFirestore: User ${userId} is already in group ${groupName}`);
            return false;
        }
        
        Logger.error(`userFirestore: User ${userId} not found`);
        return false;
    } catch (error) {
        Logger.error('userFirestore: Error adding user to group:', error);
        throw error;
    }
};

export { 
    getUserProfileData, 
    registerUser, 
    updateRpmUrlInFirestore,
    onUserRpmUrlChange,
    userBelongsToGroup,
    addUserToGroup
};












// const updateUserInFirestore = async (uid, dataToUpdate) => {
// const userRef = doc(db, "users", uid);
// try {
//     // Construct an object with the fields to update
//     const updateData = {};

//     // Add fields to update to the updateData object
//     for (const field in dataToUpdate) {
//         if (dataToUpdate.hasOwnProperty(field) && userFields.includes(field)) {
//             updateData[field] = dataToUpdate[field];
//         }
//     }

//     // Perform the update with the updateData object
//     await updateDoc(userRef, updateData);

//     return true;
// } catch (error) {
//     throw error;
// }
// };


// const userCanAccessSpace = async (userID, spaceId) => {
// try {
//     const userProfile = await getUserProfileData(userID);
//     if (userProfile && userProfile.spacesAllowed) {
//         return userProfile.spacesAllowed.includes(spaceId);
//     }
//     return false;
// } catch (error) {
//     Logger.error('userFirestore: Error checking access permission:', error);
//     throw error;
// }
// };


// const userCanAdminSpace = async (userID, spaceId) => {
// try {
//     const userProfile = await getUserProfileData(userID);
//     if (userProfile && userProfile.spacesAdmin) {
//         return userProfile.spacesAdmin.includes(spaceId);
//     }
//     return false;
// } catch (error) {
//     Logger.error('userFirestore: Error checking admin permission:', error);
//     throw error;
// }
// };


// const userCanModerateSpace = async (userID, spaceId) => {
// try {
//     const userProfile = await getUserProfileData(userID);
//     if (userProfile && userProfile.spacesModerator) {
//         return userProfile.spacesModerator.includes(spaceId);
//     }
//     return false;
// } catch (error) {
//     Logger.error('userFirestore: Error checking moderator permission:', error);
//     throw error;
// }
// };
// export { getUserProfileData, updateUserInFirestore, userCanAccessSpace, userCanAdminSpace, userCanModerateSpace };


