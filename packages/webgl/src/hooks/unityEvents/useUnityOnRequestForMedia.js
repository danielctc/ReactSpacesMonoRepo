
import { useState, useEffect } from "react";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";

export const useUnityOnRequestForMedia = () => {
    const [eventData, setEventData] = useState(null);

    // Getting the function to listen for Unity messages
    const listenToUnityMessage = useListenForUnityEvent();

    useEffect(() => {
        const handleRequestForMedia = (data) => {
            alert("Received RequestForMedia event with data:", data);
            setEventData(data);
        };

        // Registering the listener for the "HelloFromUnity" event
        const unsubscribe = listenToUnityMessage("RequestForMedia ", handleRequestForMedia);

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
