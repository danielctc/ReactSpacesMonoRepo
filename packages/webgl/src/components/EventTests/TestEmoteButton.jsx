import React from "react";
import { Button } from "@chakra-ui/react";
import { useSendUnityEvent } from "../../hooks/unityEvents";

function EmoteButton() {
    const sendUnityEvent = useSendUnityEvent();


    // When React Button is clicked, send message to Unity.
    const handleButtonClick = () => {
        const emoteTestData = {
            emoteType: ""
        };
        sendUnityEvent("EmoteTest", emoteTestData);
    };

    return (
        <Button onClick={handleButtonClick}>
            Execute Emote
        </Button>
    );
}

export default EmoteButton;


