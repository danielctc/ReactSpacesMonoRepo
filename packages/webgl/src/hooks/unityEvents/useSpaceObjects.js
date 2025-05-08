import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { saveSpaceObject, getSpaceObjects, deleteSpaceObject, updateSpaceObject } from '@disruptive-spaces/shared/firebase/spaceObjectsFirestore';
import { usePlacePrefab } from './usePlacePrefab';

/**
 * Hook to manage space objects (prefabs) in Unity
 * @param {string} spaceId - The ID of the space
 * @returns {Object} Object containing functions and state for managing space objects
 */
export const useSpaceObjects = (spaceId) => {
  const [objects, setObjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { placePrefab, directPlacePrefab, isUnityLoaded } = usePlacePrefab();

  // Load objects when spaceId changes
  useEffect(() => {
    const loadObjects = async () => {
      Logger.log(`useSpaceObjects: loadObjects called for spaceId: ${spaceId}`);
      if (!spaceId) {
        Logger.log('useSpaceObjects: No spaceId provided, skipping loadObjects.');
        setIsLoading(false); // Ensure loading is false if no spaceId
        return;
      }
      
      Logger.log(`useSpaceObjects: Setting isLoading to true for spaceId: ${spaceId}`);
      setIsLoading(true);
      try {
        Logger.log(`useSpaceObjects: Attempting to getSpaceObjects for spaceId: ${spaceId}`);
        const spaceObjects = await getSpaceObjects(spaceId);
        Logger.log(`useSpaceObjects: Got ${spaceObjects?.length || 0} objects for spaceId: ${spaceId}`, spaceObjects);
        setObjects(spaceObjects);
        
        Logger.log(`useSpaceObjects: Attempting to place ${spaceObjects?.length || 0} objects in Unity for spaceId: ${spaceId}`);
        if (spaceObjects && spaceObjects.length > 0) {
          spaceObjects.forEach((obj, index) => {
            Logger.log(`useSpaceObjects: Placing object ${index + 1}/${spaceObjects.length}: ${obj.prefabName} (ID: ${obj.id || obj.objectId})`, obj);
            // Ensure placePrefab is robust or consider if this step is truly needed here for PortalAdminModal
            placePrefab(obj.prefabName, obj.position, obj.rotation, obj.scale); 
          });
          Logger.log(`useSpaceObjects: Finished placing objects in Unity for spaceId: ${spaceId}`);
        } else {
          Logger.log(`useSpaceObjects: No objects to place in Unity for spaceId: ${spaceId}`);
        }

      } catch (error) {
        Logger.error(`useSpaceObjects: Error in loadObjects for spaceId: ${spaceId}:`, error);
      } finally {
        Logger.log(`useSpaceObjects: Setting isLoading to false in finally block for spaceId: ${spaceId}`);
        setIsLoading(false);
      }
    };

    loadObjects();
  }, [spaceId, placePrefab]);

  // Save a new object
  const saveObject = useCallback(async (prefabName, position, rotation, scale, customData = {}) => {
    if (!spaceId) return false;

    const objectId = uuidv4();
    const objectData = {
      prefabName,
      position,
      rotation,
      scale,
      objectId,
      ...customData
    };

    Logger.log('useSpaceObjects: Saving object with data:', objectData);

    const success = await saveSpaceObject(spaceId, objectId, objectData);
    if (success) {
      // Update local state
      setObjects(prev => [...prev, { id: objectId, ...objectData }]);
      
      Logger.log('useSpaceObjects: Object saved successfully, local state updated.', { objectId });
    } else {
      Logger.error('useSpaceObjects: Failed to save object to Firestore.', { spaceId, objectId, prefabName });
    }

    return success;
  }, [spaceId]);

  // Delete an object
  const deleteObject = useCallback(async (objectId) => {
    if (!spaceId) return false;

    const success = await deleteSpaceObject(spaceId, objectId);
    if (success) {
      // Update local state
      setObjects(prev => prev.filter(obj => obj.id !== objectId));
    }

    return success;
  }, [spaceId]);

  // Update an object
  const updateObject = useCallback(async (objectId, updateData) => {
    if (!spaceId) return false;

    const success = await updateSpaceObject(spaceId, objectId, updateData);
    if (success) {
      // Update local state
      setObjects(prev => prev.map(obj => 
        obj.id === objectId ? { ...obj, ...updateData } : obj
      ));
    }

    return success;
  }, [spaceId]);

  // Reload all objects
  const reloadObjects = useCallback(async () => {
    if (!spaceId) return;

    setIsLoading(true);
    try {
      const spaceObjects = await getSpaceObjects(spaceId);
      setObjects(spaceObjects);
      
      // Place all objects in Unity
      spaceObjects.forEach(obj => {
        placePrefab(obj.prefabName, obj.position, obj.rotation, obj.scale);
      });
    } catch (error) {
      Logger.error('Error reloading space objects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, placePrefab]);

  return {
    objects,
    isLoading,
    saveObject,
    deleteObject,
    updateObject,
    reloadObjects,
    isUnityLoaded
  };
}; 