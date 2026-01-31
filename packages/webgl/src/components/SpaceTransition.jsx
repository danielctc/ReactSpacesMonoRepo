import { Box, Progress, Text, Fade } from '@chakra-ui/react';

// Optional import for SpaceNavigation
let useSpaceNavigation = null;
try {
  const module = require('@disruptive-spaces/shared/providers/SpaceNavigationProvider');
  useSpaceNavigation = module.useSpaceNavigation;
} catch {
  // SpaceNavigationProvider not available
}

/**
 * Space Transition Overlay
 * Shows loading progress during portal navigation
 * Only renders when transitioning between spaces
 */
export const SpaceTransition = () => {
  // Get navigation context - returns null if not available
  const spaceNavContext = useSpaceNavigation ? useSpaceNavigation() : null;

  // Don't render if no context or not transitioning
  if (!spaceNavContext?.isTransitioning) {
    return null;
  }

  const { transitionProgress } = spaceNavContext;

  // Determine loading stage text
  const getStageText = () => {
    if (transitionProgress < 20) {
      return 'Preparing to leave...';
    } else if (transitionProgress < 40) {
      return 'Closing current space...';
    } else if (transitionProgress < 60) {
      return 'Preparing destination...';
    } else if (transitionProgress < 80) {
      return 'Loading new space...';
    } else {
      return 'Almost there...';
    }
  };

  return (
    <Fade in={true}>
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="blackAlpha.900"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        zIndex={1000}
      >
        {/* Portal icon or animation could go here */}
        <Box
          w="80px"
          h="80px"
          mb={6}
          borderRadius="full"
          bg="linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)"
          opacity={0.8}
          animation="pulse 1.5s ease-in-out infinite"
          sx={{
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)', opacity: 0.8 },
              '50%': { transform: 'scale(1.1)', opacity: 1 },
            },
          }}
        />

        <Text color="white" fontSize="xl" fontWeight="medium" mb={4}>
          Traveling to new space...
        </Text>

        <Progress
          value={transitionProgress}
          width="60%"
          maxW="400px"
          colorScheme="teal"
          borderRadius="full"
          size="sm"
          hasStripe
          isAnimated
        />

        <Text color="gray.400" fontSize="sm" mt={3}>
          {getStageText()}
        </Text>

        <Text color="gray.600" fontSize="xs" mt={1}>
          {Math.round(transitionProgress)}%
        </Text>
      </Box>
    </Fade>
  );
};

export default SpaceTransition;
