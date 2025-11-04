import { useState, useEffect } from "react";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useUnityOnNameplateClick = () => {
    const [nameplateData, setNameplateData] = useState(null);
    const listenToUnityMessage = useListenForUnityEvent();

    useEffect(() => {
        const handleNameplateClick = (data) => {
            if (!data) {
                Logger.warn("Received empty data in nameplate click handler");
                return;
            }

            try {
                // Parse the data if it's a string
                const playerData = typeof data === 'string' ? JSON.parse(data) : data;
                
                // Unity sends the UID in the playerId field
                // Try to extract UID from the data
                let uid = playerData.uid || playerData.playerId;
                
                // If playerId doesn't look like a UID (e.g., "[Player:1]"), try to find it another way
                if (uid && uid.startsWith('[Player:')) {
                    Logger.warn('PlayerId is in [Player:X] format, cannot extract UID');
                    uid = null;
                }
                
                setNameplateData({
                    playerName: playerData.playerName,
                    playerId: playerData.playerId,
                    uid: uid,
                    isLocalPlayer: playerData.isLocalPlayer
                });
            } catch (error) {
                Logger.error('Error processing nameplate data:', error);
            }
        };

        // Listen for Unity messages
        const unsubscribe = listenToUnityMessage("OpenNameplateModal", handleNameplateClick);
        
        return () => {
            if (typeof unsubscribe === "function") {
                unsubscribe();
            }
        };
    }, [listenToUnityMessage]);

    const resetNameplateData = () => {
        setNameplateData(null);
    };

    return [nameplateData, resetNameplateData];
}; 