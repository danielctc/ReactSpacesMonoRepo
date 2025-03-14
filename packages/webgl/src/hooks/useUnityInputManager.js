import { useEffect } from 'react';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useUnityInputManager = (isModalOpen, modalId = 'generic-modal') => {
  useEffect(() => {
    if (!window.unityInstance) return;

    const disableUnityInput = () => {
      try {
        window.unityInstance.SendMessage('WebGLInputManager', 'Disable');
        Logger.log(`Unity input disabled for ${modalId}`);
        
        // Add a class to the body to indicate that Unity input is disabled
        document.body.classList.add('unity-input-disabled');
        
        // Also set a flag on the window object that can be checked by event handlers
        window.unityInputDisabled = true;
        window.unityInputDisabledBy = modalId;
      } catch (error) {
        Logger.error(`Failed to disable Unity input for ${modalId}:`, error);
      }
    };

    const enableUnityInput = () => {
      try {
        // Only re-enable if this modal was the one that disabled it
        if (window.unityInputDisabledBy === modalId) {
          window.unityInstance.SendMessage('WebGLInputManager', 'Enable');
          Logger.log(`Unity input re-enabled (was disabled by ${modalId})`);
          
          // Remove the class from the body
          document.body.classList.remove('unity-input-disabled');
          
          // Reset the flags
          window.unityInputDisabled = false;
          window.unityInputDisabledBy = null;
        } else {
          Logger.log(`Not re-enabling Unity input for ${modalId} because it was disabled by ${window.unityInputDisabledBy}`);
        }
      } catch (error) {
        Logger.error(`Failed to enable Unity input for ${modalId}:`, error);
      }
    };

    if (isModalOpen) {
      disableUnityInput();
    } else {
      enableUnityInput();
    }

    return () => {
      // Re-enable Unity input when the component unmounts
      if (isModalOpen) {
        enableUnityInput();
      }
    };
  }, [isModalOpen, modalId]);
}; 