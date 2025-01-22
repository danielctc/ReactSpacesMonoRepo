import { useEffect, useContext } from "react";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useUnityOnRequestUser = () => {
    const listenToUnityMessage = useListenForUnityEvent();
    const { sendUserToUnity } = useContext(UserContext);

    useEffect(() => {
        const handleRequestUserFromUnity = () => {
            Logger.log("React: Request from Unity to send user data");
            sendUserToUnity(); // Send user data to Unity when requested
        };

        // Register listener for the "RequestUserForUnity" event
        const unsubscribe = listenToUnityMessage("RequestUserForUnity", handleRequestUserFromUnity);

        // Clean up listener on component unmount
        return () => {
            unsubscribe();
        };
    }, [listenToUnityMessage, sendUserToUnity]);

    return true;
};
