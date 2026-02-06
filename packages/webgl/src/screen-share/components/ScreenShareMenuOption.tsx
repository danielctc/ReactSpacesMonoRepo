import React from 'react';
import { useScreenShare } from '../hooks/useScreenShare';

export const ScreenShareMenuOption: React.FC = () => {
  const { isSharing, startSharing, stopSharing } = useScreenShare();

  const handleClick = async () => {
    if (isSharing) {
      stopSharing();
    } else {
      try {
        await startSharing();
      } catch (error) {
        console.error('Failed to start screen sharing:', error);
      }
    }
  };

  return (
    <li>
      <button onClick={handleClick} className="flex items-center gap-2">
        {isSharing ? (
          <>
            {/* Stop icon */}
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>Stop Sharing</span>
          </>
        ) : (
          <>
            {/* Monitor icon */}
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>Share Screen</span>
          </>
        )}
      </button>
    </li>
  );
};
