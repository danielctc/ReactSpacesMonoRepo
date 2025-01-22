import { useState, useEffect } from "react";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

import { useListenForUnityEvent } from "./core/useListenForUnityEvent";

export const useUnityOnFirstSceneLoaded = () => {
    const [isFirstSceneLoaded, setIsFirstSceneLoaded] = useState(false);
    const listenToUnityMessage = useListenForUnityEvent();

    useEffect(() => {
        const handleFirstSceneLoaded = () => {
            Logger.log('FirstSceneLoaded unity message received.');
            setIsFirstSceneLoaded(true);
        };

        // Register the event listener
        const unsubscribe = listenToUnityMessage("FirstSceneLoaded", handleFirstSceneLoaded);

        // Cleanup function to unregister the event listener
        return () => {
            unsubscribe();
        };
    }, [listenToUnityMessage]);

    return isFirstSceneLoaded;  // Return the boolean state directly
};
