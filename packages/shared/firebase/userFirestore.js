import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { email: user.email, createdAt: new Date(), ...additionalData });

        Logger.log('userFirestore: User created successfully.');
        return user; // Return the user object if needed
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

export { 
    getUserProfileData, 
    registerUser, 
    updateRpmUrlInFirestore,
    onUserRpmUrlChange // Export the new function
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


