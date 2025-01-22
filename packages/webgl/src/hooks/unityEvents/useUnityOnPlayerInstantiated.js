import { useState, useEffect } from "react";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useUnityOnPlayerInstantiated = () => {
    const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);

    // Getting the function to listen for Unity messages
    const listenToUnityMessage = useListenForUnityEvent();

    useEffect(() => {
        const handlePlayerInstantiated = () => {
            Logger.log("Received PlayerInstantiated event from Unity");
            setIsPlayerInstantiated(true);
        };

        // Registering the listener for the "PlayerInstantiated" event
        const unsubscribe = listenToUnityMessage("PlayerInstantiated", handlePlayerInstantiated);

        Logger.log("Listening for PlayerInstantiated events");

        // Clean up listener on component unmount
        return () => {
            unsubscribe();
        };
    }, [listenToUnityMessage]);

    return isPlayerInstantiated;
};
