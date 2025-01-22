import React, { useState, useEffect } from "react";
import { Box, Flex, Text, Progress } from "@chakra-ui/react";
import { useUnity } from "../../providers/UnityProvider";

function LoaderProgress() {
  const { loadingProgression, isLoaded } = useUnity();

  return (
    // Only render if not animated out

    <Box
      position="absolute"
      z-index="1"
      width="100%"
      height="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      transition="opacity 3s ease-in-out" // 2-second transitions
      opacity={isLoaded ? 0 : 1} // Fade out if loaded
    >
      <Flex
        flexDirection="column"
        alignItems="center"
        padding={4}
        marginY={4}
        borderRadius="md"
        backgroundColor="rgba(0, 0, 0, 0.8)"
        color="white"
        zIndex="1"
      >
        <Text fontWeight="bold">Entering The Disruptive Spaces</Text>
        <Text fontSize="sm">
          {!isLoaded ? "World loading" : "World Initialising"}.
        </Text>
        <Progress
          value={loadingProgression * 100}
          size="lg"
          width="100%"
          marginY={2}
        />
      </Flex>
    </Box>
  );
}

export default LoaderProgress;
