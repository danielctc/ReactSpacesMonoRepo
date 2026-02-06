import React, { useState, useEffect } from "react";
import { useHLSStream } from "../../hooks/unityEvents/useHLSStream";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { FaSync } from "react-icons/fa";

interface StatusUpdate {
  id: number;
  message: string;
  timestamp: string;
}

/**
 * Test component for HLS streaming integration with Unity
 */
const HLSStreamTest: React.FC = () => {
  const { setHLSStreamUrl, playerStatus, isLoading, savedStreamData, reloadStreamData } = useHLSStream();
  const [streamUrl, setStreamUrl] = useState("");
  const [playerIndex, setPlayerIndex] = useState("0");
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);

  // Update form fields when savedStreamData changes
  useEffect(() => {
    if (savedStreamData) {
      setStreamUrl(savedStreamData.streamUrl || "");
      setPlayerIndex(savedStreamData.playerIndex || "0");
      addStatusUpdate(`Loaded saved stream: ${savedStreamData.streamUrl}`);

      if (savedStreamData.enabled === false) {
        addStatusUpdate("Note: Streaming is currently disabled for this space");
      }
    }
  }, [savedStreamData]);

  // Update status when playerStatus changes
  useEffect(() => {
    if (playerStatus && Object.keys(playerStatus).length > 0) {
      Object.entries(playerStatus).forEach(([key, status]) => {
        const statusMessage = `LiveProjector[${status.playerIndex}] status: isReady=${status.isReady}, isPlaying=${status.isPlaying}`;
        addStatusUpdate(statusMessage);
      });
    }
  }, [playerStatus]);

  // Function to set HLS stream URL
  const handleSetHLSStream = () => {
    // Validate URL
    if (!streamUrl.trim()) {
      addStatusUpdate("Error: Please enter a valid stream URL");
      return;
    }

    Logger.log("HLSStreamTest: Setting HLS stream URL", {
      playerIndex,
      streamUrl
    });

    // Maintain the enabled status and other fields from existing data
    const additionalOptions = savedStreamData ? {
      enabled: savedStreamData.enabled !== false,
      rtmpUrl: savedStreamData.rtmpUrl || '',
      streamKey: savedStreamData.streamKey || ''
    } : {};

    // Use the hook to set the URL
    setHLSStreamUrl(streamUrl, parseInt(playerIndex), additionalOptions);

    // Add to log
    addStatusUpdate(`Sent stream URL to LiveProjector[${playerIndex}]: ${streamUrl}`);
  };

  // Handle reloading saved stream
  const handleReloadStream = () => {
    addStatusUpdate("Reloading saved stream from Firebase");
    reloadStreamData();
  };

  // Handle direct send to Unity without reloading from Firebase
  const handleDirectSendToUnity = () => {
    if (savedStreamData && savedStreamData.streamUrl) {
      addStatusUpdate("Directly sending saved stream to Unity");
      setHLSStreamUrl(savedStreamData.streamUrl, parseInt(savedStreamData.playerIndex || "0"));
    }
  };

  // Add a status update to the log
  const addStatusUpdate = (message: string) => {
    setStatusUpdates(prev => [...prev, {
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  return (
    <div className="p-4 border rounded-lg shadow-md w-full bg-base-100">
      <h2 className="text-lg font-bold mb-4">HLS Stream Test</h2>

      {savedStreamData && (
        <div className="alert alert-info mb-4 text-sm">
          <div className="flex w-full items-center justify-between">
            <div className="flex-1">
              <p>Currently saved stream:</p>
              <p className="font-bold break-all">{savedStreamData.streamUrl}</p>
              <p className="text-sm">Player Index: {savedStreamData.playerIndex}</p>
              {savedStreamData.enabled === false && (
                <span className="badge badge-error mt-1">Streaming Disabled</span>
              )}
              {savedStreamData.rtmpUrl && (
                <p className="text-xs mt-1">RTMP URL: {savedStreamData.rtmpUrl}</p>
              )}
              {savedStreamData.updatedAt && (
                <p className="text-xs mt-1">Last updated: {new Date(savedStreamData.updatedAt).toLocaleString()}</p>
              )}
            </div>
            <button
              className="btn btn-sm btn-outline btn-primary ml-2"
              onClick={handleReloadStream}
              disabled={isLoading}
            >
              {isLoading ? <span className="loading loading-spinner loading-xs"></span> : <FaSync />}
              Reload
            </button>
            <button
              className="btn btn-sm btn-outline btn-secondary ml-2"
              onClick={handleDirectSendToUnity}
              disabled={isLoading}
            >
              Send to Unity
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Player Index"
            value={playerIndex}
            onChange={(e) => setPlayerIndex(e.target.value)}
            className="input input-bordered w-full md:w-24"
          />

          <input
            type="text"
            placeholder="HLS Stream URL"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            className="input input-bordered flex-1"
          />

          <button
            className="btn btn-primary w-full md:w-auto"
            onClick={handleSetHLSStream}
            disabled={!streamUrl.trim() || isLoading}
          >
            {isLoading ? <span className="loading loading-spinner loading-sm"></span> : null}
            Set Stream
          </button>
        </div>

        <div>
          <p className="font-bold mb-2">Status Updates:</p>
          <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
            {statusUpdates.length === 0 ? (
              <p className="text-gray-500">No updates yet</p>
            ) : (
              statusUpdates.map(update => (
                <div key={update.id} className="mb-1 text-sm">
                  <span className="text-gray-500 text-xs mr-2">
                    [{update.timestamp}]
                  </span>
                  {update.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HLSStreamTest;
