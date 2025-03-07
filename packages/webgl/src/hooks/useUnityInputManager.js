import { useEffect } from 'react';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useUnityInputManager = (isModalOpen) => {
  useEffect(() => {
    if (!window.unityInstance) return;

    const disableUnityInput = () => {
      try {
        window.unityInstance.SendMessage('WebGLInputManager', 'Disable');
        Logger.log('Unity input disabled');
      } catch (error) {
        Logger.error('Failed to disable Unity input:', error);
      }
    };

    const enableUnityInput = () => {
      try {
        window.unityInstance.SendMessage('WebGLInputManager', 'Enable');
        Logger.log('Unity input enabled');
      } catch (error) {
        Logger.error('Failed to enable Unity input:', error);
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
  }, [isModalOpen]);
}; 