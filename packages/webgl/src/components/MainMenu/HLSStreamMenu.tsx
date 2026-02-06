import React, { useState, useEffect } from 'react';
import { useHLSStream } from '../../hooks/unityEvents';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface HLSStreamMenuProps {
  spaceID: string;
}

/**
 * HLS Stream controller for the main menu
 */
const HLSStreamMenu: React.FC<HLSStreamMenuProps> = ({ spaceID }) => {
  const { setHLSStreamUrl, playerStatus, isLoading, savedStreamData } = useHLSStream();
  const [streamUrl, setStreamUrl] = useState('');
  const [playerIndex, setPlayerIndex] = useState('0');
  const [isExpanded, setIsExpanded] = useState(false);

  // Update form fields when savedStreamData changes
  useEffect(() => {
    if (savedStreamData) {
      setStreamUrl(savedStreamData.streamUrl || '');
      setPlayerIndex(savedStreamData.playerIndex || '0');
    }
  }, [savedStreamData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL
    if (!streamUrl || !streamUrl.trim()) {
      console.warn('Please enter a valid stream URL');
      return;
    }

    // Validate player index
    if (!playerIndex || isNaN(parseInt(playerIndex))) {
      console.warn('Please enter a valid player index (0, 1, 2, etc.)');
      return;
    }

    // Send to Unity and save to Firebase
    Logger.log(`HLSStreamMenu: Setting HLS stream for LiveProjector[${playerIndex}]`, streamUrl);

    try {
      await setHLSStreamUrl(streamUrl, parseInt(playerIndex));
      console.log(`Stream configured for LiveProjector[${playerIndex}]`);
    } catch (error) {
      Logger.error('HLSStreamMenu: Error setting stream', error);
      console.error('Error setting stream - please try again');
    }
  };

  // Render player status badges
  const renderPlayerStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-2">
          <span className="loading loading-spinner loading-sm mr-2"></span>
          <p className="text-sm text-gray-500">Loading stream status...</p>
        </div>
      );
    }

    if (!playerStatus || Object.keys(playerStatus).length === 0) {
      return <p className="text-sm text-gray-500">No status updates available</p>;
    }

    return (
      <div className="flex flex-col gap-2 mt-2">
        {Object.entries(playerStatus).map(([key, status]: [string, any]) => (
          <div key={key} className="flex justify-between items-center p-2 border border-white/10 rounded-md">
            <p className="text-sm font-bold">
              {status.identifier}[{status.playerIndex}]
            </p>
            <div className="flex gap-1">
              <span className={`badge badge-xs ${status.isReady ? 'badge-success' : 'badge-error'}`}>
                {status.isReady ? 'Ready' : 'Not Ready'}
              </span>
              <span className={`badge badge-xs ${status.isPlaying ? 'badge-info' : 'badge-neutral'}`}>
                {status.isPlaying ? 'Playing' : 'Not Playing'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <button
        className="btn btn-ghost w-full justify-between mb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span>HLS Streaming</span>
          {isLoading && <span className="loading loading-spinner loading-xs"></span>}
          {savedStreamData && !isLoading && <span className="badge badge-success badge-xs">Active</span>}
        </div>
        <span>{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-4 border border-white/10 rounded-md mb-4">
          {savedStreamData && (
            <div className="alert alert-info mb-4 text-xs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <p>Saved stream: {savedStreamData.streamUrl}</p>
                <p>Player index: {savedStreamData.playerIndex}</p>
                {savedStreamData.updatedAt && (
                  <p>Last updated: {new Date(savedStreamData.updatedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <label className="form-control w-full">
                <span className="label text-sm">Player Index</span>
                <input
                  type="text"
                  value={playerIndex}
                  onChange={(e) => setPlayerIndex(e.target.value)}
                  placeholder="0"
                  className="input input-sm input-bordered"
                  disabled={isLoading}
                />
              </label>

              <label className="form-control w-full">
                <span className="label text-sm">Stream URL (HLS)</span>
                <input
                  type="text"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="https://example.com/stream.m3u8"
                  className="input input-sm input-bordered"
                  disabled={isLoading}
                />
              </label>

              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving Stream
                  </>
                ) : (
                  'Set Stream'
                )}
              </button>

              {spaceID && (
                <p className="text-xs text-gray-500">Stream will be saved to space: {spaceID}</p>
              )}
            </div>
          </form>

          <div className="divider"></div>

          <h4 className="text-xs font-bold mb-2">Player Status</h4>
          {renderPlayerStatus()}
        </div>
      )}
    </div>
  );
};

export default HLSStreamMenu;
