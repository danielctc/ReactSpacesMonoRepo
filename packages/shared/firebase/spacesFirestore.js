import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, setDoc } from 'firebase/firestore';

import { getStorage, ref, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';

import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { fetchHttpUrlFromGsUrl } from '@disruptive-spaces/shared/firebase/firebaseStorage';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';






let cachedSpaces = {}; // Initialize an empty object to store cached spaces
export const getSpaceItem = async (itemId) => {
    try {
        // Check if the space is already cached
        // if (cachedSpaces[itemId]) {
        //     Logger.log('spacesFirestore: Found cached space:', itemId);
        //     return cachedSpaces[itemId];
        // }

        const itemDocRef = doc(db, 'spaces', itemId); // Reference to the specific document in the 'spaces' collection
        const itemDocSnapshot = await getDoc(itemDocRef); // Attempt to fetch the document

        if (itemDocSnapshot.exists()) {
            // Get the complete item document data
            let itemData = itemDocSnapshot.data();

            // Save the space's original name and description
            const spaceName = itemData.name;
            const spaceDescription = itemData.description;

            // Check if itemData has a webglBuildId
            if (itemData.webglBuildId) {
                const webglBuildDocRef = doc(db, 'webglBuilds', itemData.webglBuildId);
                const webglBuildDocSnapshot = await getDoc(webglBuildDocRef);

                if (webglBuildDocSnapshot.exists()) {
                    const webglBuildData = webglBuildDocSnapshot.data();

                    // Merge webglBuildData into itemData
                    itemData = {
                        ...itemData,
                        ...webglBuildData,
                        // Restore the space's original name and description, ensuring they take precedence
                        name: spaceName || webglBuildData.name,
                        description: spaceDescription || webglBuildData.description
                    };
                } else {
                    Logger.warn(`spacesFirestore: No document found for webglBuildId: ${itemData.webglBuildId}`);
                }
            }


            // Convert gs:// links to URLs
            itemData = await convertGsLinksToUrls(itemData);

            // map URL fields to the expected format \9was done to make firebase have fields prefixed with gsUrl, so they all show together in the document).
            itemData = mapWebGLUrlsFields(itemData);

            console.log("Space data:", itemData);
            // Cache the fetched space
            Logger.log(`spacesFirestore: Caching space data for: ${itemId}`);
            cachedSpaces[itemId] = itemData;

            return itemData;
        } else {
            // Item document doesn't exist, return null or handle accordingly
            Logger.warn(`spacesFirestore: No document found for item ID: ${itemId}`);
            return null;
        }
    } catch (error) {
        Logger.error('spacesFirestore: Error fetching item data:', error);
        throw error; // Rethrow the error to be handled by the caller
    }
};



const convertGsLinksToUrls = async (itemData) => {
    // List of itemData keys that contain gs:// URLs and need to be converted
    const keysToConvert = ['gsUrlCode', 'gsUrlData', 'gsUrlFramework', 'gsUrlLoader', 'gsUrlLoadingBackground'];

    // Create a series of promises that resolve to the converted URLs
    const conversionPromises = keysToConvert.map(async (key) => {
        const gsUrl = itemData[key];
        if (gsUrl && gsUrl.startsWith('gs://')) {
            // Use the utility function to fetch the HTTP URL and update the itemData object
            itemData[key] = await fetchHttpUrlFromGsUrl(gsUrl);
        }
    });

    // Wait for all the conversions to complete
    await Promise.all(conversionPromises);

    return itemData;
};


const mapWebGLUrlsFields = (itemData) => {
    const {
        gsUrlCode,
        gsUrlData,
        gsUrlFramework,
        gsUrlLoader,
        ...rest
    } = itemData;

    // Return the transformed object with mapped fields
    return {
        ...rest, // Keep the rest of the properties as they are
        codeUrl: gsUrlCode, // Remap gsUrlCode to codeUrl
        dataUrl: gsUrlData, // Remap gsUrlData to dataUrl
        frameworkUrl: gsUrlFramework, // Remap gsUrlFramework to frameworkUrl
        loaderUrl: gsUrlLoader // Remap gsUrlLoader to loaderUrl
    };
};


let cachedVideos = {}; // Initialize an empty object to store cached videos
export const getSpaceVideosFromFirestore = async (spaceId) => {
    Logger.log("spacesFirestore: Get Videos from Firestore for space: ", spaceId);
    try {
        // Check if videos are already cached
        if (cachedVideos[spaceId]) {
            Logger.log('spacesFirestore: Returning cached videos for space:', spaceId);
            return cachedVideos[spaceId];
        }

        const videosCollectionRef = collection(db, `spaces/${spaceId}/videos`);
        const videosQuerySnapshot = await getDocs(videosCollectionRef);

        const gameVideos = [];
        videosQuerySnapshot.forEach(doc => {
            gameVideos.push({ id: doc.id, ...doc.data() });
        });

        // Cache the fetched videos
        cachedVideos[spaceId] = gameVideos;


        return gameVideos;
    } catch (error) {
        Logger.error('spacesFirestore: Error fetching Space videos from Firestore:', error);
        throw error;
    }
};




export const userCanAccessSpace = async (spaceId, userID) => {
    try {
        // Check if the user is banned from this space first
        try {
            const bannedRef = doc(db, `spaces/${spaceId}/BannedUsers`, userID);
            const bannedSnap = await getDoc(bannedRef);
            if (bannedSnap.exists()) {
                Logger.warn(`spacesFirestore: Access denied – user ${userID} is banned from space ${spaceId}`);
                return false;
            }
        } catch (banErr) {
            // Even if this check fails we do not want to grant access implicitly,
            // so we will log the error but continue with the rest of the checks.
            Logger.error('spacesFirestore: Error checking bannedUsers collection:', banErr);
        }

        Logger.log(`spacesFirestore: Checking if user ${userID} can access space ${spaceId}`);
        const spaceRef = doc(db, "spaces", spaceId);
        const spaceSnap = await getDoc(spaceRef);
        if (spaceSnap.exists()) {
            const spaceData = spaceSnap.data();
            Logger.log(`spacesFirestore: Space data:`, {
                spaceId,
                isPublic: spaceData.isPublic,
                accessibleToAllUsers: spaceData.accessibleToAllUsers,
                usersAllowed: spaceData.usersAllowed,
                userAdmin: spaceData.userAdmin,
                usersModerators: spaceData.usersModerators
            });
            
            // Check if user is in the usersAllowed array or in any other role with access
            const hasDirectAccess = spaceData.usersAllowed.includes(userID) || 
                                   spaceData.userAdmin.includes(userID) || 
                                   spaceData.usersModerators.includes(userID);
            
            if (hasDirectAccess) {
                Logger.log(`spacesFirestore: User ${userID} has direct access to space ${spaceId}`);
                return true;
            }
            
            // Get the user's profile to check their groups
            const userRef = doc(db, "users", userID);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                Logger.log(`spacesFirestore: User data:`, {
                    userId: userID,
                    groups: userData.groups
                });
                
                // Check if user is in a space-specific group (owner or host)
                if (userData.groups && Array.isArray(userData.groups)) {
                    const ownerGroupId = `space_${spaceId}_owners`;
                    const hostGroupId = `space_${spaceId}_hosts`;
                    
                    if (userData.groups.includes(ownerGroupId) || userData.groups.includes(hostGroupId)) {
                        Logger.log(`spacesFirestore: User ${userID} has access to space ${spaceId} as owner/host`);
                        return true;
                    }
                }
                
                // If the space is accessible to all users, check if the user is in the 'users' group
                if (spaceData.accessibleToAllUsers === true) {
                    Logger.log(`spacesFirestore: Space ${spaceId} is accessible to all users`);
                    // Check if user is in the 'users' group
                    if (userData.groups && userData.groups.includes('users')) {
                        Logger.log(`spacesFirestore: User ${userID} has access to space ${spaceId} via 'users' group`);
                        return true;
                    } else {
                        Logger.warn(`spacesFirestore: User ${userID} is not in the 'users' group`);
                    }
                } else {
                    Logger.warn(`spacesFirestore: Space ${spaceId} is not accessible to all users`);
                }
            } else {
                Logger.warn(`spacesFirestore: User ${userID} profile not found`);
            }
            
            Logger.warn(`spacesFirestore: User ${userID} does not have access to space ${spaceId}`);
            return false;
        } else {
            Logger.warn(`spacesFirestore: Space ${spaceId} not found`);
            return false;
        }
    } catch (error) {
        Logger.error("spacesFirestore: Error checking user access to space:", error);
        return false;
    }
};



/**
 * Checks if a user is an admin of a space.
 * @param {string} spaceId - The ID of the space.
 * @param {string} userID - The ID of the user.
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
export const userCanAdminSpace = async (spaceId, userID) => {
    try {
        const spaceRef = doc(db, "spaces", spaceId);
        const spaceSnap = await getDoc(spaceRef);
        if (spaceSnap.exists()) {
            const spaceData = spaceSnap.data();
            // Check if user is in the userAdmin array
            return spaceData.userAdmin.includes(userID);
        } else {
            Logger.warn("No such space!");
            return false;
        }
    } catch (error) {
        Logger.error("Error fetching space from Firestore:", error);
        throw error;
    }
};



/**
* Checks if a user is a moderator of a space.
* @param {string} spaceId - The ID of the space.
* @param {string} userID - The ID of the user.
* @returns {Promise<boolean>} True if the user is a moderator, false otherwise.
*/
export const userCanModerateSpace = async (spaceId, userID) => {
    try {
        const spaceRef = doc(db, "spaces", spaceId);
        const spaceSnap = await getDoc(spaceRef);
        if (spaceSnap.exists()) {
            const spaceData = spaceSnap.data();
            // Check if user is in the usersModerators array
            return spaceData.usersModerators.includes(userID);
        } else {
            Logger.warn("No such space!");
            return false;
        }
    } catch (error) {
        console.error("Error fetching space from Firestore:", error);
        throw error;
    }
};

/**
 * Uploads a logo image for a space to Firebase Storage and updates the space document in Firestore
 * 
 * @param {string} spaceId - The ID of the space
 * @param {File} logoFile - The logo image file to upload
 * @returns {Promise<string>} - The download URL of the uploaded logo
 */
export const uploadSpaceLogo = async (spaceId, logoFile) => {
  try {
    // Validate parameters
    if (!spaceId || !logoFile) {
      throw new Error('Missing required parameters: spaceId and logoFile');
    }

    // Validate file type
    if (!logoFile.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Create a reference to Firebase Storage
    const storage = getStorage();
    const timestamp = Date.now();
    const fileExtension = logoFile.name.split('.').pop();
    const fileName = `logo_${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `spaces/${spaceId}/logo/${fileName}`);

    // Upload the file
    Logger.log(`Uploading logo for space ${spaceId}`);
    const snapshot = await uploadBytes(storageRef, logoFile);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Store the reference in Firestore
    const spaceRef = doc(db, 'spaces', spaceId);
    await updateDoc(spaceRef, {
      logoUrl: downloadURL,
      logoGsUrl: `gs://${snapshot.ref.bucket}/${snapshot.ref.fullPath}`,
      logoFileName: fileName,
      updatedAt: new Date().toISOString()
    });
    
    Logger.log(`Successfully uploaded logo for space ${spaceId}`);
    return downloadURL;
  } catch (error) {
    Logger.error('Error uploading space logo:', error);
    throw error;
  }
};

/**
 * Deletes the logo for a space from Firebase Storage and removes its reference from Firestore
 * 
 * @param {string} spaceId - The ID of the space
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export const deleteSpaceLogo = async (spaceId) => {
  try {
    // Get the space document to find the storage reference
    const spaceRef = doc(db, 'spaces', spaceId);
    const spaceSnap = await getDoc(spaceRef);
    
    if (!spaceSnap.exists()) {
      Logger.warn(`No space found with ID: ${spaceId}`);
      return false;
    }
    
    const spaceData = spaceSnap.data();
    
    // If there's a storage reference, delete the file
    if (spaceData.logoGsUrl) {
      const storage = getStorage();
      const fileRef = ref(storage, spaceData.logoGsUrl);
      
      try {
        await deleteObject(fileRef);
        Logger.log(`Deleted logo file from storage: ${spaceData.logoGsUrl}`);
      } catch (storageError) {
        // If the file doesn't exist, just log a warning
        Logger.warn(`Could not delete logo file from storage: ${storageError.message}`);
      }
    }
    
    // Update the Firestore document to remove logo references
    await updateDoc(spaceRef, {
      logoUrl: null,
      logoGsUrl: null,
      logoFileName: null,
      updatedAt: new Date().toISOString()
    });
    
    Logger.log(`Successfully removed logo for space ${spaceId}`);
    return true;
  } catch (error) {
    Logger.error('Error deleting space logo:', error);
    throw error;
  }
};

/**
 * Uploads a background image for a space to Firebase Storage and updates the space document in Firestore
 * 
 * @param {string} spaceId - The ID of the space
 * @param {File} backgroundFile - The background image file to upload
 * @returns {Promise<string>} - The download URL of the uploaded background
 */
export const uploadSpaceBackground = async (spaceId, backgroundFile) => {
  try {
    // Validate parameters
    if (!spaceId || !backgroundFile) {
      throw new Error('Missing required parameters: spaceId and backgroundFile');
    }

    // Validate file type
    if (!backgroundFile.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Create a reference to Firebase Storage
    const storage = getStorage();
    const timestamp = Date.now();
    const fileExtension = backgroundFile.name.split('.').pop();
    const fileName = `background_${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, `spaces/${spaceId}/background/${fileName}`);

    // Upload the file
    Logger.log(`Uploading background for space ${spaceId}`);
    const snapshot = await uploadBytes(storageRef, backgroundFile);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Store the reference in Firestore
    const spaceRef = doc(db, 'spaces', spaceId);
    await updateDoc(spaceRef, {
      backgroundUrl: downloadURL,
      backgroundGsUrl: `gs://${snapshot.ref.bucket}/${snapshot.ref.fullPath}`,
      backgroundFileName: fileName,
      gsUrlLoadingBackground: `gs://${snapshot.ref.bucket}/${snapshot.ref.fullPath}`, // For backward compatibility
      updatedAt: new Date().toISOString()
    });
    
    Logger.log(`Successfully uploaded background for space ${spaceId}`);
    return downloadURL;
  } catch (error) {
    Logger.error('Error uploading space background:', error);
    throw error;
  }
};

/**
 * Deletes the background for a space from Firebase Storage and removes its reference from Firestore
 * 
 * @param {string} spaceId - The ID of the space
 * @returns {Promise<boolean>} - True if deletion was successful
 */
export const deleteSpaceBackground = async (spaceId) => {
  try {
    // Get the space document to find the storage reference
    const spaceRef = doc(db, 'spaces', spaceId);
    const spaceSnap = await getDoc(spaceRef);
    
    if (!spaceSnap.exists()) {
      Logger.warn(`No space found with ID: ${spaceId}`);
      return false;
    }
    
    const spaceData = spaceSnap.data();
    
    // If there's a storage reference, delete the file
    if (spaceData.backgroundGsUrl) {
      const storage = getStorage();
      const fileRef = ref(storage, spaceData.backgroundGsUrl);
      
      try {
        await deleteObject(fileRef);
        Logger.log(`Deleted background file from storage: ${spaceData.backgroundGsUrl}`);
      } catch (storageError) {
        // If the file doesn't exist, just log a warning
        Logger.warn(`Could not delete background file from storage: ${storageError.message}`);
      }
    }
    
    // Update the Firestore document to remove background references
    await updateDoc(spaceRef, {
      backgroundUrl: null,
      backgroundGsUrl: null,
      backgroundFileName: null,
      gsUrlLoadingBackground: null, // For backward compatibility
      updatedAt: new Date().toISOString()
    });
    
    Logger.log(`Successfully removed background for space ${spaceId}`);
    return true;
  } catch (error) {
    Logger.error('Error deleting space background:', error);
    throw error;
  }
};

/**
 * Adds a user to the bannedUsers collection for a space.
 * @param {string} spaceId - The space ID.
 * @param {Object} bannedUserData - Data about the banned user (must include uid).
 * @returns {Promise<boolean>} True if the operation succeeds.
 */
export const addBannedUserToSpace = async (spaceId, bannedUserData) => {
  try {
    if (!spaceId || !bannedUserData || !bannedUserData.uid) {
      throw new Error('Missing required parameters');
    }

    const bannedRef = doc(db, `spaces/${spaceId}/BannedUsers`, bannedUserData.uid);

    // Remove undefined properties from data before write
    const cleanData = Object.entries({
      ...bannedUserData,
      bannedAt: bannedUserData.bannedAt || new Date().toISOString(),
    }).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});

    await setDoc(bannedRef, cleanData);

    // also add banned group to user document for quick client-side check
    try {
      const userRef = doc(db, 'users', bannedUserData.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const groups = Array.isArray(data.groups) ? data.groups : [];
        const bannedGroup = `space_${spaceId}_banned`;
        if (!groups.includes(bannedGroup)) {
          await updateDoc(userRef, { groups: [...groups, bannedGroup] });
        }
      }
    } catch (e) {
      Logger.error('spacesFirestore: failed to add banned group to user', e);
    }

    Logger.log(`spacesFirestore: Added banned user ${bannedUserData.uid} to space ${spaceId}`);
    return true;
  } catch (error) {
    Logger.error('spacesFirestore: Error adding banned user:', error);
    throw error;
  }
};

// ------------------------------
// BELOW: Previously existing helper functions that may be referenced elsewhere.
// These are simplified re-implementations to avoid breaking imports.

export const updateSpaceSettings = async (spaceId, settings) => {
  try {
    Logger.log(`spacesFirestore: Updating settings for space: ${spaceId}`, settings);
    const spaceRef = doc(db, 'spaces', spaceId);
    await updateDoc(spaceRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    if (cachedSpaces[spaceId]) {
      delete cachedSpaces[spaceId];
    }
    return true;
  } catch (error) {
    Logger.error('spacesFirestore: Error updating space settings:', error);
    throw error;
  }
};

export const setSpaceAccessibleToAllUsers = async (spaceId, accessible) => {
  return updateSpaceSettings(spaceId, { accessibleToAllUsers: accessible });
};

export const createSpace = async (spaceData) => {
  try {
    const spacesCollection = collection(db, 'spaces');
    const docRef = await addDoc(spacesCollection, {
      ...spaceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    Logger.log(`spacesFirestore: Created space with ID ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    Logger.error('spacesFirestore: Error creating space:', error);
    throw error;
  }
};

export const updateSpaceHLSStream = async (spaceId, hlsStreamData) => {
  return updateSpaceSettings(spaceId, { HLSStreamURL: hlsStreamData });
};

export const getSpaceHLSStream = async (spaceId) => {
  try {
    const spaceRef = doc(db, 'spaces', spaceId);
    const snap = await getDoc(spaceRef);
    if (snap.exists()) {
      return snap.data().HLSStreamURL || null;
    }
    return null;
  } catch (error) {
    Logger.error('spacesFirestore: Error getting HLS stream:', error);
    throw error;
  }
};

export const uploadSpaceVideoBackground = async (spaceId, videoFile) => {
  Logger.warn('uploadSpaceVideoBackground: Not implemented in simplified stub.');
  return null;
};

export const deleteSpaceVideoBackground = async (spaceId) => {
  Logger.warn('deleteSpaceVideoBackground: Not implemented in simplified stub.');
  return null;
};