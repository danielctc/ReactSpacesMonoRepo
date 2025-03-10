import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

const FullscreenContext = createContext();

export const useFullscreenContext = () => useContext(FullscreenContext);

export const FullScreenProvider = ({ children }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if device is mobile
        const checkMobile = () => {
            const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const setFullscreenRef = useCallback((node) => {
        fullscreenRef.current = node;
    }, []);

    const toggleFullscreen = useCallback(() => {
        const element = fullscreenRef.current;
        if (!element) return;

        // Check if we're already in fullscreen
        const isCurrentlyFullscreen = 
            document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement;

        // Handle mobile devices
        if (isMobile) {
            console.log("Attempting mobile fullscreen...");
            
            // Try to use the video element for iOS (if it exists)
            const videoElement = element.querySelector('video') || element;
            
            // iOS Safari specific handling
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                if (videoElement.webkitEnterFullscreen) {
                    try {
                        videoElement.webkitEnterFullscreen();
                        setIsFullscreen(true);
                        return;
                    } catch (err) {
                        console.error("iOS fullscreen error:", err);
                    }
                }
                
                // Fallback for iOS
                try {
                    if (videoElement.webkitRequestFullscreen) {
                        videoElement.webkitRequestFullscreen();
                        setIsFullscreen(true);
                        return;
                    }
                } catch (err) {
                    console.error("iOS fallback fullscreen error:", err);
                }
            }
            
            // Android handling
            if (/Android/i.test(navigator.userAgent)) {
                try {
                    if (!isCurrentlyFullscreen) {
                        // Try all possible methods
                        if (element.requestFullscreen) {
                            element.requestFullscreen();
                        } else if (element.webkitRequestFullscreen) {
                            element.webkitRequestFullscreen();
                        } else if (element.mozRequestFullScreen) {
                            element.mozRequestFullScreen();
                        } else if (element.msRequestFullscreen) {
                            element.msRequestFullscreen();
                        }
                        setIsFullscreen(true);
                    } else {
                        // Exit fullscreen
                        if (document.exitFullscreen) {
                            document.exitFullscreen();
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        } else if (document.mozCancelFullScreen) {
                            document.mozCancelFullScreen();
                        } else if (document.msExitFullscreen) {
                            document.msExitFullscreen();
                        }
                        setIsFullscreen(false);
                    }
                    return;
                } catch (err) {
                    console.error("Android fullscreen error:", err);
                }
            }
        }

        // Handle standard Fullscreen API for desktop
        try {
            if (!isCurrentlyFullscreen) {
                if (element.requestFullscreen) {
                    element.requestFullscreen().then(() => {
                        setIsFullscreen(true);
                    }).catch(err => console.error("Error entering fullscreen:", err));
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                    setIsFullscreen(true);
                } else if (element.mozRequestFullScreen) {
                    element.mozRequestFullScreen();
                    setIsFullscreen(true);
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                    setIsFullscreen(true);
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().then(() => {
                        setIsFullscreen(false);
                    }).catch(err => console.error("Error exiting fullscreen:", err));
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                    setIsFullscreen(false);
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                    setIsFullscreen(false);
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                    setIsFullscreen(false);
                }
            }
        } catch (err) {
            console.error("Fullscreen error:", err);
        }
    }, [isMobile]);

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = 
                document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement || 
                document.msFullscreenElement;
            setIsFullscreen(!!isCurrentlyFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    return (
        <FullscreenContext.Provider value={{ isFullscreen, toggleFullscreen, fullscreenRef, setFullscreenRef, isMobile }}>
            <div 
                ref={setFullscreenRef} 
                style={{ 
                    position: 'relative', 
                    zIndex: 1,
                    // Add these styles for better mobile support
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden'
                }}
            >
                {children}
            </div>
        </FullscreenContext.Provider>
    );
};
