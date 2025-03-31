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
        Logger.error('Error loading space objects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadObjects();
  }, [spaceId, placePrefab]);

  // Save a new object
  const saveObject = useCallback(async (prefabName, position, rotation, scale) => {
    if (!spaceId) return false;

    const objectId = uuidv4();
    const objectData = {
      prefabName,
      position,
      rotation,
      scale,
      objectId
    };

    const success = await saveSpaceObject(spaceId, objectId, objectData);
    if (success) {
      // Update local state
      setObjects(prev => [...prev, { id: objectId, ...objectData }]);
      
      // Place in Unity
      placePrefab(prefabName, position, rotation, scale);
    }

    return success;
  }, [spaceId, placePrefab]);

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