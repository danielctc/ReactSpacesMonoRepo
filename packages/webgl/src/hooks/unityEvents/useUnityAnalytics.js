import { useEffect, useContext } from 'react';
import { useListenForUnityEvent } from './core/useListenForUnityEvent';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Unity Analytics Hook - Tracks Unity events automatically
 * @param {string} spaceId - The space identifier
 * @param {Object} options - Configuration options
 * @returns {Object} - Analytics tracking functions and state
 */
export const useUnityAnalytics = (spaceId, options = {}) => {
  const { user } = useContext(UserContext);
  const { trackUnityEvent, isReady } = useAnalytics(spaceId, {
    enableDebugLogs: options.enableDebugLogs || false
  });
  const listenToUnityMessage = useListenForUnityEvent();

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    Logger.log('🎯 Unity Analytics: Setting up event listeners');

    // Track video play events
    const unsubscribeVideoPlay = listenToUnityMessage("PlayVideo", (data) => {
      Logger.log('🎯 Unity Analytics: Video play event detected', data);
      trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.VIDEO_PLAY, {
        category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
        videoId: data?.gameObjectName,
        videoUrl: data?.videoUrl,
        isEditMode: data?.isEditMode || false,
        timestamp: new Date().toISOString(),
        ...data
      });
    });

    // Portal clicks are handled by useUnityOnPortalClick hook to avoid duplication

    // Portal navigation is handled in WebGLRenderer when user confirms to avoid duplication

    // Track media screen clicks
    const unsubscribeMediaClick = listenToUnityMessage("PlayMediaScreenVideo", (data) => {
      Logger.log('🎯 Unity Analytics: Media screen click event detected', data);
      trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.MEDIA_SCREEN_CLICK, {
        category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
        mediaScreenId: data?.mediaScreenId,
        videoUrl: data?.videoUrl,
        isEditMode: data?.isEditMode || false,
        timestamp: new Date().toISOString(),
        ...data
      });
    });

    // Track nameplate clicks
    const unsubscribeNameplateClick = listenToUnityMessage("OpenNameplateModal", (data) => {
      Logger.log('🎯 Unity Analytics: Nameplate click event detected', data);
      trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.NAMEPLATE_CLICK, {
        category: ANALYTICS_CATEGORIES.SOCIAL_INTERACTION,
        targetUserId: data?.uid,
        targetPlayerName: data?.playerName,
        targetPlayerId: data?.playerId,
        isLocalPlayer: data?.isLocalPlayer || false,
        timestamp: new Date().toISOString(),
        ...data
      });
    });

    // Track player spawning
    const unsubscribePlayerSpawn = listenToUnityMessage("PlayerInstantiated", (data) => {
      Logger.log('🎯 Unity Analytics: Player spawn event detected', data);
      trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.PLAYER_SPAWN, {
        category: ANALYTICS_CATEGORIES.SYSTEM_EVENT,
        timestamp: new Date().toISOString(),
        ...data
      });
    });

    // Track first scene loaded
    const unsubscribeFirstSceneLoaded = listenToUnityMessage("FirstSceneLoaded", (data) => {
      Logger.log('🎯 Unity Analytics: First scene loaded event detected', data);
      trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.SPACE_READY, {
        category: ANALYTICS_CATEGORIES.SYSTEM_EVENT,
        timestamp: new Date().toISOString(),
        ...data
      });
    });

    // Track catalogue item clicks (seating hotspots)
    const unsubscribeCatalogueClick = listenToUnityMessage("SeatingHotspotClicked", (data) => {
      Logger.log('🎯 Unity Analytics: Catalogue item click event detected', data);
      trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.OBJECT_INTERACT, {
        category: ANALYTICS_CATEGORIES.CONTENT_INTERACTION,
        objectType: 'catalogue_item',
        hotspotId: data?.hotspotId,
        itemId: data?.itemId,
        position: data?.position,
        timestamp: new Date().toISOString(),
        ...data
      });
    });

    // Track player list updates (for engagement analytics)
    const unsubscribePlayerListUpdate = listenToUnityMessage("UpdatePlayerList", (data) => {
      if (data?.players && Array.isArray(data.players)) {
        Logger.log('🎯 Unity Analytics: Player list update event detected', data);
        trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.PLAYER_MOVE, {
          category: ANALYTICS_CATEGORIES.SOCIAL_INTERACTION,
          activePlayerCount: data.players.length,
          playerList: data.players.map(p => ({
            playerId: p.playerId,
            playerName: p.playerName,
            isLocalPlayer: p.isLocalPlayer
          })),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Track general Unity requests
    const unsubscribeUnityRequest = listenToUnityMessage("RequestUserForUnity", (data) => {
      Logger.log('🎯 Unity Analytics: Unity user request event detected', data);
      trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.SPACE_LOAD, {
        category: ANALYTICS_CATEGORIES.SYSTEM_EVENT,
        requestType: 'user_data',
        timestamp: new Date().toISOString(),
        ...data
      });
    });

    // Return cleanup function
    return () => {
      Logger.log('🎯 Unity Analytics: Cleaning up event listeners');
      unsubscribeVideoPlay();
      unsubscribeMediaClick();
      unsubscribeNameplateClick();
      unsubscribePlayerSpawn();
      unsubscribeFirstSceneLoaded();
      unsubscribeCatalogueClick();
      unsubscribePlayerListUpdate();
      unsubscribeUnityRequest();
    };
  }, [isReady, user, trackUnityEvent, listenToUnityMessage]);

  return {
    isReady,
    trackUnityEvent
  };
}; 