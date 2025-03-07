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

        // Handle iOS devices
        if (isMobile) {
            if (element.webkitEnterFullscreen) {
                if (!document.webkitFullscreenElement) {
                    element.webkitEnterFullscreen();
                    setIsFullscreen(true);
                } else {
                    document.webkitExitFullscreen();
                    setIsFullscreen(false);
                }
            }
            return;
        }

        // Handle standard Fullscreen API
        if (!document.fullscreenElement) {
            if (element.requestFullscreen) {
                element.requestFullscreen().then(() => {
                    setIsFullscreen(true);
                }).catch(err => console.error("Error entering fullscreen:", err));
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    setIsFullscreen(false);
                }).catch(err => console.error("Error exiting fullscreen:", err));
            }
        }
    }, [isMobile]);

    // Handle fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        const handleWebkitFullscreenChange = () => {
            setIsFullscreen(!!document.webkitFullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleWebkitFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleWebkitFullscreenChange);
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
