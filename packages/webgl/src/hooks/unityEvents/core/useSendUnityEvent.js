import { useCallback, useEffect, useRef } from "react";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from "../../../providers/UnityProvider";

export const useSendUnityEvent = () => {
    const { sendMessage, isLoaded } = useUnity(); // Access isLoaded from the Unity context
    const messageQueueRef = useRef([]);

    const processQueue = useCallback(() => {
        // Only process messages if Unity is loaded
        if (isLoaded) {
            while (messageQueueRef.current.length > 0) {
                const { eventName, data } = messageQueueRef.current.shift();
                Logger.log("useSendUnityEvent: Processing queued event to Unity:", eventName, data);
                try {
                    sendMessage("ReactIncomingEvent", "HandleEvent", JSON.stringify({ eventName, data: JSON.stringify(data) }));
                } catch (error) {
                    Logger.error("useSendUnityEvent: Error sending event to Unity:", error);
                    // Retry mechanism: Push the failed message back to the queue
                    messageQueueRef.current.unshift({ eventName, data });
                    break; // Exit the loop to prevent infinite retries
                }
            }
        }
    }, [sendMessage, isLoaded]);

    // Effect to process the queue continuously
    useEffect(() => {
        const intervalId = setInterval(() => {
            processQueue();
        }, 1000); // Adjust the interval as needed

        return () => clearInterval(intervalId);
    }, [processQueue]);

    const queueMessage = useCallback((eventName, data) => {
        Logger.log("useSendUnityEvent: Queuing event for Unity:", eventName);
        messageQueueRef.current.push({ eventName, data });
        processQueue(); // Try processing immediately if Unity is already loaded
    }, [processQueue]);

    return queueMessage;
};
