import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Logger } from '../logging/react-log';

const SpaceNavigationContext = createContext(null);

/**
 * Space Navigation Provider
 * Manages single-tab portal navigation without page reloads
 *
 * Handles:
 * - Unity instance unload before navigation
 * - URL updates via history API
 * - Transition progress tracking
 * - Browser back/forward navigation
 */
export const SpaceNavigationProvider = ({ initialSpaceId, children }) => {
  const [currentSpaceId, setCurrentSpaceId] = useState(initialSpaceId);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [previousSpaceId, setPreviousSpaceId] = useState(null);

  // Reference to Unity unload function (registered by WebGLLoader)
  const unloadRef = useRef(null);

  /**
   * Register Unity unload function
   * Called by WebGLLoader to provide access to Unity instance cleanup
   */
  const registerUnload = useCallback((unloadFn) => {
    unloadRef.current = unloadFn;
    Logger.log('SpaceNavigationProvider: Unity unload function registered');
  }, []);

  /**
   * Navigate to a new space
   * Handles full transition: unload -> URL update -> load new space
   *
   * @param {string} targetSpaceId - ID of the space to navigate to
   * @param {Object} options - Navigation options (slug, portalId, sourceSpaceId)
   */
  const navigateToSpace = useCallback(
    async (targetSpaceId, options = {}) => {
      // Prevent navigation to same space
      if (targetSpaceId === currentSpaceId) {
        Logger.log('SpaceNavigationProvider: Already in target space, skipping navigation');
        return;
      }

      // Prevent double navigation during transition
      if (isTransitioning) {
        Logger.warn('SpaceNavigationProvider: Navigation already in progress, blocking request');
        return;
      }

      Logger.log(`SpaceNavigationProvider: Starting navigation from ${currentSpaceId} to ${targetSpaceId}`);

      try {
        // Step 1: Initiate transition
        setIsTransitioning(true);
        setTransitionProgress(10);
        setPreviousSpaceId(currentSpaceId);

        // Step 2: Unload current Unity instance
        if (unloadRef.current) {
          Logger.log('SpaceNavigationProvider: Unloading current Unity instance');
          setTransitionProgress(20);

          await unloadRef.current();

          setTransitionProgress(40);
          Logger.log('SpaceNavigationProvider: Unity instance unloaded successfully');
        } else {
          Logger.warn('SpaceNavigationProvider: No unload function registered, skipping Unity cleanup');
          setTransitionProgress(40);
        }

        // Step 3: Update URL without reload (for browser history)
        const newUrl = options.slug ? `/w/${options.slug}` : `/w/${targetSpaceId}`;
        window.history.pushState({ spaceId: targetSpaceId, ...options }, '', newUrl);
        Logger.log(`SpaceNavigationProvider: Updated URL to ${newUrl}`);

        // Step 4: Set new space ID (triggers WebGLLoader reload)
        setTransitionProgress(50);
        setCurrentSpaceId(targetSpaceId);

        Logger.log('SpaceNavigationProvider: Space ID updated, WebGLLoader should begin loading');

        // Progress updates 50-100 handled by WebGLLoader via onLoadProgress
      } catch (error) {
        Logger.error('SpaceNavigationProvider: Navigation failed:', error);

        // Rollback on error
        if (previousSpaceId) {
          Logger.log(`SpaceNavigationProvider: Rolling back to previous space: ${previousSpaceId}`);
          setCurrentSpaceId(previousSpaceId);
        }

        // Reset transition state
        setIsTransitioning(false);
        setTransitionProgress(0);

        throw error;
      }
    },
    [currentSpaceId, isTransitioning, previousSpaceId]
  );

  /**
   * Update loading progress during Unity load
   * Maps Unity's 0-1 progress to our 50-100 range
   *
   * @param {number} progress - Unity loading progress (0-1)
   */
  const onLoadProgress = useCallback((progress) => {
    // Only update if we're transitioning (not initial load)
    if (isTransitioning) {
      // Map Unity loading (0-1) to our progress (50-100)
      const mappedProgress = 50 + progress * 50;
      setTransitionProgress(mappedProgress);
    }
  }, [isTransitioning]);

  /**
   * Mark transition as complete
   * Adds brief delay before resetting state for smooth fade-in
   */
  const onLoadComplete = useCallback(() => {
    if (isTransitioning) {
      Logger.log('SpaceNavigationProvider: Space load complete');
      setTransitionProgress(100);

      // Brief delay for fade-in animation
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionProgress(0);
        Logger.log('SpaceNavigationProvider: Transition complete');
      }, 300);
    }
  }, [isTransitioning]);

  /**
   * Handle browser back/forward navigation
   * Listens to popstate events and triggers navigation
   */
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.spaceId) {
        Logger.log(`SpaceNavigationProvider: Browser navigation to ${event.state.spaceId}`);
        // Use internal setter to avoid re-triggering history push
        setIsTransitioning(true);
        setTransitionProgress(10);
        setPreviousSpaceId(currentSpaceId);

        if (unloadRef.current) {
          unloadRef.current().then(() => {
            setTransitionProgress(50);
            setCurrentSpaceId(event.state.spaceId);
          });
        } else {
          setTransitionProgress(50);
          setCurrentSpaceId(event.state.spaceId);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentSpaceId]);

  // Register global navigate function for non-hook access
  useEffect(() => {
    setGlobalNavigateToSpace(navigateToSpace);
    return () => {
      setGlobalNavigateToSpace(null);
    };
  }, [navigateToSpace]);

  // Context value
  const contextValue = {
    currentSpaceId,
    isTransitioning,
    transitionProgress,
    previousSpaceId,
    navigateToSpace,
    registerUnload,
    onLoadProgress,
    onLoadComplete,
  };

  return (
    <SpaceNavigationContext.Provider value={contextValue}>
      {children}
    </SpaceNavigationContext.Provider>
  );
};

/**
 * Hook to use Space Navigation Context
 * Returns null if used outside provider (for optional integration)
 * @returns {Object|null} Navigation context value or null
 */
export const useSpaceNavigation = () => {
  return useContext(SpaceNavigationContext);
};

/**
 * Hook that throws if used outside provider
 * Use when navigation is required
 * @returns {Object} Navigation context value
 * @throws {Error} If used outside SpaceNavigationProvider
 */
export const useSpaceNavigationRequired = () => {
  const context = useContext(SpaceNavigationContext);
  if (!context) {
    throw new Error('useSpaceNavigationRequired must be used within SpaceNavigationProvider');
  }
  return context;
};

// Global reference for non-hook access (used by portal navigation hook)
let globalNavigateToSpace = null;

/**
 * Register the navigate function globally
 * Called internally by the provider
 */
export const setGlobalNavigateToSpace = (fn) => {
  globalNavigateToSpace = fn;
};

/**
 * Get the navigate function for non-hook contexts
 * Used by useUnityOnPortalNavigate to access navigation outside hooks
 * @returns {Function|null} navigateToSpace function or null if not available
 */
export const getNavigateToSpace = () => {
  return globalNavigateToSpace;
};
