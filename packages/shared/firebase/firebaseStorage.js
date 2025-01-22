import { getStorage, ref, getDownloadURL } from 'firebase/storage';

import { Logger } from '@disruptive-spaces/shared/logging/react-log';
/**
 * Fetches the HTTP URL for a given gs:// URL from Firebase Storage.
 * 
 * @param {string} gsUrl The gs:// URL to the file in Firebase Storage.
 * @returns {Promise<string>} A promise that resolves with the HTTP URL to the file.
 */
export const fetchHttpUrlFromGsUrl = async (gsUrl) => {
    // Initialize Firebase Storage
    const storage = getStorage();

    // Convert the gs:// URL to a Storage reference
    const storageRef = ref(storage, gsUrl);

    // Use getDownloadURL to fetch the HTTP URL
    try {
        const httpUrl = await getDownloadURL(storageRef);
        return httpUrl;
    } catch (error) {
        Logger.error('Failed to fetch HTTP URL from gs:// URL:', '/src/packages/shared/firebase/firebaseStorage.js', error);
        throw error; // Rethrow or handle as needed
    }
};