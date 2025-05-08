import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { Logger } from '../logging/react-log';

const SPACES_COLLECTION = 'spaces';
const PORTALS_SUBCOLLECTION = 'portals';

/**
 * Save a portal to Firebase
 * @param {string} sourceSpaceId - The ID of the space where the portal is placed
 * @param {string} portalId - Unique ID for the portal
 * @param {Object} portalData - The portal data including position, rotation, scale, target space, etc.
 * @returns {Promise<boolean>} - Success status
 */
export const savePortal = async (sourceSpaceId, portalId, portalData) => {
  try {
    const portalRef = doc(db, SPACES_COLLECTION, sourceSpaceId, PORTALS_SUBCOLLECTION, portalId);
    
    // Add timestamp and ensure all required fields
    const portalToSave = {
      ...portalData,
      sourceSpaceId,
      portalId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(portalRef, portalToSave);
    Logger.log(`Saved portal ${portalId} to space ${sourceSpaceId}`);
    return true;
  } catch (error) {
    Logger.error(`Error saving portal:`, error);
    return false;
  }
};

/**
 * Get all portals for a space
 * @param {string} spaceId - The ID of the space
 * @returns {Promise<Array>} - Array of portals
 */
export const getSpacePortals = async (spaceId) => {
  try {
    const portalsRef = collection(db, SPACES_COLLECTION, spaceId, PORTALS_SUBCOLLECTION);
    const querySnapshot = await getDocs(portalsRef);
    
    const portals = [];
    querySnapshot.forEach((doc) => {
      portals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    Logger.log(`Retrieved ${portals.length} portals for space ${spaceId}`);
    return portals;
  } catch (error) {
    Logger.error(`Error getting space portals:`, error);
    return [];
  }
};

/**
 * Delete a specific portal
 * @param {string} spaceId - The ID of the space containing the portal
 * @param {string} portalId - The ID of the portal to delete
 * @returns {Promise<boolean>} - Success status
 */
export const deletePortal = async (spaceId, portalId) => {
  try {
    const portalRef = doc(db, SPACES_COLLECTION, spaceId, PORTALS_SUBCOLLECTION, portalId);
    await deleteDoc(portalRef);
    Logger.log(`Deleted portal ${portalId} from space ${spaceId}`);
    return true;
  } catch (error) {
    Logger.error(`Error deleting portal:`, error);
    return false;
  }
};

/**
 * Update an existing portal
 * @param {string} spaceId - The ID of the space containing the portal
 * @param {string} portalId - The ID of the portal to update
 * @param {Object} updateData - The data to update
 * @returns {Promise<boolean>} - Success status
 */
export const updatePortal = async (spaceId, portalId, updateData) => {
  try {
    const portalRef = doc(db, SPACES_COLLECTION, spaceId, PORTALS_SUBCOLLECTION, portalId);
    
    // Add updatedAt timestamp
    const updateToSave = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(portalRef, updateToSave);
    Logger.log(`Updated portal ${portalId} in space ${spaceId}`);
    return true;
  } catch (error) {
    Logger.error(`Error updating portal:`, error);
    return false;
  }
}; 