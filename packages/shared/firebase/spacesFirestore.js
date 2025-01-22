import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import { getStorage, ref, getDownloadURL } from 'firebase/storage';

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


            // Check if itemData has a webglBuildId
            if (itemData.webglBuildId) {
                const webglBuildDocRef = doc(db, 'webglBuilds', itemData.webglBuildId);
                const webglBuildDocSnapshot = await getDoc(webglBuildDocRef);

                if (webglBuildDocSnapshot.exists()) {
                    const webglBuildData = webglBuildDocSnapshot.data();

                    // Merge webglBuildData into itemData
                    itemData = {
                        ...itemData,
                        ...webglBuildData
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
        const spaceRef = doc(db, "spaces", spaceId);
        const spaceSnap = await getDoc(spaceRef);
        if (spaceSnap.exists()) {
            const spaceData = spaceSnap.data();
            // Check if user is in the usersAllowed array or in any other role with access
            return spaceData.usersAllowed.includes(userID) || spaceData.userAdmin.includes(userID) || spaceData.usersModerators.includes(userID);
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