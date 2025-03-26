import React, { useState, useEffect } from "react";
import { 
  Box, 
  Button,
  FormControl,
  FormLabel,
  Input, 
  VStack,
  Text,
  useToast,
  Collapse,
  Flex,
  Badge,
  Heading,
  Divider,
  Spinner,
  Alert,
  AlertIcon
} from "@chakra-ui/react";
import { useHLSStream } from "../../hooks/unityEvents";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * HLS Stream controller for the main menu
 */
const HLSStreamMenu = ({ spaceID }) => {
  const { setHLSStreamUrl, playerStatus, isLoading, savedStreamData } = useHLSStream();
  const [streamUrl, setStreamUrl] = useState("");
  const [playerIndex, setPlayerIndex] = useState("0");
  const [isExpanded, setIsExpanded] = useState(false);
  const toast = useToast();
  
  // Update form fields when savedStreamData changes
  useEffect(() => {
    if (savedStreamData) {
      setStreamUrl(savedStreamData.streamUrl || "");
      setPlayerIndex(savedStreamData.playerIndex || "0");
    }
  }, [savedStreamData]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate URL
    if (!streamUrl || !streamUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid stream URL",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Validate player index
    if (!playerIndex || isNaN(parseInt(playerIndex))) {
      toast({
        title: "Error",
        description: "Please enter a valid player index (0, 1, 2, etc.)",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Send to Unity and save to Firebase
    Logger.log(`HLSStreamMenu: Setting HLS stream for LiveProjector[${playerIndex}]`, streamUrl);
    
    try {
      await setHLSStreamUrl(streamUrl, parseInt(playerIndex));
      
      // Show success toast
      toast({
        title: "Stream Configured",
        description: `HLS stream set for LiveProjector[${playerIndex}] and saved to space`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      Logger.error("HLSStreamMenu: Error setting stream", error);
      
      // Show error toast
      toast({
        title: "Error Setting Stream",
        description: "There was an error saving the stream. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Render player status badges
  const renderPlayerStatus = () => {
    if (isLoading) {
      return (
        <Flex align="center" justify="center" p={2}>
          <Spinner size="sm" mr={2} />
          <Text fontSize="sm" color="gray.500">Loading stream status...</Text>
        </Flex>
      );
    }
    
    if (!playerStatus || Object.keys(playerStatus).length === 0) {
      return <Text fontSize="sm" color="gray.500">No status updates available</Text>;
    }
    
    return (
      <VStack align="stretch" spacing={2} mt={2}>
        {Object.entries(playerStatus).map(([key, status]) => (
          <Flex key={key} justify="space-between" align="center" p={2} borderWidth="1px" borderRadius="md">
            <Text fontSize="sm" fontWeight="bold">{status.identifier}[{status.playerIndex}]</Text>
            <Flex>
              <Badge colorScheme={status.isReady ? "green" : "red"} mr={1} fontSize="xs">
                {status.isReady ? "Ready" : "Not Ready"}
              </Badge>
              <Badge colorScheme={status.isPlaying ? "blue" : "gray"} fontSize="xs">
                {status.isPlaying ? "Playing" : "Not Playing"}
              </Badge>
            </Flex>
          </Flex>
        ))}
      </VStack>
    );
  };
  
  return (
    <Box>
      <Button 
        width="100%" 
        justifyContent="space-between" 
        variant="ghost" 
        onClick={() => setIsExpanded(!isExpanded)}
        mb={2}
      >
        <Flex align="center">
          <Text>HLS Streaming</Text>
          {isLoading && <Spinner size="xs" ml={2} />}
          {savedStreamData && !isLoading && (
            <Badge ml={2} colorScheme="green" fontSize="xs">Active</Badge>
          )}
        </Flex>
        <Text>{isExpanded ? "▲" : "▼"}</Text>
      </Button>
      
      <Collapse in={isExpanded} animateOpacity>
        <Box p={4} borderWidth="1px" borderRadius="md" mb={4}>
          {savedStreamData && (
            <Alert status="info" mb={4} size="sm" fontSize="xs">
              <AlertIcon />
              <Box>
                <Text>Saved stream: {savedStreamData.streamUrl}</Text>
                <Text>Player index: {savedStreamData.playerIndex}</Text>
                {savedStreamData.updatedAt && (
                  <Text>Last updated: {new Date(savedStreamData.updatedAt).toLocaleString()}</Text>
                )}
              </Box>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel htmlFor="playerIndex" fontSize="sm">Player Index</FormLabel>
                <Input 
                  id="playerIndex" 
                  value={playerIndex} 
                  onChange={(e) => setPlayerIndex(e.target.value)}
                  placeholder="0"
                  size="sm"
                  isDisabled={isLoading}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel htmlFor="streamUrl" fontSize="sm">Stream URL (HLS)</FormLabel>
                <Input 
                  id="streamUrl" 
                  value={streamUrl} 
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="https://example.com/stream.m3u8"
                  size="sm"
                  isDisabled={isLoading}
                />
              </FormControl>
              
              <Button 
                type="submit" 
                colorScheme="blue" 
                size="sm"
                isLoading={isLoading}
                loadingText="Saving Stream"
                isDisabled={isLoading}
              >
                Set Stream
              </Button>
              
              {spaceID && (
                <Text fontSize="xs" color="gray.500">
                  Stream will be saved to space: {spaceID}
                </Text>
              )}
            </VStack>
          </form>
          
          <Divider my={4} />
          
          <Heading size="xs" mb={2}>Player Status</Heading>
          {renderPlayerStatus()}
        </Box>
      </Collapse>
    </Box>
  );
};

export default HLSStreamMenu; 