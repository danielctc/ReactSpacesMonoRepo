// Optional import for SpaceNavigation
let useSpaceNavigation: any = null;
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
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-[1000] transition-opacity duration-300">
      {/* Portal icon or animation */}
      <div
        className="w-20 h-20 mb-6 rounded-full opacity-80 animate-pulse"
        style={{
          background: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)'
        }}
      />

      <p className="text-white text-xl font-medium mb-4">
        Traveling to new space...
      </p>

      <div className="w-3/5 max-w-md">
        <progress
          className="progress progress-accent w-full"
          value={transitionProgress}
          max="100"
        />
      </div>

      <p className="text-gray-400 text-sm mt-3">
        {getStageText()}
      </p>

      <p className="text-gray-600 text-xs mt-1">
        {Math.round(transitionProgress)}%
      </p>
    </div>
  );
};

export default SpaceTransition;
