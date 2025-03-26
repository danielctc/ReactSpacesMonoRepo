import React, { useState, useEffect } from "react";
import { useHLSStream } from "../hooks/unityEvents";
import { Box, Button, Text, Input, Stack, Flex, Badge, Select, Spinner, Alert, AlertIcon } from "@chakra-ui/react";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { useUnity } from "../providers/UnityProvider";
import { FaSync } from "react-icons/fa";

/**
 * Component for controlling HLS streams for a specific space
 */
const SpaceHLSStreamController = () => {
  const { spaceID } = useUnity();
  const { setHLSStreamUrl, playerStatus, isLoading: isStreamLoading, savedStreamData, reloadStreamData } = useHLSStream();
  const [streamUrl, setStreamUrl] = useState("");
  const [playerIndex, setPlayerIndex] = useState("0");
  const [screens, setScreens] = useState([]);
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
  const fetchScreensForSpace = (spaceID) => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock data - in production, this would come from an API
      const mockScreens = [
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
  const handleScreenChange = (e) => {
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
          <Flex justify="center" p={4}>
            <Spinner size="sm" mr={2} />
            <Text>Loading stream status...</Text>
          </Flex>
        );
      }
      return <Text>No player status updates received yet</Text>;
    }

    return Object.entries(playerStatus).map(([key, status]) => {
      // Find screen for this player index
      const screen = screens.find(s => s.playerIndex === status.playerIndex);
      const screenName = screen ? screen.name : `Player ${status.playerIndex}`;
      
      return (
        <Box key={key} p={3} borderWidth="1px" borderRadius="md" mb={2}>
          <Text fontWeight="bold">{screenName} (LiveProjector[{status.playerIndex}])</Text>
          <Flex mt={2}>
            <Badge colorScheme={status.isReady ? "green" : "red"} mr={2}>
              {status.isReady ? "Ready" : "Not Ready"}
            </Badge>
            <Badge colorScheme={status.isPlaying ? "blue" : "gray"}>
              {status.isPlaying ? "Playing" : "Not Playing"}
            </Badge>
          </Flex>
        </Box>
      );
    });
  };

  if (!spaceID) {
    return <Text>No space ID available</Text>;
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="md" maxW="500px">
      <Text fontSize="xl" fontWeight="bold" mb={1}>HLS Stream Controller</Text>
      <Flex align="center" mb={4}>
        <Text fontSize="sm" color="gray.600">Space ID: {spaceID}</Text>
        {savedStreamData && (
          <Badge ml={2} colorScheme="green">Active Stream</Badge>
        )}
      </Flex>
      
      {savedStreamData && (
        <Alert status="info" mb={4} size="sm">
          <Flex width="100%" align="center" justify="space-between">
            <Box flex="1">
              <Text>Currently active stream:</Text>
              <Text fontWeight="bold" wordBreak="break-all">{savedStreamData.streamUrl}</Text>
              <Text fontSize="sm">Player Index: {savedStreamData.playerIndex}</Text>
              {savedStreamData.updatedAt && (
                <Text fontSize="xs" mt={1}>Last updated: {new Date(savedStreamData.updatedAt).toLocaleString()}</Text>
              )}
            </Box>
            <Button 
              size="sm" 
              colorScheme="blue" 
              variant="outline" 
              leftIcon={<FaSync />}
              onClick={handleReloadSavedStream}
              isLoading={isStreamLoading}
              ml={2}
            >
              Reload
            </Button>
          </Flex>
        </Alert>
      )}
      
      <Stack spacing={4}>
        <Box>
          <Text mb={1}>Select Screen:</Text>
          <Select
            value={selectedScreen}
            onChange={handleScreenChange}
            placeholder="Select a screen"
            isDisabled={isLoading || screens.length === 0}
          >
            {screens.map(screen => (
              <option key={screen.id} value={screen.id}>
                {screen.name} (Player {screen.playerIndex})
              </option>
            ))}
          </Select>
        </Box>
        
        <Box>
          <Text mb={1}>HLS Stream URL:</Text>
          <Input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="Enter HLS stream URL (.m3u8)"
          />
        </Box>
        
        <Button 
          colorScheme="blue" 
          onClick={handleLoadStream}
          isDisabled={!selectedScreen || !streamUrl || isStreamLoading}
          isLoading={isStreamLoading}
          loadingText="Saving Stream"
        >
          Set Stream
        </Button>
        
        <Box mt={4}>
          <Flex align="center" mb={2}>
            <Text fontSize="lg" fontWeight="semibold">Player Status:</Text>
            {isStreamLoading && <Spinner size="sm" ml={2} />}
          </Flex>
          {renderPlayerStatus()}
        </Box>
      </Stack>
    </Box>
  );
};

export default SpaceHLSStreamController; 