import React, { useEffect } from 'react';
import { AiOutlineFullscreen, AiOutlineFullscreenExit } from "react-icons/ai";
import { useFullscreenContext } from '@disruptive-spaces/shared/providers/FullScreenProvider';

function FullScreenButton() {
    const { isFullscreen, toggleFullscreen, fullscreenRef, isMobile } = useFullscreenContext();
    const [showToast, setShowToast] = React.useState<{message: string; type: string} | null>(null);

    // Add a listener for fullscreen errors
    useEffect(() => {
        const handleFullscreenError = (event: Event) => {
            console.error("Fullscreen error:", event);
            setShowToast({
                message: "Could not enter fullscreen mode. Try tapping the button again or use the browser's fullscreen option.",
                type: 'error'
            });
            setTimeout(() => setShowToast(null), 5000);
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
    }, []);

    const handleToggleFullscreen = () => {
        if (fullscreenRef.current) {
            // For iOS, show a toast with instructions if needed
            if (isMobile && /iPhone|iPad|iPod/i.test(navigator.userAgent) && !isFullscreen) {
                setShowToast({
                    message: "Tap the button again if fullscreen doesn't activate. For iOS, you may need to use the browser's share button and 'Add to Home Screen' for the best experience.",
                    type: 'info'
                });
                setTimeout(() => setShowToast(null), 5000);
            }

            toggleFullscreen();
        } else {
            console.error("Fullscreen target not set");
            setShowToast({
                message: "Could not find fullscreen target element.",
                type: 'error'
            });
            setTimeout(() => setShowToast(null), 3000);
        }
    };

    return (
        <>
            <div className="tooltip" data-tip={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                <button
                    className={`btn btn-ghost ${isMobile ? 'btn-lg' : 'btn-md'}`}
                    onClick={handleToggleFullscreen}
                    aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFullscreen ? <AiOutlineFullscreenExit /> : <AiOutlineFullscreen />}
                </button>
            </div>
            {showToast && (
                <div className="toast toast-top">
                    <div className={`alert ${showToast.type === 'error' ? 'alert-error' : 'alert-info'}`}>
                        <span>{showToast.message}</span>
                    </div>
                </div>
            )}
        </>
    );
}

export default FullScreenButton;
