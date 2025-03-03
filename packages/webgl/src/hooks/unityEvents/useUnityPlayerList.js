import { useState, useEffect } from "react";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useUnityPlayerList = () => {
  const [playerList, setPlayerList] = useState([]);
  const listenToUnityMessage = useListenForUnityEvent();

  useEffect(() => {
    let isSubscribed = true;
    let retryTimeout = null;

    const requestPlayerList = () => {
      if (window.unityInstance) {
        Logger.log("Requesting fresh player list");
        window.unityInstance.SendMessage("NetworkManager", "RequestPlayerList");
      }
    };

    const handlePlayerListUpdate = (data) => {
      if (!isSubscribed) return;
      Logger.log("UpdatePlayerList unity message received.");
      
      try {
        let newPlayers = [];
        if (typeof data === 'object' && data !== null) {
          newPlayers = data.players || [];
        } else {
          const parsed = JSON.parse(data);
          newPlayers = parsed.players || [];
        }

        if (Array.isArray(newPlayers)) {
          const uniquePlayers = Array.from(
            new Map(newPlayers.map(player => [player.playerId, player])).values()
          );

          setPlayerList(uniquePlayers);

          // Clear any pending retry if we got a successful update
          if (retryTimeout) {
            clearTimeout(retryTimeout);
            retryTimeout = null;
          }
        }
      } catch (err) {
        Logger.error("Error handling player list data:", err);
        // Schedule a retry on error
        if (!retryTimeout) {
          retryTimeout = setTimeout(requestPlayerList, 1000);
        }
      }
    };

    const handlePlayerDisconnected = () => {
      Logger.log("Player disconnected, requesting fresh player list");
      requestPlayerList();
    };

    const handlePlayerLeft = () => {
      Logger.log("Player left, requesting fresh player list");
      requestPlayerList();
    };

    // Initial request for player list
    requestPlayerList();

    // Subscribe to all relevant events
    const unsubscribeList = listenToUnityMessage("UpdatePlayerList", handlePlayerListUpdate);
    const unsubscribeDisconnect = listenToUnityMessage("PlayerDisconnected", handlePlayerDisconnected);
    const unsubscribeLeft = listenToUnityMessage("PlayerLeft", handlePlayerLeft);

    // Set up periodic refresh
    const refreshInterval = setInterval(requestPlayerList, 5000);
    
    return () => {
      isSubscribed = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (typeof unsubscribeList === "function") unsubscribeList();
      if (typeof unsubscribeDisconnect === "function") unsubscribeDisconnect();
      if (typeof unsubscribeLeft === "function") unsubscribeLeft();
      clearInterval(refreshInterval);
    };
  }, [listenToUnityMessage]);

  return playerList;
};