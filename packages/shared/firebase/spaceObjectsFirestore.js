import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { Logger } from '../logging/react-log';

const COLLECTION_NAME = 'spaces';
const OBJECTS_SUBCOLLECTION = 'objects';

/**
 * Save a prefab object to a space
 * @param {string} spaceId - The ID of the space
 * @param {string} objectId - Unique ID for the object
 * @param {Object} objectData - The object data including position, rotation, scale, etc.
 * @returns {Promise<boolean>} - Success status
 */
export const saveSpaceObject = async (spaceId, objectId, objectData) => {
  try {
    const objectRef = doc(db, COLLECTION_NAME, spaceId, OBJECTS_SUBCOLLECTION, objectId);
    
    // Add timestamp and ensure all required fields
    const objectToSave = {
      ...objectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      spaceId,
      objectId
    };
    
    await setDoc(objectRef, objectToSave);
    Logger.log(`Saved object ${objectId} to space ${spaceId}`);
    return true;
  } catch (error) {
    Logger.error(`Error saving object to space:`, error);
    return false;
  }
};

/**
 * Get all objects for a space
 * @param {string} spaceId - The ID of the space
 * @returns {Promise<Array>} - Array of objects
 */
export const getSpaceObjects = async (spaceId) => {
  try {
    const objectsRef = collection(db, COLLECTION_NAME, spaceId, OBJECTS_SUBCOLLECTION);
    const querySnapshot = await getDocs(objectsRef);
    
    const objects = [];
    querySnapshot.forEach((doc) => {
      objects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    Logger.log(`Retrieved ${objects.length} objects for space ${spaceId}`);
    return objects;
  } catch (error) {
    Logger.error(`Error getting space objects:`, error);
    return [];
  }
};

/**
 * Delete a specific object from a space
 * @param {string} spaceId - The ID of the space
 * @param {string} objectId - The ID of the object to delete
 * @returns {Promise<boolean>} - Success status
 */
export const deleteSpaceObject = async (spaceId, objectId) => {
  try {
    const objectRef = doc(db, COLLECTION_NAME, spaceId, OBJECTS_SUBCOLLECTION, objectId);
    await deleteDoc(objectRef);
    Logger.log(`Deleted object ${objectId} from space ${spaceId}`);
    return true;
  } catch (error) {
    Logger.error(`Error deleting space object:`, error);
    return false;
  }
};

/**
 * Update an existing object in a space
 * @param {string} spaceId - The ID of the space
 * @param {string} objectId - The ID of the object to update
 * @param {Object} updateData - The data to update
 * @returns {Promise<boolean>} - Success status
 */
export const updateSpaceObject = async (spaceId, objectId, updateData) => {
  try {
    const objectRef = doc(db, COLLECTION_NAME, spaceId, OBJECTS_SUBCOLLECTION, objectId);
    
    // Add updatedAt timestamp
    const updateToSave = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(objectRef, updateToSave);
    Logger.log(`Updated object ${objectId} in space ${spaceId}`);
    return true;
  } catch (error) {
    Logger.error(`Error updating space object:`, error);
    return false;
  }
};

/**
 * Get a specific object from a space
 * @param {string} spaceId - The ID of the space
 * @param {string} objectId - The ID of the object to get
 * @returns {Promise<Object|null>} - The object data or null if not found
 */
export const getSpaceObject = async (spaceId, objectId) => {
  try {
    const objectRef = doc(db, COLLECTION_NAME, spaceId, OBJECTS_SUBCOLLECTION, objectId);
    const docSnapshot = await getDoc(objectRef);
    
    if (docSnapshot.exists()) {
      return {
        id: docSnapshot.id,
        ...docSnapshot.data()
      };
    }
    
    Logger.log(`Object ${objectId} not found in space ${spaceId}`);
    return null;
  } catch (error) {
    Logger.error(`Error getting space object:`, error);
    return null;
  }
}; 