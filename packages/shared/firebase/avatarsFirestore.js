import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from './firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { guardFirebaseWrite } from './firebaseWriteGuard';

const AVATARS_COLLECTION = 'avatars';
const AVATAR_STORAGE_PATH = 'avatars/collection';

/**
 * Converts Firestore Timestamps to ISO strings for React compatibility.
 * @param {Object} data - Document data that may contain Timestamp fields.
 * @returns {Object} Data with timestamps converted to strings.
 */
const serializeTimestamps = (data) => {
  const result = { ...data };
  if (result.createdAt?.toDate) {
    result.createdAt = result.createdAt.toDate().toISOString();
  }
  if (result.updatedAt?.toDate) {
    result.updatedAt = result.updatedAt.toDate().toISOString();
  }
  return result;
};

/**
 * Fetches all active avatars from the collection, ordered by sortOrder.
 * Optionally filters by space and user groups.
 * @param {Object} options - Filter options
 * @param {string} [options.spaceId] - Current space ID to filter by
 * @param {string[]} [options.userGroups] - User's groups to filter by
 * @returns {Promise<Array>} Array of avatar objects with id included.
 */
export const getAllAvatars = async (options = {}) => {
  const { spaceId, userGroups = [] } = options;

  try {
    const avatarsRef = collection(db, AVATARS_COLLECTION);
    const q = query(
      avatarsRef,
      where('isActive', '==', true),
      orderBy('sortOrder', 'asc')
    );

    const snapshot = await getDocs(q);
    let avatars = snapshot.docs.map(doc => serializeTimestamps({
      id: doc.id,
      ...doc.data()
    }));

    // Filter by space if spaceId provided
    if (spaceId) {
      avatars = avatars.filter(avatar => {
        // If no allowedSpaces, avatar is available everywhere
        if (!avatar.allowedSpaces || avatar.allowedSpaces.length === 0) {
          return true;
        }
        return avatar.allowedSpaces.includes(spaceId);
      });
    }

    // Filter by user groups if provided
    if (userGroups.length > 0) {
      avatars = avatars.filter(avatar => {
        // If no allowedGroups, avatar is available to everyone
        if (!avatar.allowedGroups || avatar.allowedGroups.length === 0) {
          return true;
        }
        // Check if user has any of the allowed groups
        return avatar.allowedGroups.some(group => userGroups.includes(group));
      });
    }

    return avatars;
  } catch (error) {
    Logger.error('Failed to fetch avatars:', error);
    throw error;
  }
};

/**
 * Fetches all avatars including inactive ones (for admin panel).
 * @returns {Promise<Array>} Array of all avatar objects.
 */
export const getAllAvatarsAdmin = async () => {
  try {
    const avatarsRef = collection(db, AVATARS_COLLECTION);
    const q = query(avatarsRef, orderBy('sortOrder', 'asc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => serializeTimestamps({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    Logger.error('Failed to fetch avatars (admin):', error);
    throw error;
  }
};

/**
 * Fetches a single avatar by ID.
 * @param {string} avatarId - The avatar document ID.
 * @returns {Promise<Object|null>} The avatar object or null if not found.
 */
export const getAvatarById = async (avatarId) => {
  try {
    const avatarRef = doc(db, AVATARS_COLLECTION, avatarId);
    const snapshot = await getDoc(avatarRef);

    if (!snapshot.exists()) {
      return null;
    }

    return serializeTimestamps({
      id: snapshot.id,
      ...snapshot.data()
    });
  } catch (error) {
    Logger.error('Failed to fetch avatar:', avatarId, error);
    throw error;
  }
};

/**
 * Creates a new avatar document in Firestore.
 * @param {Object} avatarData - The avatar data.
 * @param {string} avatarData.name - Display name for the avatar.
 * @param {string} avatarData.glbUrl - Firebase Storage URL to GLB file.
 * @param {string} avatarData.thumbnailUrl - Firebase Storage URL to PNG thumbnail.
 * @param {string} [avatarData.category] - Optional category.
 * @param {number} [avatarData.sortOrder] - Optional sort order (defaults to 0).
 * @returns {Promise<Object>} The created avatar with its ID.
 */
export const createAvatar = async (avatarData) => {
  try {
    guardFirebaseWrite('createAvatar');
    const avatarsRef = collection(db, AVATARS_COLLECTION);

    const newAvatar = {
      name: avatarData.name,
      glbUrl: avatarData.glbUrl,
      thumbnailUrl: avatarData.thumbnailUrl,
      category: avatarData.category || 'default',
      sortOrder: avatarData.sortOrder ?? 0,
      isActive: true,
      allowedSpaces: avatarData.allowedSpaces || [], // Empty = all spaces
      allowedGroups: avatarData.allowedGroups || [], // Empty = all groups
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(avatarsRef, newAvatar);
    Logger.log('Avatar created:', docRef.id);

    return {
      id: docRef.id,
      ...newAvatar
    };
  } catch (error) {
    Logger.error('Failed to create avatar:', error);
    throw error;
  }
};

/**
 * Updates an existing avatar document.
 * @param {string} avatarId - The avatar document ID.
 * @param {Object} updates - Fields to update.
 * @returns {Promise<void>}
 */
export const updateAvatar = async (avatarId, updates) => {
  try {
    guardFirebaseWrite('updateAvatar');
    const avatarRef = doc(db, AVATARS_COLLECTION, avatarId);

    await updateDoc(avatarRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    Logger.log('Avatar updated:', avatarId);
  } catch (error) {
    Logger.error('Failed to update avatar:', avatarId, error);
    throw error;
  }
};

/**
 * Soft deletes an avatar by setting isActive to false.
 * @param {string} avatarId - The avatar document ID.
 * @returns {Promise<void>}
 */
export const deleteAvatar = async (avatarId) => {
  try {
    await updateAvatar(avatarId, { isActive: false });
    Logger.log('Avatar soft deleted:', avatarId);
  } catch (error) {
    Logger.error('Failed to delete avatar:', avatarId, error);
    throw error;
  }
};

/**
 * Permanently deletes an avatar and its storage files.
 * Use with caution - this cannot be undone.
 * @param {string} avatarId - The avatar document ID.
 * @returns {Promise<void>}
 */
export const permanentlyDeleteAvatar = async (avatarId) => {
  try {
    guardFirebaseWrite('permanentlyDeleteAvatar');
    const storage = getStorage();

    // Delete storage files
    const glbRef = ref(storage, `${AVATAR_STORAGE_PATH}/${avatarId}/model.glb`);
    const pngRef = ref(storage, `${AVATAR_STORAGE_PATH}/${avatarId}/thumbnail.png`);

    await Promise.allSettled([
      deleteObject(glbRef),
      deleteObject(pngRef)
    ]);

    // Delete Firestore document
    const avatarRef = doc(db, AVATARS_COLLECTION, avatarId);
    await deleteDoc(avatarRef);

    Logger.log('Avatar permanently deleted:', avatarId);
  } catch (error) {
    Logger.error('Failed to permanently delete avatar:', avatarId, error);
    throw error;
  }
};

/**
 * Uploads avatar assets (GLB + PNG) to Firebase Storage and creates the avatar document.
 * @param {File} glbFile - The GLB model file.
 * @param {File} pngFile - The PNG thumbnail file.
 * @param {Object} metadata - Avatar metadata.
 * @param {string} metadata.name - Display name.
 * @param {string} [metadata.category] - Optional category.
 * @param {number} [metadata.sortOrder] - Optional sort order.
 * @returns {Promise<Object>} The created avatar with URLs and ID.
 */
export const uploadAvatarCollectionAssets = async (glbFile, pngFile, metadata) => {
  const storage = getStorage();

  // Generate a temporary ID for storage path (will be replaced by Firestore doc ID)
  const tempId = `temp_${Date.now()}`;

  try {
    guardFirebaseWrite('uploadAvatarCollectionAssets');
    Logger.log('Uploading avatar assets:', metadata.name);

    // Upload GLB file
    const glbRef = ref(storage, `${AVATAR_STORAGE_PATH}/${tempId}/model.glb`);
    const glbSnapshot = await uploadBytes(glbRef, glbFile, {
      contentType: 'model/gltf-binary'
    });
    const glbUrl = await getDownloadURL(glbSnapshot.ref);

    // Upload PNG thumbnail
    const pngRef = ref(storage, `${AVATAR_STORAGE_PATH}/${tempId}/thumbnail.png`);
    const pngSnapshot = await uploadBytes(pngRef, pngFile, {
      contentType: 'image/png'
    });
    const thumbnailUrl = await getDownloadURL(pngSnapshot.ref);

    // Create Firestore document
    const avatar = await createAvatar({
      name: metadata.name,
      glbUrl,
      thumbnailUrl,
      category: metadata.category,
      sortOrder: metadata.sortOrder
    });

    Logger.log('Avatar assets uploaded successfully:', avatar.id);
    return avatar;
  } catch (error) {
    Logger.error('Failed to upload avatar assets:', error);
    throw error;
  }
};

/**
 * Gets the next available sort order value.
 * @returns {Promise<number>} The next sort order.
 */
export const getNextSortOrder = async () => {
  try {
    const avatars = await getAllAvatarsAdmin();
    if (avatars.length === 0) return 0;

    const maxOrder = Math.max(...avatars.map(a => a.sortOrder || 0));
    return maxOrder + 1;
  } catch (error) {
    Logger.error('Failed to get next sort order:', error);
    return 0;
  }
};

/**
 * Reorders avatars by updating their sortOrder values.
 * @param {Array<{id: string, sortOrder: number}>} orderUpdates - Array of id and new sortOrder pairs.
 * @returns {Promise<void>}
 */
export const reorderAvatars = async (orderUpdates) => {
  try {
    const updatePromises = orderUpdates.map(({ id, sortOrder }) =>
      updateAvatar(id, { sortOrder })
    );

    await Promise.all(updatePromises);
    Logger.log('Avatars reordered successfully');
  } catch (error) {
    Logger.error('Failed to reorder avatars:', error);
    throw error;
  }
};
