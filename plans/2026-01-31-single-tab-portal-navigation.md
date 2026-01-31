# Single-Tab Portal Navigation Implementation Plan

**Date:** 2026-01-31
**Goal:** Portal/level transitions stay within single browser tab, no new tabs or page reloads

---

## Problem

Current portal navigation does a full page reload:

```javascript
// useUnityOnPortalNavigate.js:74
window.location.href = `/?spaceId=${targetSpaceId}`;
```

This causes:

- Full page reload (slow)
- Unity instance completely destroyed
- Loss of React state
- Poor UX for metaverse navigation

---

## Solution Architecture

### New Components

```
┌─────────────────────────────────────────────────────────────┐
│                    SpaceNavigationProvider                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ currentSpaceId: string                               │    │
│  │ isTransitioning: boolean                             │    │
│  │ transitionProgress: number                           │    │
│  │ navigateToSpace(spaceId): Promise<void>              │    │
│  │ previousSpaceId: string | null                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    WebGLLoader (modified)                    │
│  - Listens to currentSpaceId changes                        │
│  - Calls unload() on Unity before switching                 │
│  - Shows transition UI during load                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Create SpaceNavigationContext

**File:** `packages/shared/providers/SpaceNavigationProvider.jsx`

```jsx
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const SpaceNavigationContext = createContext(null);

export const SpaceNavigationProvider = ({ initialSpaceId, children }) => {
  const [currentSpaceId, setCurrentSpaceId] = useState(initialSpaceId);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [previousSpaceId, setPreviousSpaceId] = useState(null);

  // Reference to Unity unload function (set by WebGLLoader)
  const unloadRef = useRef(null);

  const registerUnload = useCallback((unloadFn) => {
    unloadRef.current = unloadFn;
  }, []);

  const navigateToSpace = useCallback(
    async (targetSpaceId, options = {}) => {
      if (targetSpaceId === currentSpaceId) return;
      if (isTransitioning) return; // Prevent double navigation

      try {
        setIsTransitioning(true);
        setTransitionProgress(0);
        setPreviousSpaceId(currentSpaceId);

        // Step 1: Fade out / show transition UI
        setTransitionProgress(10);

        // Step 2: Unload current Unity instance
        if (unloadRef.current) {
          setTransitionProgress(20);
          await unloadRef.current();
          setTransitionProgress(40);
        }

        // Step 3: Update URL without reload (for browser history)
        const newUrl = options.slug ? `/w/${options.slug}` : `/w/${targetSpaceId}`;
        window.history.pushState({ spaceId: targetSpaceId }, '', newUrl);

        // Step 4: Set new space ID (triggers WebGLLoader reload)
        setTransitionProgress(50);
        setCurrentSpaceId(targetSpaceId);

        // Progress updates handled by WebGLLoader loading events
      } catch (error) {
        console.error('Space navigation failed:', error);
        // Revert on error
        setCurrentSpaceId(previousSpaceId);
      }
    },
    [currentSpaceId, isTransitioning, previousSpaceId]
  );

  const onLoadProgress = useCallback((progress) => {
    // Map Unity loading (0-1) to our progress (50-100)
    setTransitionProgress(50 + progress * 50);
  }, []);

  const onLoadComplete = useCallback(() => {
    setTransitionProgress(100);
    setTimeout(() => {
      setIsTransitioning(false);
      setTransitionProgress(0);
    }, 300); // Brief delay for fade-in
  }, []);

  return (
    <SpaceNavigationContext.Provider
      value={{
        currentSpaceId,
        isTransitioning,
        transitionProgress,
        previousSpaceId,
        navigateToSpace,
        registerUnload,
        onLoadProgress,
        onLoadComplete,
      }}
    >
      {children}
    </SpaceNavigationContext.Provider>
  );
};

export const useSpaceNavigation = () => {
  const context = useContext(SpaceNavigationContext);
  if (!context) {
    throw new Error('useSpaceNavigation must be used within SpaceNavigationProvider');
  }
  return context;
};
```

---

### Phase 2: Modify UnityProvider

**File:** `packages/webgl/src/providers/UnityProvider.jsx`

Add unload registration:

```jsx
// Add to useUnityContext destructuring
const {
  unityProvider,
  loadingProgression,
  isLoaded,
  sendMessage,
  addEventListener,
  removeEventListener,
  unload,  // ADD THIS
  error
} = useUnityContext({ ... });

// Register unload with navigation context
useEffect(() => {
  if (registerUnload) {
    registerUnload(unload);
  }
}, [unload, registerUnload]);
```

---

### Phase 3: Modify useUnityOnPortalNavigate

**File:** `packages/webgl/src/hooks/unityEvents/useUnityOnPortalNavigate.js`

Replace `window.location.href` with context navigation:

```javascript
import { useSpaceNavigation } from '@disruptive-spaces/shared/providers/SpaceNavigationProvider';

export const useUnityOnPortalNavigate = () => {
  const { navigateToSpace } = useSpaceNavigation();
  // ... existing code ...

  const handlePortalNavigate = async (data) => {
    // ... existing analytics tracking ...

    if (targetSpaceId) {
      // OLD: window.location.href = `/?spaceId=${targetSpaceId}`;
      // NEW:
      await navigateToSpace(targetSpaceId, {
        portalId: portalData.portalId,
        sourceSpaceId: spaceID,
      });
    }
  };

  // ... rest of hook
};
```

---

### Phase 4: Add Transition UI

**File:** `packages/webgl/src/components/SpaceTransition.jsx`

```jsx
import { Box, Progress, Text, Fade } from '@chakra-ui/react';
import { useSpaceNavigation } from '@disruptive-spaces/shared/providers/SpaceNavigationProvider';

export const SpaceTransition = () => {
  const { isTransitioning, transitionProgress, previousSpaceId, currentSpaceId } =
    useSpaceNavigation();

  if (!isTransitioning) return null;

  return (
    <Fade in={isTransitioning}>
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
        <Text color="white" fontSize="xl" mb={4}>
          Traveling to new space...
        </Text>
        <Progress value={transitionProgress} width="60%" colorScheme="teal" borderRadius="full" />
        <Text color="gray.400" fontSize="sm" mt={2}>
          {transitionProgress < 40
            ? 'Leaving current space...'
            : transitionProgress < 60
              ? 'Preparing destination...'
              : 'Loading new space...'}
        </Text>
      </Box>
    </Fade>
  );
};
```

---

### Phase 5: Update WebGLLoader

**File:** `packages/webgl/src/WebGLLoader.jsx`

Make it reactive to spaceID changes from context:

```jsx
import { useSpaceNavigation } from '@disruptive-spaces/shared/providers/SpaceNavigationProvider';

const WebGLLoader = ({ spaceID: propSpaceID, overrideSettings }) => {
  // Use context spaceID if available, fall back to prop
  const navigation = useSpaceNavigation?.() || {};
  const { currentSpaceId, onLoadProgress, onLoadComplete } = navigation;
  const spaceID = currentSpaceId || propSpaceID;

  // ... existing state and effects ...

  // Report loading progress
  useEffect(() => {
    if (onLoadProgress && loadingProgression) {
      onLoadProgress(loadingProgression);
    }
  }, [loadingProgression, onLoadProgress]);

  // Report load complete
  useEffect(() => {
    if (isLoaded && onLoadComplete) {
      onLoadComplete();
    }
  }, [isLoaded, onLoadComplete]);

  // ... rest of component
};
```

---

### Phase 6: Wire Up in SpacePage/EmbedPage

**File:** `packages/website/src/pages/SpacePage.jsx`

```jsx
import { SpaceNavigationProvider } from '@disruptive-spaces/shared/providers/SpaceNavigationProvider';
import { SpaceTransition } from '@disruptive-spaces/webgl/src/components/SpaceTransition';

// Wrap WebGLLoader with navigation provider
<SpaceNavigationProvider initialSpaceId={webglSpaceId}>
  <SpaceTransition />
  <WebGLLoader spaceID={webglSpaceId} />
</SpaceNavigationProvider>;
```

---

### Phase 7: Handle Browser Back/Forward

Add popstate listener in SpaceNavigationProvider:

```javascript
useEffect(() => {
  const handlePopState = (event) => {
    if (event.state?.spaceId) {
      navigateToSpace(event.state.spaceId);
    }
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [navigateToSpace]);
```

---

## Unity-Side Changes (Optional Enhancements)

### Notify Unity of Transition State

```csharp
// ReactIncomingEvent.cs - Add handler for transition state
public void OnSpaceTransitionStart(string data) {
    // Fade out, save state, etc.
}

public void OnSpaceTransitionEnd(string data) {
    // Initialize in new space
}
```

### From React:

```javascript
// Before unload
sendMessage(
  'ReactIncomingEvent',
  'OnSpaceTransitionStart',
  JSON.stringify({
    targetSpaceId,
    sourceSpaceId: currentSpaceId,
  })
);
```

---

## Files to Create/Modify

| Action | File                                                               | Priority |
| ------ | ------------------------------------------------------------------ | -------- |
| Create | `packages/shared/providers/SpaceNavigationProvider.jsx`            | P0       |
| Create | `packages/webgl/src/components/SpaceTransition.jsx`                | P1       |
| Modify | `packages/webgl/src/providers/UnityProvider.jsx`                   | P0       |
| Modify | `packages/webgl/src/hooks/unityEvents/useUnityOnPortalNavigate.js` | P0       |
| Modify | `packages/webgl/src/WebGLLoader.jsx`                               | P1       |
| Modify | `packages/website/src/pages/SpacePage.jsx`                         | P1       |
| Modify | `packages/website/src/pages/EmbedPage.jsx`                         | P1       |
| Export | `packages/shared/providers/index.js`                               | P2       |

---

## Testing Checklist

- [ ] Portal click triggers in-tab navigation
- [ ] Unity instance properly unloads (check memory in DevTools)
- [ ] New space loads correctly
- [ ] Transition UI shows progress
- [ ] Browser back button works
- [ ] Browser forward button works
- [ ] Deep link to space still works
- [ ] Error handling: invalid space ID
- [ ] Error handling: network failure during load
- [ ] Analytics tracking still works
- [ ] Voice chat state preserved/reconnected

---

## Memory Considerations

The `unload()` function from react-unity-webgl:

- Frees Unity JavaScript heap
- Must complete before loading new instance
- Required for multi-page apps to prevent memory leaks

**Important:** Never load a new Unity instance before the previous one finishes unloading.

---

## Rollback Plan

If issues arise, revert to full-page navigation by:

1. Removing SpaceNavigationProvider wrapper
2. Reverting useUnityOnPortalNavigate to use `window.location.href`

---

## References

- [react-unity-webgl unload API](https://react-unity-webgl.dev/docs/api/unload)
- [Unity WebGL Memory](https://docs.unity3d.com/Manual/webgl-memory.html)
