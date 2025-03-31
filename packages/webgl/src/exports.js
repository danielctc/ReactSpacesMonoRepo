// This file exports components and utilities for use by other apps
// Import components to export
import WebGLLoader from "./WebGLLoader";

// Import utilities
import * as PrefabUtils from './utils/PrefabUtils';

// Export components
export { WebGLLoader };
export default WebGLLoader;

// Export utilities
export { PrefabUtils };

// Export individual utility functions for convenience
export const {
  placePrefab,
  placeRandomPrefab,
  placeGridOfPrefabs,
  isUnityReady
} = PrefabUtils; 