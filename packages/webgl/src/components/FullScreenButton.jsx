import React, { useEffect } from 'react';
import { IconButton, Tooltip, useToast } from "@chakra-ui/react";
import { AiOutlineFullscreen, AiOutlineFullscreenExit } from "react-icons/ai";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';

function FullScreenButton() {
    const { isFullscreen, toggleFullscreen, fullscreenRef, isMobile } = useFullscreenContext();
    const toast = useToast();

    // Add a listener for fullscreen errors
    useEffect(() => {
        const handleFullscreenError = (event) => {
            console.error("Fullscreen error:", event);
            toast({
                title: "Fullscreen Error",
                description: "Could not enter fullscreen mode. Try tapping the button again or use the browser's fullscreen option.",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "top"
            });
        };

        document.addEventListener('fullscreenerror', handleFullscreenError);
        document.addEventListener('webkitfullscreenerror', handleFullscreenError);
        document.addEventListener('mozfullscreenerror', handleFullscreenError);
        document.addEventListener('MSFullscreenError', handleFullscreenError);

        return () => {
            document.removeEventListener('fullscreenerror', handleFullscreenError);
            document.removeEventListener('webkitfullscreenerror', handleFullscreenError);
            document.removeEventListener('mozfullscreenerror', handleFullscreenError);
            document.removeEventListener('MSFullscreenError', handleFullscreenError);
        };
    }, [toast]);

    const handleToggleFullscreen = () => {
        if (fullscreenRef.current) {
            // For iOS, show a toast with instructions if needed
            if (isMobile && /iPhone|iPad|iPod/i.test(navigator.userAgent) && !isFullscreen) {
                toast({
                    title: "Mobile Fullscreen",
                    description: "Tap the button again if fullscreen doesn't activate. For iOS, you may need to use the browser's share button and 'Add to Home Screen' for the best experience.",
                    status: "info",
                    duration: 5000,
                    isClosable: true,
                    position: "top"
                });
            }
            
            toggleFullscreen();
        } else {
            console.error("Fullscreen target not set");
            toast({
                title: "Fullscreen Error",
                description: "Could not find fullscreen target element.",
                status: "error",
                duration: 3000,
                isClosable: true,
                position: "top"
            });
        }
    };

    return (
        <Tooltip 
            label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} 
            hasArrow 
            placement="bottom" 
            closeOnClick 
            portalProps={{ containerRef: fullscreenRef }}
        >
            <IconButton
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                icon={isFullscreen ? <AiOutlineFullscreenExit /> : <AiOutlineFullscreen />}
                onClick={handleToggleFullscreen}
                variant="iconButton"
                // Make the button more prominent on mobile
                size={isMobile ? "lg" : "md"}
            />
        </Tooltip>
    );
}

export default FullScreenButton;
