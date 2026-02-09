import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ScreenShareContextValue } from '@spaces/shared/types/screen-share.types';

export const ScreenShareContext = createContext<ScreenShareContextValue | undefined>(undefined);

interface ScreenShareProviderProps {
  children: ReactNode;
}

export const ScreenShareProvider: React.FC<ScreenShareProviderProps> = ({ children }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const stopSharing = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
      });
      setLocalStream(null);
      setIsSharing(false);
    }
  }, [localStream]);

  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Listen for when user stops sharing via browser UI
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          stopSharing();
        });
      });

      setLocalStream(stream);
      setIsSharing(true);
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      throw error;
    }
  }, [stopSharing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, [localStream]);

  const value: ScreenShareContextValue = {
    isSharing,
    localStream,
    startSharing,
    stopSharing,
  };

  return (
    <ScreenShareContext.Provider value={value}>
      {children}
    </ScreenShareContext.Provider>
  );
};

const defaultScreenShareContext: ScreenShareContextValue = {
  isSharing: false,
  localStream: null,
  startSharing: async () => {},
  stopSharing: () => {},
};

export const useScreenShareContext = (): ScreenShareContextValue => {
  const context = useContext(ScreenShareContext);
  return context ?? defaultScreenShareContext;
};
