import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUnity } from '../../providers/UnityProvider';
import { useUnityOnFirstSceneLoaded, useUnityOnNameplateClick } from '../../hooks/unityEvents';
import { useUnityPlayerList } from '../../hooks/unityEvents/useUnityPlayerList';
import { useFadeStyles } from '../../hooks/useFadeStyles';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';

/**
 * useWebGLState - Manages Unity state, player instantiation, and session.
 */
export const useWebGLState = (spaceID) => {
  const { unityProvider, isLoaded, error } = useUnity();
  const isFirstSceneLoaded = useUnityOnFirstSceneLoaded();
  const fadeStyles = useFadeStyles(isFirstSceneLoaded);
  const [isUnityReady, setIsUnityReady] = useState(false);
  const [devicePixelRatio, setDevicePixelRatio] = useState(window.devicePixelRatio);
  const [nameplateData, resetNameplateData] = useUnityOnNameplateClick();
  const players = useUnityPlayerList();
  const localPlayer = players.find(player => player.isLocalPlayer);
  const [isPlayerListVisible, setIsPlayerListVisible] = useState(true);
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(true);

  // Container ref for Unity
  const unityContainerRef = useRef(null);

  // Get sessionId from URL or default to spaceID
  const sessionId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('sessionId');
    return sessionIdFromUrl || spaceID;
  }, [spaceID]);

  // Ensure the Unity environment is ready
  useEffect(() => {
    if (isLoaded || isFirstSceneLoaded) {
      setTimeout(() => {
        setIsUnityReady(true);
      }, 5000);
    }
  }, [isLoaded, isFirstSceneLoaded]);

  // Handle player instantiation
  useEffect(() => {
    const handlePlayerInstantiated = () => {
      setIsPlayerInstantiated(true);
      window.dispatchEvent(new CustomEvent("PlayerInstantiated"));
      window.isPlayerInstantiated = true;
    };

    if (window.isPlayerInstantiated) {
      setIsPlayerInstantiated(true);
    }

    eventBus.subscribe(EventNames.playerInstantiated, handlePlayerInstantiated);

    const timeoutId = setTimeout(() => {
      if (!isPlayerInstantiated) {
        setIsPlayerInstantiated(true);
        window.isPlayerInstantiated = true;
        window.dispatchEvent(new CustomEvent("PlayerInstantiated"));
      }
    }, 5000);

    return () => {
      eventBus.unsubscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
      clearTimeout(timeoutId);
    };
  }, [isPlayerInstantiated]);

  // Ensure webgl-root element is visible
  useEffect(() => {
    const webglRoot = document.getElementById('webgl-root');

    if (webglRoot) {
      webglRoot.style.display = 'block';
      if (spaceID && webglRoot.getAttribute('data-space-id') !== spaceID) {
        webglRoot.setAttribute('data-space-id', spaceID);
      }
    }
  }, [spaceID]);

  // Player list toggle
  const handlePlayerListToggle = useCallback(() => {
    setIsPlayerListVisible(!isPlayerListVisible);
  }, [isPlayerListVisible]);

  return {
    // Unity state
    unityProvider,
    isLoaded,
    error,
    isFirstSceneLoaded,
    isUnityReady,
    fadeStyles,
    devicePixelRatio,

    // Player state
    players,
    localPlayer,
    isPlayerInstantiated,
    isPlayerListVisible,
    setIsPlayerListVisible,
    handlePlayerListToggle,

    // Nameplate
    nameplateData,
    resetNameplateData,

    // Session and refs
    sessionId,
    unityContainerRef,
  };
};

export default useWebGLState;
