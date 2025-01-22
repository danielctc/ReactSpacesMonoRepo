import { useEffect, useContext } from "react";
import { useListenForUnityEvent } from "./core/useListenForUnityEvent";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";

export const useUnityOnStoreUserData = () => {
    const listenToUnityMessage = useListenForUnityEvent();
    const userContext = useContext(UserContext);

    useEffect(() => {
        const handleStoreUserData = (eventDataJson) => {
            try {
                const eventData = JSON.parse(eventDataJson);
                if (userContext && eventData) {
                    // Ensure that the eventData contains the required properties
                    const requiredProperties = ["uid"];
                    const isDataValid = requiredProperties.every(prop => eventData.hasOwnProperty(prop));

                    if (isDataValid) {
                        // Update the Firestore user data using the updateFirestoreUser function
                        userContext.updateFirestoreUser(eventData);
                    } else {
                        console.error("Invalid userData payload from Unity:", eventData);
                    }
                }
            } catch (error) {
                console.error("Error parsing event data:", error);
            }
        };

        const event = listenToUnityMessage("StoreUserData", handleStoreUserData);

        return () => {
            event();
        };
    }, [listenToUnityMessage, userContext]);

    return [];
};
