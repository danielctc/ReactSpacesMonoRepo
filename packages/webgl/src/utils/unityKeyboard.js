/**
 * Unity Keyboard Integration
 * Simple utility for managing Unity keyboard integration with React
 */

// Define these functions slightly differently to support Unity's approach
const getUnityInstance = () => {
  // Try all possible Unity instance locations
  return window.unityInstance || window.gameInstance || window.reactUnityInstance;
};

// Let's add a global helper to prevent arrow keys from scrolling the page when Unity has focus
let arrowKeyHandler = null;

/**
 * Prevents arrow key scrolling when Unity has focus
 */
const preventArrowKeyScrolling = () => {
  // Add a class to the body to indicate Unity focus for CSS control
  document.body.classList.add('unity-focused');
  
  // Navigation keys that we want to prevent default scrolling behavior for
  const navigationKeys = [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
    'Space', 'PageUp', 'PageDown', 'Home', 'End'
  ];
  
  // The event handler for keydown events
  const handleKeyDown = (e) => {
    // Only prevent default for navigation keys
    if (navigationKeys.includes(e.key)) {
      // Check if the target is an input element
      const isInput = e.target.tagName === 'INPUT' || 
                     e.target.tagName === 'TEXTAREA' || 
                     e.target.isContentEditable;
      
      // Check if the event is targeting Unity or if Unity canvas has focus
      const unityCanvas = document.querySelector('canvas') || document.getElementById('unity-canvas');
      const isUnityTarget = e.target.closest('canvas') || 
                           e.target.closest('#webgl-root');
      const hasUnityFocus = document.activeElement === unityCanvas;
      
      // Only prevent default if Unity actually has focus or is the target
      if (!isInput && (isUnityTarget || hasUnityFocus)) {
        e.preventDefault();
      }
    }
  };
  
  // Document click handler to manage focus classes
  const handleDocumentClick = (e) => {
    const unityCanvas = document.querySelector('canvas') || document.getElementById('unity-canvas');
    const unityContainer = document.getElementById('unity-container') || document.getElementById('webgl-root');
    
    // If click is inside Unity, maintain unity-focused class
    if (e.target.closest('canvas') || e.target.closest('#webgl-root')) {
      document.body.classList.add('unity-focused');
    } else {
      // If clicking outside Unity, remove unity-focused class to allow keyboard scrolling
      document.body.classList.remove('unity-focused');
    }
  };
  
  // Attach the event listeners
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('click', handleDocumentClick);
  
  // Return a cleanup function
  return () => {
    document.body.classList.remove('unity-focused');
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('click', handleDocumentClick);
  };
};

/**
 * Remove event handlers that prevent arrow key scrolling
 */
const allowArrowKeyScrolling = () => {
  document.body.classList.remove('unity-focused');
};

/**
 * Enable or disable keyboard input capture in Unity
 * @param {boolean} enable - Whether to enable or disable keyboard capture
 * @returns {Promise<boolean>} - Success state
 */
export function setUnityKeyboardCapture(enable) {
  console.log(`Setting Unity keyboard capture: ${enable}`);
  
  // Add/remove the unity-focused class for CSS-based focus management
  if (enable) {
    document.body.classList.add('unity-focused');
    window.unityKeyboardEnabled = true;
  } else {
    document.body.classList.remove('unity-focused');
    window.unityKeyboardEnabled = false;
  }
  
  // Toggle arrow key prevention when setting keyboard capture - either call or remove it
  if (enable) {
    preventArrowKeyScrolling();
  } else {
    allowArrowKeyScrolling();
  }
  
  return new Promise((resolve) => {
    try {
      const unityInstance = getUnityInstance();
      
      if (unityInstance) {
        // First try using the direct message method from Unity's guide
        try {
          if (enable) {
            unityInstance.SendMessage('WebGLInput', 'EnableKeyboardCapture');
          } else {
            unityInstance.SendMessage('WebGLInput', 'DisableKeyboardCapture');
          }
          console.log(`Unity keyboard capture ${enable ? 'enabled' : 'disabled'} (using Unity preferred method)`);
          resolve(true);
          return;
        } catch (err) {
          console.warn('Failed to use Unity preferred keyboard method, falling back to SetCaptureAllKeyboardInput', err);
        }
        
        // Fall back to the original method if the direct method fails
        try {
          unityInstance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', enable);
          console.log(`Unity keyboard capture ${enable ? 'enabled' : 'disabled'} (using fallback method)`);
          resolve(true);
          return;
        } catch (err) {
          console.warn('Failed to use SetCaptureAllKeyboardInput, trying module method', err);
        }
        
        // Try the Module method as final fallback
        if (unityInstance.Module) {
          // Store the original handler if disabling and not already stored
          if (!enable && unityInstance.Module.WebGLInputHandler && !window._originalWebGLInputHandler) {
            window._originalWebGLInputHandler = unityInstance.Module.WebGLInputHandler;
          }
          
          // Set or restore the handler
          if (enable && window._originalWebGLInputHandler) {
            unityInstance.Module.WebGLInputHandler = window._originalWebGLInputHandler;
            window._originalWebGLInputHandler = null;
          } else if (!enable) {
            unityInstance.Module.WebGLInputHandler = null;
          }
          
          console.log(`Unity keyboard capture ${enable ? 'enabled' : 'disabled'} (using Module method)`);
          resolve(true);
          return;
        }
      } else {
        console.warn('Unity instance not available, cannot set keyboard capture');
        // Store for later when Unity becomes available
        window.__pendingKeyboardCaptureState = enable;
        
        // Add special handling for SpacePage - poll for Unity instance
        if (document.getElementById('webgl-root')) {
          console.log('webgl-root detected, will poll for Unity instance');
          pollForUnityInstance(enable);
        }
        
        resolve(false);
      }
    } catch (err) {
      console.error('Error setting Unity keyboard capture:', err);
      resolve(false);
    }
  });
}

/**
 * Poll for Unity instance to become available
 * @param {boolean} enable - The keyboard capture state to apply when found
 */
function pollForUnityInstance(enable) {
  if (window.__unityInstancePoller) {
    clearTimeout(window.__unityInstancePoller);
  }
  
  const maxAttempts = 20;
  let attempts = 0;
  
  const poll = () => {
    attempts++;
    const unityInstance = getUnityInstance();
    
    if (unityInstance) {
      console.log(`Unity instance found after ${attempts} attempts`);
      // Apply the pending keyboard state
      try {
        if (enable) {
          unityInstance.SendMessage('WebGLInput', 'EnableKeyboardCapture');
        } else {
          unityInstance.SendMessage('WebGLInput', 'DisableKeyboardCapture');
        }
        console.log(`Applied pending keyboard state: ${enable}`);
        window.__pendingKeyboardCaptureState = null;
      } catch (err) {
        console.warn('Failed to apply pending keyboard state with preferred method, trying fallback', err);
        
        try {
          unityInstance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', enable);
          console.log(`Applied pending keyboard state: ${enable} (fallback method)`);
          window.__pendingKeyboardCaptureState = null;
        } catch (fallbackErr) {
          console.error('Failed to apply pending keyboard state with fallback method', fallbackErr);
        }
      }
    } else if (attempts < maxAttempts) {
      // Try again after a delay, with increasing delay times
      const delay = Math.min(500 * Math.pow(1.2, attempts), 5000);
      console.log(`Unity instance not found (attempt ${attempts}/${maxAttempts}), retrying in ${delay}ms`);
      window.__unityInstancePoller = setTimeout(poll, delay);
    } else {
      console.warn(`Unity instance still not found after ${maxAttempts} attempts, giving up`);
    }
  };
  
  // Start polling
  window.__unityInstancePoller = setTimeout(poll, 500);
}

/**
 * Get Unity keyboard focus state
 * @returns {boolean} - Whether Unity has keyboard focus
 */
export function hasUnityKeyboardFocus() {
  const unityInstance = getUnityInstance();
  
  if (!unityInstance) {
    return false;
  }
  
  // Check if the Unity canvas has focus
  const canvas = document.querySelector('canvas') || document.getElementById('unity-canvas');
  if (canvas && document.activeElement === canvas) {
    return true;
  }
  
  // Check Module handler state
  if (unityInstance.Module && unityInstance.Module.WebGLInputHandler) {
    return true;
  }
  
  return false;
}

/**
 * Focus the Unity canvas and optionally enable keyboard capture
 * @param {boolean} captureKeyboard - Whether to enable keyboard capture
 * @returns {Promise<boolean>} - Success state
 */
export function focusUnity(captureKeyboard = true) {
  console.log('Focusing Unity canvas');
  
  // Also prevent arrow key scrolling when focusing Unity
  if (captureKeyboard) {
    preventArrowKeyScrolling();
  } else {
    allowArrowKeyScrolling();
  }
  
  return new Promise((resolve) => {
    try {
      // Find the Unity canvas
      const canvas = document.querySelector('canvas') || 
                    document.getElementById('unity-canvas');
      
      // Focus the canvas if found
      if (canvas) {
        try {
          canvas.focus({ preventScroll: true });
        } catch (e) {
          canvas.focus(); // Fallback
        }
        
        // Make sure pointer events are enabled
        canvas.style.pointerEvents = 'auto';
        
        // Capture keyboard if requested
        if (captureKeyboard) {
          setUnityKeyboardCapture(true).then(resolve);
          return;
        }
        resolve(true);
      } else {
        console.warn('Unity canvas not found');
        resolve(false);
      }
    } catch (err) {
      console.error('Error focusing Unity canvas:', err);
      resolve(false);
    }
  });
}

/**
 * Block Unity keyboard input for modals and critical UI
 * @param {boolean} blockInput - Whether to block keyboard input
 * @returns {Promise<boolean>} - Success state
 */
export function blockUnityKeyboardInput(blockInput = true) {
  console.log(`${blockInput ? 'Blocking' : 'Unblocking'} Unity keyboard input`);
  
  // When blocking Unity input, stop preventing arrow key scrolling
  // This allows normal page scrolling when interacting with UI
  preventArrowKeyScrolling(!blockInput);
  
  // First, set the Unity keyboard capture state using setUnityKeyboardCapture
  return new Promise((resolve) => {
    try {
      if (blockInput) {
        // Disable Unity keyboard input
        setUnityKeyboardCapture(false).then(success => {
          if (success) {
            console.log('Successfully disabled Unity keyboard capture');
          }
          
          // Also disable pointer events on the canvas
          const canvas = document.querySelector('canvas') || document.getElementById('unity-canvas');
          if (canvas) {
            canvas.blur();
            canvas.style.pointerEvents = 'none';
          }
          
          // Set up global handlers to stop propagation of key events
          if (!window.__keyEventHandler) {
            window.__keyEventHandler = (e) => {
              if (window.__blockKeyboardInput && 
                  !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                // Only stop propagation if not targeting input elements
                e.stopPropagation();
              }
            };
            
            document.addEventListener('keydown', window.__keyEventHandler, true);
            document.addEventListener('keyup', window.__keyEventHandler, true);
            document.addEventListener('keypress', window.__keyEventHandler, true);
          }
          
          // Set the block flag
          window.__blockKeyboardInput = true;
          
          // Disable WebGLInputHandler if available
          const unityInstance = getUnityInstance();
          if (unityInstance?.Module?.WebGLInputHandler) {
            window._savedWebGLInputHandler = unityInstance.Module.WebGLInputHandler;
            unityInstance.Module.WebGLInputHandler = null;
          }
          
          resolve(true);
        });
      } else {
        // Re-enable Unity keyboard input
        window.__blockKeyboardInput = false;
        
        // Remove global key event handlers
        if (window.__keyEventHandler) {
          document.removeEventListener('keydown', window.__keyEventHandler, true);
          document.removeEventListener('keyup', window.__keyEventHandler, true);
          document.removeEventListener('keypress', window.__keyEventHandler, true);
          window.__keyEventHandler = null;
        }
        
        // Restore WebGLInputHandler if we saved one
        const unityInstance = getUnityInstance();
        if (unityInstance?.Module && window._savedWebGLInputHandler) {
          unityInstance.Module.WebGLInputHandler = window._savedWebGLInputHandler;
          window._savedWebGLInputHandler = null;
        }
        
        // Re-enable pointer events on canvas
        const canvas = document.querySelector('canvas') || document.getElementById('unity-canvas');
        if (canvas) {
          canvas.style.pointerEvents = 'auto';
        }
        
        // Re-enable Unity keyboard capture
        setUnityKeyboardCapture(true).then(success => {
          if (success) {
            console.log('Successfully re-enabled Unity keyboard capture');
          }
          resolve(true);
        });
      }
    } catch (err) {
      console.error('Error in blockUnityKeyboardInput:', err);
      resolve(false);
    }
  });
}

/**
 * Register Unity instance globally when it becomes available
 * @param {Object} instance - The Unity instance
 */
export function registerUnityInstance(instance) {
  if (!instance) return;
  
  console.log('Registering Unity instance');
  window.unityInstance = instance;
  
  // Apply any pending keyboard state
  if (typeof window.__pendingKeyboardCaptureState === 'boolean') {
    try {
      const enable = window.__pendingKeyboardCaptureState;
      console.log(`Applying pending keyboard state: ${enable}`);
      
      try {
        if (enable) {
          instance.SendMessage('WebGLInput', 'EnableKeyboardCapture');
        } else {
          instance.SendMessage('WebGLInput', 'DisableKeyboardCapture');
        }
        console.log(`Applied pending keyboard state: ${enable} (Unity preferred method)`);
        window.__pendingKeyboardCaptureState = null;
      } catch (err) {
        console.warn('Failed to apply pending keyboard state with preferred method, trying fallback', err);
        
        try {
          instance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', enable);
          console.log(`Applied pending keyboard state: ${enable} (fallback method)`);
          window.__pendingKeyboardCaptureState = null;
        } catch (fallbackErr) {
          console.error('Failed to apply pending keyboard state with fallback method', fallbackErr);
        }
      }
    } catch (err) {
      console.error('Error applying pending keyboard state:', err);
    }
  }
  
  // If there's a poller running, clear it
  if (window.__unityInstancePoller) {
    clearTimeout(window.__unityInstancePoller);
    window.__unityInstancePoller = null;
  }
}

/**
 * Initialize Unity keyboard helpers
 */
export function initUnityKeyboard() {
  console.log('Initializing Unity keyboard helpers');
  
  // Make these functions available globally
  window.setUnityKeyboardCapture = setUnityKeyboardCapture;
  window.focusUnity = focusUnity;
  window.blockUnityKeyboardInput = blockUnityKeyboardInput;
  window.hasUnityKeyboardFocus = hasUnityKeyboardFocus;
  window.getUnityInstance = getUnityInstance;
  window.registerUnityInstance = registerUnityInstance;
  
  // Special handling for SpacePage - check if we need to register with Unity via WebGL loader
  if (document.getElementById('webgl-root')) {
    // Watch for Unity loading
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeName === 'CANVAS' || 
                (node.querySelector && node.querySelector('canvas'))) {
              console.log('Canvas detected, Unity might be loading. Setting up instance detection.');
              
              // Start polling for Unity instance
              pollForUnityInstance(true);
              
              // Break the observer after finding a canvas
              observer.disconnect();
              break;
            }
          }
        }
      }
    });
    
    // Start observing the document with configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also look for an existing canvas
    if (document.querySelector('canvas')) {
      console.log('Canvas already exists, Unity might be loaded. Starting instance detection.');
      pollForUnityInstance(true);
    }
  }
  
  // Create a unified hook for React components to use
  if (typeof window !== 'undefined' && typeof require === 'function') {
    try {
      const React = require('react');
      
      // Create a hook function that components can use
      window.useUnityKeyboardFocus = function useUnityKeyboardFocus() {
        const [isFocused, setIsFocused] = React.useState(false);
        
        React.useEffect(() => {
          if (isFocused) {
            console.log('useUnityKeyboardFocus: Blocking Unity keyboard input');
            blockUnityKeyboardInput(true);
            window.dispatchEvent(new CustomEvent('modal-opened'));
          } else {
            console.log('useUnityKeyboardFocus: Unblocking Unity keyboard input');
            blockUnityKeyboardInput(false);
            window.dispatchEvent(new CustomEvent('modal-closed'));
          }
          
          return () => {
            if (isFocused) {
              console.log('useUnityKeyboardFocus: Cleanup - unblocking Unity keyboard input');
              blockUnityKeyboardInput(false);
              window.dispatchEvent(new CustomEvent('modal-closed'));
            }
          };
        }, [isFocused]);
        
        return [isFocused, setIsFocused];
      };
      
      console.log('Created useUnityKeyboardFocus hook globally');
    } catch (err) {
      console.warn('Could not create React hook, React might not be available yet:', err);
    }
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  setTimeout(initUnityKeyboard, 0);
} 