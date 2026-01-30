import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const AVATAR_PATH = 'avatars';

/**
 * Default avatars hosted on Firebase Storage.
 * Used for deterministic assignment based on username.
 */
export const DEFAULT_AVATARS = [
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F65a18fa5676505696ce66a14.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F65a18fcf6698a5166e9a1b43.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F65a294956698a5166ea194c8.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F65a54ab950377ef74b6dff36.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F66759370ab338d43c80ee3a3.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F66759420c5fe24b037ad1488.glb?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/disruptive-metaverse.appspot.com/o/avatars%2Fdefaults%2F66759500ab338d43c80ef226.glb?alt=media',
];

/**
 * Simple hash function to convert a string to a number.
 * Used for deterministic avatar assignment.
 * @param {string} str - The string to hash.
 * @returns {number} A positive integer hash.
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Gets a deterministic default avatar URL based on username.
 * The same username will always return the same avatar.
 *
 * @param {string} username - The user's username.
 * @returns {string} The default avatar URL for this username.
 */
export const getDefaultAvatarForUsername = (username) => {
  if (!username) {
    return DEFAULT_AVATARS[0];
  }
  const index = hashString(username.toLowerCase()) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
};

/**
 * Fetches the HTTP URL for a given gs:// URL from Firebase Storage.
 *
 * @param {string} gsUrl - The gs:// URL to the file in Firebase Storage.
 * @returns {Promise<string>} A promise that resolves with the HTTP URL to the file.
 */
export const fetchHttpUrlFromGsUrl = async (gsUrl) => {
  const storage = getStorage();
  const storageRef = ref(storage, gsUrl);

  try {
    const httpUrl = await getDownloadURL(storageRef);
    return httpUrl;
  } catch (error) {
    Logger.error('Failed to fetch HTTP URL from gs:// URL:', gsUrl, error);
    throw error;
  }
};

/**
 * Uploads a GLB avatar file to Firebase Storage and updates user profile.
 *
 * @param {string} userId - The user's Firebase UID.
 * @param {Blob} glbFile - The GLB file blob to upload.
 * @returns {Promise<string>} The download URL of the uploaded avatar.
 */
export const uploadAvatarGLB = async (userId, glbFile) => {
  const storage = getStorage();
  const storageRef = ref(storage, `${AVATAR_PATH}/${userId}/avatar.glb`);

  try {
    Logger.log('Uploading avatar GLB for user:', userId);
    const snapshot = await uploadBytes(storageRef, glbFile, {
      contentType: 'model/gltf-binary',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);

    // Update Firestore with new URL
    await updateDoc(doc(db, 'users', userId), {
      avatarUrl: downloadUrl,
      avatarUpdatedAt: new Date().toISOString(),
    });

    Logger.log('Avatar uploaded successfully:', downloadUrl);
    return downloadUrl;
  } catch (error) {
    Logger.error('Failed to upload avatar GLB:', error);
    throw error;
  }
};

/**
 * Downloads a GLB from an external URL and uploads to Firebase Storage.
 * Useful for migrating from ReadyPlayerMe or other external sources.
 *
 * @param {string} userId - The user's Firebase UID.
 * @param {string} glbUrl - The external URL to the GLB file.
 * @returns {Promise<string>} The Firebase Storage download URL.
 */
export const uploadAvatarFromUrl = async (userId, glbUrl) => {
  try {
    Logger.log('Fetching avatar from external URL:', glbUrl);
    const response = await fetch(glbUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch GLB: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    return uploadAvatarGLB(userId, blob);
  } catch (error) {
    Logger.error('Failed to upload avatar from URL:', error);
    throw error;
  }
};

/**
 * Gets the avatar URL for a user from Firebase Storage.
 *
 * @param {string} userId - The user's Firebase UID.
 * @returns {Promise<string|null>} The download URL or null if not found.
 */
export const getAvatarUrl = async (userId) => {
  const storage = getStorage();
  const storageRef = ref(storage, `${AVATAR_PATH}/${userId}/avatar.glb`);

  try {
    return await getDownloadURL(storageRef);
  } catch {
    return null;
  }
};
