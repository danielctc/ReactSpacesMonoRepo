// packages/shared/hooks/useKeyboardFocus.js

import { useState, useEffect } from 'react';

const useKeyboardFocus = () => {
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (isFocused) {
            const unityCanvas = document.querySelector('#unity-canvas');
            
            // Force Unity canvas to blur and disable pointer events
            if (unityCanvas) {
                unityCanvas.blur();
                unityCanvas.style.pointerEvents = 'none';
            }

            // Store the original focus handler
            const originalHandleKeyboard = window.unityInstance?.Module?.WebGLInputHandler;
            
            // Disable Unity's keyboard handler
            if (window.unityInstance?.Module) {
                window.unityInstance.Module.WebGLInputHandler = null;
            }

            // Handle all keyboard events
            const handleKeyEvent = (e) => {
                e.stopImmediatePropagation();
                e.stopPropagation();
            };

            // Add event listeners in both capture and bubble phases
            document.addEventListener('keydown', handleKeyEvent, true);
            document.addEventListener('keyup', handleKeyEvent, true);
            document.addEventListener('keypress', handleKeyEvent, true);
            document.addEventListener('keydown', handleKeyEvent, false);
            document.addEventListener('keyup', handleKeyEvent, false);
            document.addEventListener('keypress', handleKeyEvent, false);

            return () => {
                // Restore Unity's keyboard handler
                if (window.unityInstance?.Module && originalHandleKeyboard) {
                    window.unityInstance.Module.WebGLInputHandler = originalHandleKeyboard;
                }

                // Re-enable Unity canvas pointer events
                if (unityCanvas) {
                    unityCanvas.style.pointerEvents = 'auto';
                }

                // Remove all event listeners
                document.removeEventListener('keydown', handleKeyEvent, true);
                document.removeEventListener('keyup', handleKeyEvent, true);
                document.removeEventListener('keypress', handleKeyEvent, true);
                document.removeEventListener('keydown', handleKeyEvent, false);
                document.removeEventListener('keyup', handleKeyEvent, false);
                document.removeEventListener('keypress', handleKeyEvent, false);
            };
        }
    }, [isFocused]);

    return [isFocused, setIsFocused];
};

export default useKeyboardFocus;