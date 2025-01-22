import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

const FullscreenContext = createContext();

export const useFullscreenContext = () => useContext(FullscreenContext);

export const FullScreenProvider = ({ children }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenRef = useRef(null);

    const setFullscreenRef = useCallback((node) => {
        fullscreenRef.current = node;
    }, []);

    const toggleFullscreen = useCallback(() => {
        const element = fullscreenRef.current;
        if (!document.fullscreenElement) {
            if (element && element.requestFullscreen) {
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
    }, []);

    return (
        <FullscreenContext.Provider value={{ isFullscreen, toggleFullscreen, fullscreenRef, setFullscreenRef }}>
            <div ref={setFullscreenRef} style={{ position: 'relative', zIndex: 1 }}>
                {children}
            </div>
        </FullscreenContext.Provider>
    );
};
