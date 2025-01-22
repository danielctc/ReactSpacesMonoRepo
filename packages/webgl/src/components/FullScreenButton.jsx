import React from 'react';
import { IconButton, Tooltip } from "@chakra-ui/react";
import { AiOutlineFullscreen, AiOutlineFullscreenExit } from "react-icons/ai";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';

function FullScreenButton() {
    const { isFullscreen, toggleFullscreen, fullscreenRef } = useFullscreenContext();

    const handleToggleFullscreen = () => {
        if (fullscreenRef.current) {
            toggleFullscreen();  // Now, toggleFullscreen needs no parameters
        } else {
            console.error("Fullscreen target not set");
        }
    };

    return (
        <Tooltip label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} hasArrow placement="bottom" closeOnClick portalProps={{ containerRef: fullscreenRef }}>
            <IconButton
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                icon={isFullscreen ? <AiOutlineFullscreenExit /> : <AiOutlineFullscreen />}
                onClick={handleToggleFullscreen}
                variant="iconButton"
            />
        </Tooltip>
    );
}

export default FullScreenButton;
