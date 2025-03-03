import { useState, useEffect } from "react";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useUnityOnNameplateClick = () => {
    const [nameplateData, setNameplateData] = useState(null);
    const listenToUnityMessage = useListenForUnityEvent();

    // Immediate debug log when hook is initialized
    console.log('🎮 Nameplate click hook initialized');

    useEffect(() => {
        console.log('🎮 Setting up nameplate click listener...');
        
        const handleNameplateClick = (data) => {
            console.log('🎮 Nameplate click detected!', data);
            if (!data) {
                console.warn("🎮 Received empty data in nameplate click handler");
                return;
            }

            try {
                // Parse the data if it's a string
                const playerData = typeof data === 'string' ? JSON.parse(data) : data;
                
                // Extract all relevant player information
                setNameplateData({
                    playerName: playerData.playerName,
                    playerId: playerData.playerId,
                    uid: playerData.uid, // Make sure this is included in the Unity event data
                    isLocalPlayer: playerData.isLocalPlayer
                });
                
                console.log('🎮 Processed nameplate data:', playerData);
            } catch (error) {
                console.error('🎮 Error processing nameplate data:', error);
            }
        };

        // Listen for Unity messages
        const unsubscribe = listenToUnityMessage("OpenNameplateModal", handleNameplateClick);
        
        return () => {
            console.log('🎮 Cleaning up nameplate click listener');
            if (typeof unsubscribe === "function") {
                unsubscribe();
            }
        };
    }, [listenToUnityMessage]);

    const resetNameplateData = () => {
        console.log('🎮 Resetting nameplate data');
        setNameplateData(null);
    };

    return [nameplateData, resetNameplateData];
}; 