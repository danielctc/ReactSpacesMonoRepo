/**
 * useUnityMessaging - Centralised hook for Unity communication
 *
 * Instead of scattering `window.unityInstance` checks throughout the codebase,
 * use this hook to:
 * - Check if Unity is ready
 * - Send messages to Unity GameObjects
 * - Send events to ReactIncomingEvent handler
 *
 * Uses UnityInstanceContext from react-unity-webgl when available,
 * falls back to window.unityInstance for compatibility.
 *
 * Usage:
 *   const { isReady, sendMessage, sendEvent } = useUnityMessaging();
 *
 *   // Check Unity readiness
 *   if (isReady) { ... }
 *
 *   // Send message to GameObject
 *   sendMessage('WebGLInputManager', 'Disable');
 *
 *   // Send event to ReactIncomingEvent (auto-serializes data)
 *   sendEvent('PlaceVideoCanvas', { canvasId: '123', videoUrl: 'https://...' });
 */

import { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UnityInstanceContext } from '../providers/UnityProvider';

/**
 * Get the Unity instance from window (fallback for outside context)
 */
const getWindowUnityInstance = () => {
  return window.unityInstance || window.gameInstance || window.reactUnityInstance;
};

/**
 * Hook for Unity communication
 * Prefers UnityInstanceContext, falls back to window.unityInstance
 * @returns {Object} Unity messaging utilities
 */
export function useUnityMessaging() {
  // Try to get from React context first (react-unity-webgl pattern)
  const unityContext = useContext(UnityInstanceContext);

  // Use context if available, otherwise check window
  const contextIsLoaded = unityContext?.isLoaded;
  const contextSendMessage = unityContext?.sendMessage;

  const [windowInstanceReady, setWindowInstanceReady] = useState(!!getWindowUnityInstance());

  // Derive isReady from context or window fallback
  const isReady = contextIsLoaded ?? windowInstanceReady;

  // Watch for window.unityInstance as fallback (if not using context)
  useEffect(() => {
    // Skip polling if we have context
    if (unityContext) return;

    // Check immediately
    if (getWindowUnityInstance()) {
      setWindowInstanceReady(true);
      return;
    }

    // Poll for Unity instance (it loads asynchronously)
    const checkInterval = setInterval(() => {
      if (getWindowUnityInstance()) {
        setWindowInstanceReady(true);
        clearInterval(checkInterval);
      }
    }, 100);

    // Listen for custom event that some Unity loaders dispatch
    const handleUnityReady = () => {
      setWindowInstanceReady(true);
      clearInterval(checkInterval);
    };
    window.addEventListener('unityReady', handleUnityReady);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('unityReady', handleUnityReady);
    };
  }, [unityContext]);

  /**
   * Send a message to a Unity GameObject
   * Prefers context sendMessage (react-unity-webgl), falls back to window.unityInstance
   * @param {string} gameObjectName - Name of the GameObject
   * @param {string} methodName - Name of the method to call
   * @param {*} [value] - Optional value to pass
   * @returns {boolean} Whether the message was sent
   */
  const sendMessage = useCallback((gameObjectName, methodName, value) => {
    // Prefer context sendMessage (from react-unity-webgl)
    if (contextSendMessage) {
      try {
        if (value !== undefined) {
          contextSendMessage(gameObjectName, methodName, value);
        } else {
          contextSendMessage(gameObjectName, methodName);
        }
        Logger.log(`[useUnityMessaging] Sent via context: ${gameObjectName}.${methodName}`);
        return true;
      } catch (error) {
        Logger.error(`[useUnityMessaging] Context error:`, error);
        return false;
      }
    }

    // Fallback to window.unityInstance
    const instance = getWindowUnityInstance();
    if (!instance) {
      Logger.warn(`[useUnityMessaging] Unity not ready, cannot send: ${gameObjectName}.${methodName}`);
      return false;
    }

    try {
      if (value !== undefined) {
        instance.SendMessage(gameObjectName, methodName, value);
      } else {
        instance.SendMessage(gameObjectName, methodName);
      }
      Logger.log(`[useUnityMessaging] Sent via window: ${gameObjectName}.${methodName}`);
      return true;
    } catch (error) {
      Logger.error(`[useUnityMessaging] Error sending message:`, error);
      return false;
    }
  }, [contextSendMessage]);

  /**
   * Send an event to ReactIncomingEvent handler
   * @param {string} eventName - Name of the event
   * @param {Object} data - Event data (will be JSON serialized)
   * @returns {boolean} Whether the event was sent
   */
  const sendEvent = useCallback((eventName, data) => {
    const payload = JSON.stringify({
      eventName,
      data: JSON.stringify(data)
    });

    // Prefer context sendMessage
    if (contextSendMessage) {
      try {
        contextSendMessage('ReactIncomingEvent', 'HandleEvent', payload);
        Logger.log(`[useUnityMessaging] Sent event via context: ${eventName}`);
        return true;
      } catch (error) {
        Logger.error(`[useUnityMessaging] Context error sending event:`, error);
        return false;
      }
    }

    // Fallback to window.unityInstance
    const instance = getWindowUnityInstance();
    if (!instance) {
      Logger.warn(`[useUnityMessaging] Unity not ready, cannot send event: ${eventName}`);
      return false;
    }

    try {
      instance.SendMessage('ReactIncomingEvent', 'HandleEvent', payload);
      Logger.log(`[useUnityMessaging] Sent event via window: ${eventName}`);
      return true;
    } catch (error) {
      Logger.error(`[useUnityMessaging] Error sending event:`, error);
      return false;
    }
  }, [contextSendMessage]);

  /**
   * Send raw JSON string to ReactIncomingEvent (for pre-serialized data)
   * @param {string} eventName - Name of the event
   * @param {string} jsonData - Already serialized JSON data
   * @returns {boolean} Whether the event was sent
   */
  const sendRawEvent = useCallback((eventName, jsonData) => {
    const payload = JSON.stringify({
      eventName,
      data: jsonData
    });

    // Prefer context sendMessage
    if (contextSendMessage) {
      try {
        contextSendMessage('ReactIncomingEvent', 'HandleEvent', payload);
        Logger.log(`[useUnityMessaging] Sent raw event via context: ${eventName}`);
        return true;
      } catch (error) {
        Logger.error(`[useUnityMessaging] Context error sending raw event:`, error);
        return false;
      }
    }

    // Fallback to window.unityInstance
    const instance = getWindowUnityInstance();
    if (!instance) {
      Logger.warn(`[useUnityMessaging] Unity not ready, cannot send raw event: ${eventName}`);
      return false;
    }

    try {
      instance.SendMessage('ReactIncomingEvent', 'HandleEvent', payload);
      Logger.log(`[useUnityMessaging] Sent raw event via window: ${eventName}`);
      return true;
    } catch (error) {
      Logger.error(`[useUnityMessaging] Error sending raw event:`, error);
      return false;
    }
  }, [contextSendMessage]);

  /**
   * Disable Unity input (for modals, overlays, etc.)
   * @param {string} [source] - Identifier for what disabled input (for re-enabling)
   */
  const disableInput = useCallback((source = 'unknown') => {
    const success = sendMessage('WebGLInputManager', 'Disable');
    if (success) {
      window.unityInputDisabledBy = source;
    }
    return success;
  }, [sendMessage]);

  /**
   * Re-enable Unity input
   * @param {string} [source] - Only re-enable if this source disabled it
   */
  const enableInput = useCallback((source) => {
    // If source provided, only enable if we disabled it
    if (source && window.unityInputDisabledBy !== source) {
      Logger.log(`[useUnityMessaging] Not re-enabling input (disabled by ${window.unityInputDisabledBy}, not ${source})`);
      return false;
    }

    const success = sendMessage('WebGLInputManager', 'Enable');
    if (success) {
      window.unityInputDisabledBy = null;
    }
    return success;
  }, [sendMessage]);

  return useMemo(() => ({
    isReady,
    sendMessage,
    sendEvent,
    sendRawEvent,
    disableInput,
    enableInput,
    // Expose getInstance for edge cases
    getInstance: getUnityInstance
  }), [isReady, sendMessage, sendEvent, sendRawEvent, disableInput, enableInput]);
}

/**
 * Standalone utility functions (for use outside React components)
 */
export const UnityMessaging = {
  isReady: () => !!getUnityInstance(),

  sendMessage: (gameObjectName, methodName, value) => {
    const instance = getUnityInstance();
    if (!instance) {
      Logger.warn(`[UnityMessaging] Unity not ready, cannot send: ${gameObjectName}.${methodName}`);
      return false;
    }
    try {
      if (value !== undefined) {
        instance.SendMessage(gameObjectName, methodName, value);
      } else {
        instance.SendMessage(gameObjectName, methodName);
      }
      return true;
    } catch (error) {
      Logger.error(`[UnityMessaging] Error:`, error);
      return false;
    }
  },

  sendEvent: (eventName, data) => {
    const instance = getUnityInstance();
    if (!instance) {
      Logger.warn(`[UnityMessaging] Unity not ready, cannot send event: ${eventName}`);
      return false;
    }
    try {
      const payload = JSON.stringify({
        eventName,
        data: JSON.stringify(data)
      });
      instance.SendMessage('ReactIncomingEvent', 'HandleEvent', payload);
      return true;
    } catch (error) {
      Logger.error(`[UnityMessaging] Error:`, error);
      return false;
    }
  }
};

export default useUnityMessaging;
