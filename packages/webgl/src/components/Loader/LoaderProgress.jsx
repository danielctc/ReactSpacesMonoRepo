import React, { useState, useEffect } from "react";
import { Box, Flex, Text, Progress, Button, VStack } from "@chakra-ui/react";
import { useUnity } from "../../providers/UnityProvider";
import SignIn from "@disruptive-spaces/shared/components/auth/SignIn";
import { useContext } from "react";
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";

function LoaderProgress() {
  const { loadingProgression, isLoaded, error } = useUnity();
  const { user } = useContext(UserContext);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // Check if user needs to sign in
  useEffect(() => {
    // Show sign-in prompt if there's no user and loading hasn't started
    if (!user && loadingProgression === 0) {
      setShowSignInPrompt(true);
    } else {
      setShowSignInPrompt(false);
    }
  }, [user, loadingProgression]);

  /**
   * Authentication Gate Component
   * ---------------------------
   * This section handles the authentication flow before allowing Unity to load.
   * It shows a sign-in prompt when:
   * 1. No user is authenticated
   * 2. Unity hasn't started loading yet
   * 
   * The component displays:
   * - A semi-transparent overlay
   * - A centered prompt box
   * - Sign in button that triggers the auth modal
   */
  return (
    <>
      {showSignInPrompt ? (
        <Box
          position="absolute"
          zIndex="1"
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack
            spacing={4}
            padding={6}
            borderRadius="md"
            backgroundColor="rgba(0, 0, 0, 0.8)"
            color="white"
          >
            <Text fontSize="xl" fontWeight="bold">Sign In Required</Text>
            <Text textAlign="center">
              Please sign in to enter The Disruptive Spaces
            </Text>
            <Button
              colorScheme="blue"
              size="lg"
              width="200px"
              onClick={() => setIsSignInOpen(true)}
            >
              Sign In
            </Button>
          </VStack>
        </Box>
      ) : (
        // Unity Loading Progress Component
        <Box
          position="absolute"
          zIndex="1"
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          transition="opacity 3s ease-in-out"
          opacity={isLoaded ? 0 : 1}
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
      )}
      {/* Sign In Modal - Only rendered when needed */}
      {/*
      {!user && (
        <SignIn 
          isOpen={isSignInOpen}
          onClose={() => setIsSignInOpen(false)}
        />
      )}
      */}
    </>
  );
}

export default LoaderProgress;
