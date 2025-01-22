// src/hooks/unityEvents/useUnityOnHelloFromUnity.js

import { useState, useEffect } from "react";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";

export const useUnityOnHelloFromUnity = () => {
    const [eventData, setEventData] = useState(null);

    // Getting the function to listen for Unity messages
    const listenToUnityMessage = useListenForUnityEvent();

    useEffect(() => {
        const handleHelloFromUnity = (data) => {
            Logger.log("Received HelloFromUnity event with data:", data);
            setEventData(data);
        };

        // Registering the listener for the "HelloFromUnity" event
        const unsubscribe = listenToUnityMessage("HelloFromUnity", handleHelloFromUnity);

        // Clean up listener on component unmount
        return () => {
            unsubscribe();
        };
    }, [listenToUnityMessage]);

    // Function to reset eventData
    const resetEventData = () => {
        setEventData(null);
    };

    return [eventData, resetEventData];
};
