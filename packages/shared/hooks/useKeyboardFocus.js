// This is a backward compatibility proxy for the useKeyboardFocus hook
// It redirects to the unified unityKeyboard utility

import { useState, useEffect } from 'react';
import { blockUnityKeyboardInput, focusUnity } from '@disruptive-spaces/webgl/src/utils/unityKeyboard';

/**
 * @deprecated Use window.useUnityKeyboardFocus or import the blockUnityKeyboardInput/focusUnity utilities directly
 */
const useKeyboardFocus = () => {
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (isFocused) {
            
            blockUnityKeyboardInput(true);
            window.dispatchEvent(new CustomEvent('modal-opened'));
        } else {
            
            blockUnityKeyboardInput(false).then(() => {
                setTimeout(() => {
                    if (!isFocused) { // Double-check we're still not focused
                        focusUnity(true);
                    }
                }, 100);
            });
            window.dispatchEvent(new CustomEvent('modal-closed'));
        }

        return () => {
            if (isFocused) {
                
                blockUnityKeyboardInput(false);
                window.dispatchEvent(new CustomEvent('modal-closed'));
            }
        };
    }, [isFocused]);

    // Log a deprecation warning
    useEffect(() => {
        console.warn(
            'The useKeyboardFocus hook is deprecated. ' +
            'Use window.useUnityKeyboardFocus or import the blockUnityKeyboardInput/focusUnity utilities directly ' +
            'from @disruptive-spaces/webgl/src/utils/unityKeyboard'
        );
    }, []);

    return [isFocused, setIsFocused];
};

export default useKeyboardFocus; 