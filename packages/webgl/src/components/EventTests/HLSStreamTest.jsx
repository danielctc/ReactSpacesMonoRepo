import React, { useState, useEffect } from "react";
import { Box, Button, Text, Input, Stack, Flex, Badge, Heading, Alert, AlertIcon, useToast } from "@chakra-ui/react";
import { useHLSStream } from "../../hooks/unityEvents/useHLSStream";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { FaSync } from "react-icons/fa";

/**
 * Test component for HLS streaming integration with Unity
 */
const HLSStreamTest = () => {
  const { setHLSStreamUrl, playerStatus, isLoading, savedStreamData, reloadStreamData } = useHLSStream();
  const [streamUrl, setStreamUrl] = useState("");
  const [playerIndex, setPlayerIndex] = useState("0");
  const [statusUpdates, setStatusUpdates] = useState([]);
  const toast = useToast();

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
  const addStatusUpdate = (message) => {
    setStatusUpdates(prev => [...prev, {
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" boxShadow="md" width="100%">
      <Heading size="md" mb={4}>HLS Stream Test</Heading>
      
      {savedStreamData && (
        <Alert status="info" mb={4} size="sm">
          <Flex width="100%" align="center" justify="space-between">
            <Box flex="1">
              <Text>Currently saved stream:</Text>
              <Text fontWeight="bold" wordBreak="break-all">{savedStreamData.streamUrl}</Text>
              <Text fontSize="sm">Player Index: {savedStreamData.playerIndex}</Text>
              {savedStreamData.enabled === false && (
                <Badge colorScheme="red" mt={1}>Streaming Disabled</Badge>
              )}
              {savedStreamData.rtmpUrl && (
                <Text fontSize="xs" mt={1}>RTMP URL: {savedStreamData.rtmpUrl}</Text>
              )}
              {savedStreamData.updatedAt && (
                <Text fontSize="xs" mt={1}>Last updated: {new Date(savedStreamData.updatedAt).toLocaleString()}</Text>
              )}
            </Box>
            <Button 
              size="sm" 
              colorScheme="blue" 
              variant="outline" 
              leftIcon={<FaSync />}
              onClick={handleReloadStream}
              isLoading={isLoading}
              ml={2}
            >
              Reload
            </Button>
            <Button 
              size="sm" 
              colorScheme="purple" 
              variant="outline"
              onClick={handleDirectSendToUnity}
              isLoading={isLoading}
              ml={2}
            >
              Send to Unity
            </Button>
          </Flex>
        </Alert>
      )}
      
      <Stack spacing={4} direction="column">
        <Flex wrap="wrap" gap={2}>
          <Input
            placeholder="Player Index"
            value={playerIndex}
            onChange={(e) => setPlayerIndex(e.target.value)}
            width={{ base: "100%", md: "100px" }}
            mb={{ base: 2, md: 0 }}
          />
          
          <Input
            placeholder="HLS Stream URL"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            flex="1"
            mb={{ base: 2, md: 0 }}
          />
          
          <Button 
            colorScheme="blue" 
            onClick={handleSetHLSStream}
            width={{ base: "100%", md: "auto" }}
            isDisabled={!streamUrl.trim() || isLoading}
            isLoading={isLoading}
            loadingText="Setting Stream"
          >
            Set Stream
          </Button>
        </Flex>
        
        <Box>
          <Text fontWeight="bold" mb={2}>Status Updates:</Text>
          <Box 
            maxH="200px" 
            overflowY="auto" 
            borderWidth="1px" 
            borderRadius="md" 
            p={2}
          >
            {statusUpdates.length === 0 ? (
              <Text color="gray.500">No updates yet</Text>
            ) : (
              statusUpdates.map(update => (
                <Box key={update.id} mb={1} fontSize="sm">
                  <Text as="span" color="gray.500" fontSize="xs" mr={2}>
                    [{update.timestamp}]
                  </Text>
                  {update.message}
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
};

export default HLSStreamTest; 