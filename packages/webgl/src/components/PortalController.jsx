import React from 'react';
import { useUnityPortalImages } from '../hooks/unityEvents/useUnityPortalImages';

/**
 * PortalController - A component that manages portal images in the Unity application.
 * This component is responsible for:
 * 1. Loading the space's background image
 * 2. Sending it to Unity to be displayed on portals
 */
const PortalController = () => {
  // Initialize portal images
  useUnityPortalImages();

  // This component doesn't render anything visible
  return null;
};

export default PortalController; 