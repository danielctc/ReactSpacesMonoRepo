import React, { useState, useEffect } from "react";
import { useHLSStream } from "../hooks/unityEvents";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from "../providers/UnityProvider";
import { FaSync } from "react-icons/fa";

interface Screen {
  id: string;
  name: string;
  playerIndex: string;
}

/**
 * Component for controlling HLS streams for a specific space
 */
const SpaceHLSStreamController: React.FC = () => {
  const { spaceID } = useUnity();
  const { setHLSStreamUrl, playerStatus, isLoading: isStreamLoading, savedStreamData, reloadStreamData } = useHLSStream();
  const [streamUrl, setStreamUrl] = useState("");
  const [playerIndex, setPlayerIndex] = useState("0");
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedScreen, setSelectedScreen] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Update form fields when savedStreamData changes
  useEffect(() => {
    if (savedStreamData) {
      setStreamUrl(savedStreamData.streamUrl || "");
      setPlayerIndex(savedStreamData.playerIndex || "0");
    }
  }, [savedStreamData]);

  // Fetch screens for this space when component mounts or spaceID changes
  useEffect(() => {
    if (spaceID) {
      Logger.log(`SpaceHLSStreamController: Initializing for space ID ${spaceID}`);
      fetchScreensForSpace(spaceID);
    }
  }, [spaceID]);

  // Mock function to fetch screens - in a real implementation, this would query a database
  const fetchScreensForSpace = (spaceID: string) => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Mock data - in production, this would come from an API
      const mockScreens: Screen[] = [
        { id: "screen1", name: "Main Screen", playerIndex: "0" },
        { id: "screen2", name: "Side Screen", playerIndex: "1" },
        { id: "screen3", name: "Presentation Screen", playerIndex: "2" }
      ];

      setScreens(mockScreens);
      setIsLoading(false);

      // Auto-select first screen
      if (mockScreens.length > 0) {
        setSelectedScreen(mockScreens[0].id);
        setPlayerIndex(mockScreens[0].playerIndex);
      }
    }, 500);
  };

  // Handle screen selection
  const handleScreenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const screenId = e.target.value;
    setSelectedScreen(screenId);

    // Set playerIndex based on selected screen
    const screen = screens.find(s => s.id === screenId);
    if (screen) {
      setPlayerIndex(screen.playerIndex);
    }
  };

  // Handle loading the stream
  const handleLoadStream = () => {
    if (!selectedScreen) {
      Logger.warn("SpaceHLSStreamController: No screen selected");
      return;
    }

    Logger.log(`SpaceHLSStreamController: Loading stream for LiveProjector[${playerIndex}] in space ${spaceID}`, {
      screen: selectedScreen,
      url: streamUrl
    });

    setHLSStreamUrl(streamUrl, parseInt(playerIndex));
  };

  // Force reload the saved stream
  const handleReloadSavedStream = () => {
    if (savedStreamData && savedStreamData.streamUrl) {
      Logger.log("SpaceHLSStreamController: Reloading saved stream");
      reloadStreamData();
    }
  };

  // Render player status badges
  const renderPlayerStatus = () => {
    if (!playerStatus || Object.keys(playerStatus).length === 0) {
      if (isStreamLoading) {
        return (
          <div className="flex justify-center p-4">
            <span className="loading loading-spinner loading-sm mr-2"></span>
            <p>Loading stream status...</p>
          </div>
        );
      }
      return <p>No player status updates received yet</p>;
    }

    return Object.entries(playerStatus).map(([key, status]) => {
      // Find screen for this player index
      const screen = screens.find(s => s.playerIndex === status.playerIndex);
      const screenName = screen ? screen.name : `Player ${status.playerIndex}`;

      return (
        <div key={key} className="p-3 border rounded-md mb-2">
          <p className="font-bold">{screenName} (LiveProjector[{status.playerIndex}])</p>
          <div className="flex mt-2 gap-2">
            <span className={`badge ${status.isReady ? 'badge-success' : 'badge-error'}`}>
              {status.isReady ? "Ready" : "Not Ready"}
            </span>
            <span className={`badge ${status.isPlaying ? 'badge-info' : 'badge-ghost'}`}>
              {status.isPlaying ? "Playing" : "Not Playing"}
            </span>
          </div>
        </div>
      );
    });
  };

  if (!spaceID) {
    return <p>No space ID available</p>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-md max-w-lg">
      <p className="text-xl font-bold mb-1">HLS Stream Controller</p>
      <div className="flex items-center mb-4">
        <p className="text-sm text-gray-600">Space ID: {spaceID}</p>
        {savedStreamData && (
          <span className="badge badge-success ml-2">Active Stream</span>
        )}
      </div>

      {savedStreamData && (
        <div className="alert alert-info mb-4 text-sm">
          <div className="flex w-full items-center justify-between">
            <div className="flex-1">
              <p>Currently active stream:</p>
              <p className="font-bold break-all">{savedStreamData.streamUrl}</p>
              <p className="text-sm">Player Index: {savedStreamData.playerIndex}</p>
              {savedStreamData.updatedAt && (
                <p className="text-xs mt-1">Last updated: {new Date(savedStreamData.updatedAt).toLocaleString()}</p>
              )}
            </div>
            <button
              className="btn btn-sm btn-outline btn-primary ml-2"
              onClick={handleReloadSavedStream}
              disabled={isStreamLoading}
            >
              {isStreamLoading ? <span className="loading loading-spinner loading-xs"></span> : <FaSync />}
              Reload
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1">Select Screen:</p>
          <select
            value={selectedScreen}
            onChange={handleScreenChange}
            className="select select-bordered w-full"
            disabled={isLoading || screens.length === 0}
          >
            <option value="">Select a screen</option>
            {screens.map(screen => (
              <option key={screen.id} value={screen.id}>
                {screen.name} (Player {screen.playerIndex})
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1">HLS Stream URL:</p>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="Enter HLS stream URL (.m3u8)"
            className="input input-bordered w-full"
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleLoadStream}
          disabled={!selectedScreen || !streamUrl || isStreamLoading}
        >
          {isStreamLoading ? <span className="loading loading-spinner loading-sm"></span> : null}
          Set Stream
        </button>

        <div className="mt-4">
          <div className="flex items-center mb-2">
            <p className="text-lg font-semibold">Player Status:</p>
            {isStreamLoading && <span className="loading loading-spinner loading-sm ml-2"></span>}
          </div>
          {renderPlayerStatus()}
        </div>
      </div>
    </div>
  );
};

export default SpaceHLSStreamController;
