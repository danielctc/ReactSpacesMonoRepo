import { useState, useEffect, useCallback } from 'react';
import { focusUnity, setUnityKeyboardCapture } from '../../utils/unityKeyboard';

// Get Unity canvas element
const getUnityCanvas = () => {
  return document.querySelector('canvas') || document.getElementById('unity-canvas');
};

/**
 * useKeyboardFocus - Manages keyboard focus between Unity and React UI.
 */
export const useKeyboardFocus = (isLoaded, unityProvider, nameplateData) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle keyboard focus management for modal events
  useEffect(() => {
    const handleModalOpen = () => setIsModalOpen(true);
    const handleModalClose = () => setIsModalOpen(false);

    window.addEventListener('modal-opened', handleModalOpen);
    window.addEventListener('modal-closed', handleModalClose);

    return () => {
      window.removeEventListener('modal-opened', handleModalOpen);
      window.removeEventListener('modal-closed', handleModalClose);
    };
  }, []);

  // Handle keyboard focus for nameplate modal
  useEffect(() => {
    if (nameplateData !== null) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [nameplateData]);

  // Disable keyboard capture when Unity loads
  useEffect(() => {
    if (isLoaded && unityProvider) {
      setTimeout(() => {
        if (window.unityInstance) {
          try {
            window.unityInstance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', false);
          } catch (err) {
            console.error('Error disabling Unity keyboard capture:', err);
          }
        }
      }, 1000);
    }
  }, [isLoaded, unityProvider]);

  // Configure Unity canvas for keyboard focus
  useEffect(() => {
    const configureUnityCanvas = () => {
      const unityCanvas = getUnityCanvas();

      if (unityCanvas) {
        unityCanvas.tabIndex = 1;
        unityCanvas.style.outline = 'none';

        unityCanvas.addEventListener('click', () => {
          if (!isModalOpen) {
            focusUnity(true);
          }
        });
      }
    };

    configureUnityCanvas();
    const timerId = setTimeout(configureUnityCanvas, 1000);

    const handleUnityReady = () => configureUnityCanvas();
    window.addEventListener('unityReady', handleUnityReady);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('unityReady', handleUnityReady);
    };
  }, [isLoaded, isModalOpen]);

  // Handle clicks on Unity canvas
  const handleCanvasClick = useCallback(() => {
    if (!isModalOpen) {
      focusUnity(true);
    }
  }, [isModalOpen]);

  // Add event listener for canvas clicks
  useEffect(() => {
    if (isLoaded && unityProvider) {
      const canvas = getUnityCanvas();
      if (canvas) {
        canvas.addEventListener('click', handleCanvasClick);
        return () => canvas.removeEventListener('click', handleCanvasClick);
      }
    }
  }, [isLoaded, unityProvider, handleCanvasClick]);

  // Global click handler to manage focus
  useEffect(() => {
    if (isLoaded && unityProvider) {
      const handleGlobalClick = (e) => {
        if (isModalOpen) return;

        // Don't refocus if clicking on form elements
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) {
          return;
        }

        // Don't refocus if clicking inside UI containers
        if (
          e.target.closest('[role="dialog"]') ||
          e.target.closest('[role="menu"]') ||
          e.target.closest('[role="tooltip"]') ||
          e.target.closest('.modal')
        ) {
          return;
        }

        const canvas = getUnityCanvas();
        if (canvas && (e.target === canvas || canvas.contains(e.target))) {
          return;
        }

        // Check for UI overlay elements
        const isOverlayUI =
          e.target.closest('.webgl-overlay') ||
          e.target.closest('.game-ui') ||
          e.target.closest('.player-list') ||
          e.target.closest('.unity-ui-overlay');

        if (isOverlayUI) {
          setTimeout(() => {
            if (!isModalOpen) focusUnity(true);
          }, 50);
          return;
        }

        // Refocus canvas
        setTimeout(() => {
          if (canvas && !isModalOpen) {
            if (canvas.tabIndex === undefined || canvas.tabIndex < 0) {
              canvas.tabIndex = 1;
            }
            canvas.focus();
            focusUnity(true);
          }
        }, 50);
      };

      document.addEventListener('click', handleGlobalClick, true);
      return () => document.removeEventListener('click', handleGlobalClick, true);
    }
  }, [isLoaded, unityProvider, isModalOpen]);

  return {
    isModalOpen,
    setIsModalOpen,
    getUnityCanvas,
  };
};

export default useKeyboardFocus;
