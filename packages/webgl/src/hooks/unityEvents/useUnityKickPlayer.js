import { useState, useEffect, useCallback } from 'react';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useListenForUnityEvent } from './core/useListenForUnityEvent';
import { useSendUnityEvent } from './core/useSendUnityEvent';

/**
 * React hook for kicking players from Unity/Fusion
 * @returns {Object} - Methods and state for kicking players
 */
export const useUnityKickPlayer = () => {
  const [kickResult, setKickResult] = useState(null);
  const [isKicking, setIsKicking] = useState(false);
  const [error, setError] = useState(null);
  
  // Use existing hooks for unity communication
  const listenForUnityEvent = useListenForUnityEvent();
  const sendUnityEvent = useSendUnityEvent();
  
  // Listen for kick results coming back from Unity
  useEffect(() => {
    const cleanupFn = listenForUnityEvent('KickPlayerResult', (resultData) => {
      Logger.log('KickPlayerResult event received:', resultData);
      
      if (resultData) {
        setKickResult(resultData);
        setIsKicking(false);
        
        // Handle success/error state for kicks initiated by the local user
        if (!resultData.success) {
          setError(resultData.errorMessage || 'Failed to kick player');
        } else {
          setError(null);
        }
      } else {
        Logger.error('Invalid KickPlayerResult data from Unity');
        setError('Invalid result from Unity');
        setIsKicking(false);
      }
    });
    
    // Return cleanup function
    return cleanupFn;
  }, [listenForUnityEvent]);
  
  /**
   * Kick a player from Unity/Fusion
   * @param {string} playerUid - The player's UID to kick
   * @param {string} requestedBy - UID of the user requesting the kick
   */
  const kickPlayer = useCallback((playerUid, requestedBy) => {
    try {
      if (!playerUid) {
        setError('Player UID is required');
        return;
      }
      
      setIsKicking(true);
      setError(null);
      setKickResult(null); // Reset previous result
      
      // Prepare data to send to Unity
      const kickData = {
        uid: playerUid,
        requestedBy: requestedBy || window.currentUser?.uid
      };
      
      Logger.log('Sending KickPlayer event to Unity:', kickData);
      
      // Send event to Unity using the existing pattern
      sendUnityEvent('KickPlayer', kickData);
      
    } catch (err) {
      Logger.error('Error kicking player:', err);
      setError(err.message || 'Failed to send kick request');
      setIsKicking(false);
    }
  }, [sendUnityEvent]);
  
  /**
   * Reset kick results and errors
   */
  const resetKickState = useCallback(() => {
    setKickResult(null);
    setError(null);
    setIsKicking(false);
  }, []);
  
  return {
    kickPlayer,
    isKicking,
    kickResult,
    error,
    resetKickState
  };
};

export default useUnityKickPlayer; 