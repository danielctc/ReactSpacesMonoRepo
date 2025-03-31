import { doc, getDoc, setDoc, updateDoc, onSnapshot, writeBatch, query, collection, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

// Function to generate a username from first and last name with random numbers
const generateUsername = (firstName, lastName) => {
    // Remove spaces, special chars, and convert to lowercase
    const baseUsername = (firstName + lastName.charAt(0))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    
    // Trim if longer than 11 chars to leave room for 4 random digits
    const trimmedBase = baseUsername.substring(0, 11);
    
    // Add 4 random digits
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    
    return trimmedBase + randomDigits;
};

// Function to check if a username is already taken
const isUsernameTaken = async (username) => {
    try {
        // Validate input first
        if (!username || typeof username !== 'string' || username.trim() === '') {
            Logger.error('userFirestore: Invalid username provided to isUsernameTaken');
            return true; // Treat empty or invalid usernames as taken to prevent registration
        }
        
        // Normalize the username to ensure consistent comparisons
        const normalizedUsername = username.toLowerCase().trim();
        
        Logger.log(`userFirestore: Checking if username "${normalizedUsername}" is taken`);
        
        // Use a list operation instead of a where query since that's what our Firestore rules allow
        // This fetches all usernames (limited to 100) and then filters on the client side
        const usersRef = collection(db, 'users');
        const listQuery = query(usersRef, limit(100));
        
        const querySnapshot = await getDocs(listQuery);
        
        // Check if any document has the matching username
        let isTaken = false;
        querySnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.username && userData.username.toLowerCase() === normalizedUsername) {
                isTaken = true;
            }
        });
        
        Logger.log(`userFirestore: Username "${normalizedUsername}" is ${isTaken ? 'taken' : 'available'}`);
        return isTaken;
    } catch (error) {
        Logger.error('userFirestore: Error checking username availability:', error);
        // Error on the safe side - assume username is taken if there's an error
        return true;
    }
};

// Function to generate a unique username
const generateUniqueUsername = async (firstName, lastName) => {
    let username = generateUsername(firstName, lastName);
    let attempts = 0;
    const maxAttempts = 5;
    
    // Keep trying until we find an available username or hit max attempts
    while (attempts < maxAttempts) {
        const isTaken = await isUsernameTaken(username);
        if (!isTaken) {
            return username;
        }
        
        // Generate a new username with different random digits
        username = generateUsername(firstName, lastName);
        attempts++;
    }
    
    // If we couldn't find a username after several attempts, add more random chars
    return username + Math.floor(Math.random() * 100);
};

// Function to get PUBLIC user profile data based on user ID
const getUserProfileData = async (userID) => {
    try {
        Logger.log("userFirestore: Get user PUBLIC profile data for user ID: " + userID);
        const userDocRef = doc(db, 'users', userID);
        const userDocSnapshot = await getDoc(userDocRef);

        if (userDocSnapshot.exists()) {
            const publicData = userDocSnapshot.data();
            Logger.log("userFirestore: Found PUBLIC Profile for : " + publicData.Nickname);
            // Ensure email is NOT returned here if it somehow exists on the main doc
            delete publicData.email; 
            delete publicData.emailVerified;
            return publicData; 
        } else {
            Logger.error('userFirestore: user profile document not found');
            return null;
        }
    } catch (error) {
        Logger.error('userFirestore: Error fetching user public profile data:', error);
        throw error;
    }
};

// Function to register a new user and store profile data (public and private)
const registerUser = async (email, password, additionalData) => {
    try {
        console.log('userFirestore: Starting registerUser with additionalData:', JSON.stringify(additionalData));
        console.log('userFirestore: Fields in additionalData:', Object.keys(additionalData).join(', '));
        
        // Ensure we have valid additionalData
        if (!additionalData) {
            console.error('userFirestore: additionalData is null or undefined');
            throw new Error('Registration data is missing');
        }
        
        // IMPORTANT: Capture all field values before user creation
        const capturedData = {
            firstName: additionalData.firstName || "",
            lastName: additionalData.lastName || "",
            companyName: additionalData.companyName || "",
            linkedInProfile: additionalData.linkedInProfile || "",
            username: additionalData.username || "",
            Nickname: additionalData.Nickname || "",
            rpmURL: additionalData.rpmURL || "https://models.readyplayer.me/67c8408d38f7924e15a8bd0a.glb",
        };
        
        console.log('userFirestore: Captured critical values:');
        console.log('- firstName:', capturedData.firstName);
        console.log('- lastName:', capturedData.lastName);
        console.log('- Nickname:', capturedData.Nickname);
        console.log('- username:', capturedData.username);
        console.log('- companyName:', capturedData.companyName);
        
        // First step - create the Firebase Auth user
        Logger.log('userFirestore: Creating user auth record');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send email verification
        await sendEmailVerification(user);
        Logger.log('userFirestore: Verification email sent to:', email);
        
        // Wait a moment to give the Cloud Function time to create the document
        Logger.log('userFirestore: Waiting for Cloud Function to create initial document...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get the document that was created by the Cloud Function
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // Document doesn't exist - the Cloud Function failed
            Logger.error('userFirestore: Cloud Function failed to create user document, creating manually');
            
            // Create a fallback document
            await setDoc(userRef, {
                ...capturedData,
                id: user.uid,
                groups: ['users'],
                createdAt: new Date(),
                lastUpdated: new Date()
            });
            
            // Create private data
            const privateRef = doc(db, "users", user.uid, "private", "data");
            await setDoc(privateRef, {
                email: user.email,
                emailVerified: false
            });
        } else {
            // Document exists - update it with our captured data
            Logger.log('userFirestore: Found document created by Cloud Function, updating with missing fields');
            
            const existingData = userDoc.data();
            const fieldsToUpdate = {};
            
            // Check each field and only update if empty or missing
            if (!existingData.firstName) fieldsToUpdate.firstName = capturedData.firstName;
            if (!existingData.lastName) fieldsToUpdate.lastName = capturedData.lastName;
            if (!existingData.Nickname) fieldsToUpdate.Nickname = capturedData.Nickname;
            if (!existingData.username) fieldsToUpdate.username = capturedData.username;
            if (!existingData.companyName) fieldsToUpdate.companyName = capturedData.companyName;
            if (!existingData.linkedInProfile) fieldsToUpdate.linkedInProfile = capturedData.linkedInProfile;
            if (!existingData.rpmURL) fieldsToUpdate.rpmURL = capturedData.rpmURL;
            
            // Only update if there are fields to update
            if (Object.keys(fieldsToUpdate).length > 0) {
                Logger.log('userFirestore: Updating document with fields:', Object.keys(fieldsToUpdate).join(', '));
                console.log('userFirestore: Field values being updated:', fieldsToUpdate);
                
                // Force update with our captured data
                await updateDoc(userRef, {
                    ...fieldsToUpdate,
                    lastUpdated: new Date()
                });
            }
        }
        
        // Fetch the final document to ensure we have all fields
        const finalDoc = await getDoc(userRef);
        if (!finalDoc.exists()) {
            throw new Error('User document does not exist even after creation attempts');
        }
        
        // Get the document data
        let userData = finalDoc.data();
        
        // One last verification to ensure critical fields exist
        if (!userData.firstName) userData.firstName = capturedData.firstName;
        if (!userData.lastName) userData.lastName = capturedData.lastName;
        if (!userData.Nickname) userData.Nickname = capturedData.Nickname;
        if (!userData.username) userData.username = capturedData.username;
        if (!userData.companyName) userData.companyName = capturedData.companyName;
        
        // Check for missing fields in the document and update if needed
        let docNeedsUpdate = false;
        let updateData = {};
        
        // Add fields that should be present
        for (const field in capturedData) {
            if (!userData[field] || userData[field] === '') {
                updateData[field] = capturedData[field];
                docNeedsUpdate = true;
            }
        }
        
        // Ensure user is in the 'users' group
        if (!userData.groups || !userData.groups.includes('users')) {
            updateData.groups = userData.groups ? [...userData.groups, 'users'] : ['users'];
            docNeedsUpdate = true;
            Logger.log('userFirestore: Adding user to users group');
        }
        
        // Update the document if needed with the missing fields
        if (docNeedsUpdate) {
            Logger.log('userFirestore: Updating user document with missing fields');
            console.log('userFirestore: Fields being updated:', Object.keys(updateData).join(', '));
            await updateDoc(userRef, updateData);
            
            // Refresh the user data after update
            userData = (await getDoc(userRef)).data();
        }
        
        // Return the complete user data
        const returnData = {
            ...user,
            ...userData,
            // Force these fields to ensure they're included
            firstName: capturedData.firstName,
            lastName: capturedData.lastName,
            Nickname: capturedData.Nickname,
            username: capturedData.username,
            companyName: capturedData.companyName,
            linkedInProfile: capturedData.linkedInProfile
        };
        
        Logger.log('userFirestore: Registration complete, returning user data');
        console.log('userFirestore: Final fields in returnData:', Object.keys(returnData).join(', '));
        console.log('userFirestore: Final values:');
        console.log('- firstName:', returnData.firstName);
        console.log('- lastName:', returnData.lastName);
        console.log('- Nickname:', returnData.Nickname);
        console.log('- username:', returnData.username);
        console.log('- companyName:', returnData.companyName);
        
        return returnData;
    } catch (error) {
        Logger.error("userFirestore: Error creating user:", error);
        throw error;
    }
};

// --- NEW FUNCTION to get private user data ---
const getUserPrivateData = async (userId) => {
    if (!userId) {
        Logger.warn('userFirestore: Cannot get private data without userId');
        return null;
    }
    try {
        Logger.log(`userFirestore: Getting private data for user ID: ${userId}`);
        const privateDocRef = doc(db, 'users', userId, 'private', 'data');
        const privateDocSnapshot = await getDoc(privateDocRef);

        if (privateDocSnapshot.exists()) {
            Logger.log(`userFirestore: Found private data for user ${userId}`);
            return privateDocSnapshot.data();
        } else {
            // It's possible the private doc doesn't exist if registration failed midway or for old users before migration
            Logger.warn(`userFirestore: Private data document not found for user ${userId}`);
            return null; 
        }
    } catch (error) {
        // Rules will likely throw permission denied for unauthorized access
        Logger.error(`userFirestore: Error fetching user private data for ${userId}:`, error);
        // Don't throw here, return null as the data isn't accessible or doesn't exist
        return null; 
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
const addUserToGroup = async (userId, groupName, callerUserId) => {
    try {
        // SECURITY CHECK: Verify the caller has permission to add users to groups
        // If no callerUserId is provided, use the current authenticated user
        if (!callerUserId) {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                Logger.error('userFirestore: Cannot add user to group - no authenticated user');
                throw new Error('Authentication required to modify group membership');
            }
            callerUserId = currentUser.uid;
        }
        
        // Always allow adding a user to the 'users' basic group
        const isBasicGroup = groupName === 'users';
        
        // Check if this is a privileged group (admin groups or space-specific groups)
        const isPrivilegedGroup = 
            groupName === 'disruptiveAdmin' || 
            groupName.startsWith('space_') || 
            groupName.includes('admin') || 
            groupName.includes('moderator');

        // If adding to a privileged group, verify caller is an admin
        if (isPrivilegedGroup) {
            const isCallerAdmin = await userBelongsToGroup(callerUserId, 'disruptiveAdmin');
            if (!isCallerAdmin) {
                Logger.error(`userFirestore: User ${callerUserId} attempted to add user ${userId} to privileged group ${groupName} without admin permission`);
                throw new Error('Admin privileges required to add users to privileged groups');
            }
        }
        
        // If the caller is not the target user and not adding to a basic group, require admin
        if (callerUserId !== userId && !isBasicGroup) {
            const isCallerAdmin = await userBelongsToGroup(callerUserId, 'disruptiveAdmin');
            if (!isCallerAdmin) {
                Logger.error(`userFirestore: User ${callerUserId} attempted to modify groups for another user ${userId} without admin permission`);
                throw new Error('Admin privileges required to modify groups for other users');
            }
        }

        Logger.log(`userFirestore: User ${callerUserId} authorized to add user ${userId} to group ${groupName}`);
        
        // Proceed with adding the user to the group
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

// Add a function to update a user's username
const updateUsername = async (userId, newUsername) => {
    try {
        Logger.log(`userFirestore: Updating username for user ${userId} to ${newUsername}`);
        
        // Simple validation
        if (!newUsername || newUsername.trim() === '') {
            Logger.error('userFirestore: Cannot update to empty username');
            throw new Error('Username cannot be empty');
        }
        
        // Validate username format
        if (!/^[a-z0-9]{1,15}$/.test(newUsername)) {
            Logger.error('userFirestore: Invalid username format');
            throw new Error('Username must be 1-15 characters, lowercase letters and numbers only');
        }
        
        // Get current user data to verify changes
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            Logger.error(`userFirestore: User ${userId} not found when updating username`);
            throw new Error('User not found');
        }
        
        const userData = userDoc.data();
        
        // If username is the same, no need to update
        if (userData.username === newUsername) {
            Logger.log(`userFirestore: Username is already set to ${newUsername}, no update needed`);
            return true;
        }
        
        // Check if username is taken first (double check even if UI already checked)
        const isTaken = await isUsernameTaken(newUsername);
        if (isTaken) {
            Logger.error(`userFirestore: Username ${newUsername} is already taken`);
            throw new Error('Username is already taken');
        }
        
        // Perform the update
        await updateDoc(userRef, { 
            username: newUsername,
            lastUpdated: new Date().toISOString()
        });
        
        // Verify the update was successful
        const updatedDoc = await getDoc(userRef);
        if (updatedDoc.exists()) {
            const updatedData = updatedDoc.data();
            if (updatedData.username === newUsername) {
                Logger.log(`userFirestore: Username successfully updated to ${newUsername} for user ${userId}`);
                return true;
            } else {
                Logger.error(`userFirestore: Username verification failed after update for ${userId}`);
                throw new Error('Username update verification failed');
            }
        } else {
            Logger.error(`userFirestore: User document not found after username update for ${userId}`);
            throw new Error('User document not found after update');
        }
    } catch (error) {
        Logger.error('userFirestore: Error updating username:', error);
        throw error;
    }
};

export { 
    getUserProfileData, 
    getUserPrivateData,
    registerUser, 
    updateRpmUrlInFirestore,
    onUserRpmUrlChange,
    userBelongsToGroup,
    addUserToGroup,
    updateUsername,
    isUsernameTaken,
    generateUniqueUsername
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


