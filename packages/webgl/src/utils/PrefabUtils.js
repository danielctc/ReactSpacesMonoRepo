import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Place a prefab in Unity directly using window.unityInstance
 * 
 * @param {string} prefabName - Name of the prefab to place
 * @param {Object} position - Position object with x, y, z coordinates
 * @param {Object} rotation - Rotation object with x, y, z angles in degrees
 * @param {Object} scale - Scale object with x, y, z scale factors
 * @returns {boolean} - Success status
 */
export function placePrefab(prefabName, position, rotation, scale) {
  // Default values
  const pos = position || { x: 0, y: 1, z: 0 };
  const rot = rotation || { x: 0, y: 0, z: 0 };
  const scl = scale || { x: 1, y: 1, z: 1 };
  
  if (!window.unityInstance) {
    Logger.error("Unity not loaded, cannot place prefab");
    return false;
  }
  
  try {
    // Create prefab data
    const prefabData = {
      prefabName: prefabName || "TestPrefab",
      position: pos,
      rotation: rot,
      scale: scl
    };
    
    // Create the event data
    const eventData = {
      eventName: "PlacePrefab",
      data: JSON.stringify(prefabData)
    };
    
    Logger.log("PrefabUtils: Sending prefab placement to Unity:", prefabData);
    
    // Send to Unity via ReactIncomingEvent.HandleEvent
    window.unityInstance.SendMessage(
      "ReactIncomingEvent",
      "HandleEvent",
      JSON.stringify(eventData)
    );
    
    return true;
  } catch (error) {
    Logger.error("PrefabUtils: Error placing prefab:", error);
    return false;
  }
}

/**
 * Place a prefab at a random position
 * 
 * @param {string} prefabName - Name of the prefab to place
 * @param {number} minY - Minimum Y coordinate (default: 0)
 * @param {number} maxY - Maximum Y coordinate (default: 2)
 * @param {number} range - Range for X and Z coordinates (default: 10)
 * @returns {boolean} - Success status
 */
export function placeRandomPrefab(prefabName, minY = 0, maxY = 2, range = 10) {
  const randomPosition = {
    x: Math.random() * range - range/2,
    y: Math.random() * (maxY - minY) + minY,
    z: Math.random() * range - range/2
  };
  
  const randomRotation = {
    x: 0,
    y: Math.random() * 360,
    z: 0
  };
  
  return placePrefab(prefabName, randomPosition, randomRotation);
}

/**
 * Place multiple prefabs in a grid pattern
 * 
 * @param {string} prefabName - Name of the prefab to place
 * @param {number} rows - Number of rows in the grid
 * @param {number} columns - Number of columns in the grid
 * @param {number} spacing - Spacing between prefabs
 * @param {Object} startPosition - Starting position for the grid
 * @returns {boolean} - Success status (true if all placements were successful)
 */
export function placeGridOfPrefabs(prefabName, rows = 3, columns = 3, spacing = 2, startPosition = { x: 0, y: 0, z: 0 }) {
  let allSuccessful = true;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const position = {
        x: startPosition.x + c * spacing,
        y: startPosition.y,
        z: startPosition.z + r * spacing
      };
      
      const success = placePrefab(prefabName, position);
      if (!success) {
        allSuccessful = false;
      }
    }
  }
  
  return allSuccessful;
}

/**
 * Check if Unity is loaded and ready to receive prefab placement commands
 * 
 * @returns {boolean} - Whether Unity is loaded
 */
export function isUnityReady() {
  return !!window.unityInstance;
} 