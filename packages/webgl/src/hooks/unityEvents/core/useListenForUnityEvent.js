import { useCallback } from "react";

import { Logger } from '@disruptive-spaces/shared/logging/react-log';

import { useUnity } from "../../../providers/UnityProvider";


export const useListenForUnityEvent = () => {
    const { addEventListener, removeEventListener } = useUnity();

    return useCallback((eventName, callback) => {
        const listener = (jsonData) => {
            Logger.log(eventName + ' unity message received.'); // Log only when an event is received

            let parsedData = null;
            if (jsonData) { // Only attempt to parse if jsonData exists
                try {
                    parsedData = JSON.parse(jsonData);
                } catch (err) {
                    Logger.warn("Failed to parse JSON data from Unity message:", err);
                }
            }

            callback(parsedData); // Always call the callback with the parsed data or null if no jsonData
        };

        addEventListener(eventName, listener);

        return () => {
            removeEventListener(eventName, listener);
        };
    }, [addEventListener, removeEventListener]);
};
