import { useEffect } from 'react';
import { blockUnityKeyboardInput, focusUnity } from '../../../utils/unityKeyboard';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Hook to manage keyboard focus between Unity and chat input
 * @param {boolean} isChatInputFocused - Whether the chat input is currently focused
 */
export const useChatKeyboardFocus = (isChatInputFocused) => {
  useEffect(() => {
    if (isChatInputFocused) {
      Logger.log('useChatKeyboardFocus: Chat input focused, blocking Unity keyboard input');
      
      // Block Unity keyboard input when chat is focused
      blockUnityKeyboardInput(true);
      
      // Dispatch modal opened event for other components
      window.dispatchEvent(new CustomEvent('modal-opened'));
      
    } else {
      Logger.log('useChatKeyboardFocus: Chat input blurred, restoring Unity keyboard input');
      
      // Restore Unity keyboard input when chat loses focus
      blockUnityKeyboardInput(false);
      
      // Dispatch modal closed event for other components
      window.dispatchEvent(new CustomEvent('modal-closed'));
      
      // Re-focus Unity canvas after a short delay
      setTimeout(() => {
        focusUnity(true);
      }, 100);
    }

    // Cleanup function
    return () => {
      if (isChatInputFocused) {
        Logger.log('useChatKeyboardFocus: Cleanup - restoring Unity keyboard input');
        blockUnityKeyboardInput(false);
        window.dispatchEvent(new CustomEvent('modal-closed'));
      }
    };
  }, [isChatInputFocused]);

  // Handle global escape key to close chat
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isChatInputFocused) {
        Logger.log('useChatKeyboardFocus: Escape key pressed, blurring chat input');
        
        // Find and blur the chat input
        const chatInput = document.querySelector('input[placeholder*="chat"]');
        if (chatInput) {
          chatInput.blur();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isChatInputFocused]);
};
