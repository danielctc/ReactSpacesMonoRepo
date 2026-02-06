import React from "react";
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
        <button onClick={handleButtonClick} className="btn btn-primary">
            Execute Emote
        </button>
    );
}

export default EmoteButton;
