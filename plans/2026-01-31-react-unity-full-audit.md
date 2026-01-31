# React-Unity Complete System Audit & Remediation Plan

**Created:** 31 January 2026
**Scope:** Full stack audit - React WebGL, Firebase backend, security, architecture
**Priority:** CRITICAL - Production deployment blocker

---

## Executive Summary

Comprehensive audit identified **63 issues** across the stack:

| Severity    | Count | Category                                              |
| ----------- | ----- | ----------------------------------------------------- |
| 🔴 CRITICAL | 18    | Security credentials, permission bypass, memory leaks |
| 🟠 HIGH     | 14    | Token validation, rate limiting, race conditions      |
| 🟡 MEDIUM   | 21    | Code quality, error handling, cleanup                 |
| 🟢 LOW      | 10    | UX, documentation, minor improvements                 |

**Estimated Total Effort:** 3-4 weeks (phased approach)

---

## Phase 1: CRITICAL Security (Days 1-3)

### 1.1 Credential Rotation & Removal

**Files:** `functions/serviceAccountKey.json`, `.env`, `packages/shared/firebase/firebase.ts`

| Task                           | File                   | Action                          |
| ------------------------------ | ---------------------- | ------------------------------- |
| Revoke exposed service account | Firebase Console       | Regenerate key                  |
| Remove from git history        | serviceAccountKey.json | `git filter-branch`             |
| Add to .gitignore              | .gitignore             | Add `**/serviceAccountKey.json` |
| Rotate Firebase API key        | Google Cloud Console   | Regenerate                      |
| Remove hardcoded credentials   | firebase.ts:49-65      | Delete fallback values          |
| Clean .env from history        | .env                   | BFG Repo-Cleaner                |

### 1.2 Permission System Fix

**Files:** `packages/shared/firebase/userPermissionsOverride.js`, `packages/shared/firebase/userPermissions.ts`

| Task                          | File                       | Line    | Action                          |
| ----------------------------- | -------------------------- | ------- | ------------------------------- |
| DELETE override file          | userPermissionsOverride.js | ALL     | Remove entire file              |
| Remove 'users' bypass         | userPermissions.ts         | 166-172 | Delete hardcoded return true    |
| Remove dev environment bypass | userPermissions.ts         | imports | Remove override imports         |
| Add proper environment check  | userPermissions.ts         | -       | Use `import.meta.env.PROD` only |

### 1.3 Firestore Rules Hardening

**File:** `firestore.rules`

```firestore
// BEFORE (insecure):
match /portals/{portalId} {
  allow read: if true;
}

// AFTER (secure):
match /portals/{portalId} {
  allow read: if request.auth != null || isSpacePublic(spaceId);
}
```

**Rules to fix:**

- Line 74: portals
- Line 82: mediaScreens
- Line 89: mediaScreenImages
- Line 96: mediaScreenThumbnails
- Line 103: objects
- Line 111: catalogue
- Line 146: website
- Line 181-192: root mediaScreens

### 1.4 Input Validation for Cloud Functions

**File:** `functions/src/analytics.js`

```javascript
// Add at line 108:
const ALLOWED_EVENT_DATA_KEYS = ['category', 'action', 'label', 'value', 'metadata'];
const MAX_EVENT_DATA_SIZE = 10000;

// Validate before storage
Object.keys(eventData).forEach((key) => {
  if (!ALLOWED_EVENT_DATA_KEYS.includes(key)) {
    throw new HttpsError('invalid-argument', `Invalid field: ${key}`);
  }
});

if (JSON.stringify(eventData).length > MAX_EVENT_DATA_SIZE) {
  throw new HttpsError('invalid-argument', 'Event data exceeds maximum size');
}
```

---

## Phase 2: Memory Leaks & Cleanup (Days 4-6)

### 2.1 Critical Memory Leak Fixes

| File                              | Issue                          | Fix                         |
| --------------------------------- | ------------------------------ | --------------------------- |
| `useHLSStream.js:86-92`           | Nested setInterval not cleared | Add to useEffect cleanup    |
| `useMediaScreenThumbnails.js:196` | 5-min interval accumulates     | Track intervalId in ref     |
| `useMediaScreenVideoPlayer.js:22` | setTimeout not returned        | Store and clear in cleanup  |
| `useAutoAvatarSync.js:49`         | Listener added every render    | Add proper dependency array |
| `useUnityPlayerList.js:56`        | Race condition with retry      | Add mounted flag check      |

### 2.2 useHLSStream.js Complete Rewrite

```javascript
// packages/webgl/src/hooks/unityEvents/useHLSStream.js
export const useHLSStream = (streamData, isLoaded) => {
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const { sendUnityEvent, sendMessage } = useUnityMessaging();

  const sendStreamToUnity = useCallback(
    (streamUrl, playerIndex) => {
      // SINGLE send method - not 5 different attempts
      sendUnityEvent('SetHLSStream', { streamUrl, playerIndex });
    },
    [sendUnityEvent]
  );

  useEffect(() => {
    if (!streamData?.streamUrl) return;

    if (isLoaded) {
      sendStreamToUnity(streamData.streamUrl, streamData.playerIndex || '0');
      return;
    }

    // Poll with proper cleanup
    intervalRef.current = setInterval(() => {
      if (window.isPlayerInstantiated) {
        sendStreamToUnity(streamData.streamUrl, streamData.playerIndex || '0');
        clearInterval(intervalRef.current);
      }
    }, 1000);

    // Timeout safety
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [streamData, isLoaded, sendStreamToUnity]);
};
```

### 2.3 useMediaScreenVideoPlayer.js Fix

```javascript
// Line 21-25: Fix timeout cleanup
const timeoutRef = useRef(null);

const safelyResetProcessingState = useCallback(() => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => {
    setIsProcessingEvent(false);
  }, 100);
}, []);

// Add to cleanup
useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, []);
```

---

## Phase 3: Code Quality & Architecture (Days 7-12)

### 3.1 Double-Serialization Fix

**Files:** `useUnityMessaging.js`, `useSendUnityEvent.js`

```javascript
// BEFORE (double-encoded):
const payload = JSON.stringify({
  eventName,
  data: JSON.stringify(data), // Double stringify
});

// AFTER (single encode):
const payload = JSON.stringify({
  eventName,
  data, // Pass object directly
});
```

**Note:** Requires Unity C# side update - coordinate with Unity team.

### 3.2 Extract Magic Numbers to Constants

**New file:** `packages/webgl/src/constants/timing.js`

```javascript
export const TIMING = {
  UNITY_READY_POLL_MS: 100,
  HLS_RETRY_DELAY_MS: 500,
  HLS_BACKUP_DELAY_MS: 2000,
  HLS_MAX_WAIT_MS: 30000,
  VIDEO_PROCESSING_TIMEOUT_MS: 5000,
  THUMBNAIL_REFRESH_MS: 5 * 60 * 1000,
  PLAYER_LIST_REFRESH_MS: 5000,
};

export const LIMITS = {
  MAX_RETRY_ATTEMPTS: 3,
  MAX_MESSAGE_QUEUE_SIZE: 100,
};
```

### 3.3 TypeScript Migration (Priority Files)

| File                            | Priority | Complexity |
| ------------------------------- | -------- | ---------- |
| useUnityMessaging.js → .ts      | P1       | Medium     |
| useSendUnityEvent.js → .ts      | P1       | Low        |
| useListenForUnityEvent.js → .ts | P1       | Low        |
| WebGLLoader.jsx → .tsx          | P2       | High       |
| UnityProvider.jsx → .tsx        | P2       | High       |

### 3.4 Remove Window Global State

**Replace with Context:**

```javascript
// BEFORE:
window.unityInputDisabledBy = source;
window.isPlayerInstantiated = true;

// AFTER - Create UnityStateContext:
const UnityStateContext = createContext({
  inputDisabledBy: null,
  isPlayerInstantiated: false,
  setInputDisabledBy: () => {},
  setPlayerInstantiated: () => {},
});
```

---

## Phase 4: Firebase Backend Fixes (Days 13-17)

### 4.1 Rate Limiter - Fail Closed

```javascript
// functions/src/rateLimiter.js - Lines 117-119
} catch (error) {
  if (error instanceof HttpsError) {
    throw error;
  }
  // FAIL CLOSED - Don't allow on error
  console.error('Rate limit check failed (blocking):', error);
  throw new HttpsError('internal', 'Rate limit service unavailable');
}
```

### 4.2 Chat Cleanup - Add Distributed Lock

```javascript
// functions/src/chatCleanup.js
const acquireLock = async (lockId) => {
  const lockRef = db.collection('_locks').doc(lockId);
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(lockRef);
    if (doc.exists && doc.data().inProgress) {
      throw new HttpsError('unavailable', 'Cleanup already running');
    }
    transaction.set(lockRef, {
      inProgress: true,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
};

const releaseLock = async (lockId) => {
  await db.collection('_locks').doc(lockId).delete();
};
```

### 4.3 Audit Logging Implementation

```javascript
// functions/src/auditLog.js (NEW FILE)
const logAuditEvent = async (action, adminUid, details) => {
  await db.collection('auditLogs').add({
    action,
    adminUid,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ip: details.ip || null
  });
};

// Add to firestore.rules:
match /auditLogs/{logId} {
  allow read: if isDisruptiveAdmin();
  allow write: if false;
}
```

### 4.4 Email Verification Enforcement

```javascript
// packages/shared/firebase/userPermissions.ts
export const requireEmailVerification = async (user) => {
  if (!user.emailVerified) {
    throw new Error('Email verification required');
  }
};

// Add to space access checks
if (!user.emailVerified) {
  return { allowed: false, reason: 'email_not_verified' };
}
```

---

## Phase 5: Testing & Verification (Days 18-21)

### 5.1 Security Testing Checklist

- [ ] Attempt to access Firestore without auth (should fail)
- [ ] Attempt permission bypass with dev_mode flag (should fail)
- [ ] Verify rate limiting blocks excessive requests
- [ ] Test credential rotation didn't break functionality
- [ ] Verify chat cleanup lock prevents race conditions
- [ ] Test admin actions are logged to auditLogs

### 5.2 Memory Leak Testing

```javascript
// Add to testing harness
const memoryTest = async () => {
  const initialMemory = performance.memory.usedJSHeapSize;

  // Mount/unmount component 100 times
  for (let i = 0; i < 100; i++) {
    render(<UnityProvider />);
    unmount();
  }

  const finalMemory = performance.memory.usedJSHeapSize;
  const leak = finalMemory - initialMemory;

  if (leak > 1000000) {
    // 1MB threshold
    throw new Error(`Memory leak detected: ${leak} bytes`);
  }
};
```

### 5.3 Integration Testing

| Test                          | Expected Result                      |
| ----------------------------- | ------------------------------------ |
| Unity load with valid space   | Loads successfully                   |
| Unity load with invalid space | Shows error UI                       |
| Send event to Unity           | Unity receives event                 |
| Receive event from Unity      | React callback fires                 |
| HLS stream playback           | Stream plays without duplicate sends |
| Chat message send             | Message appears in Firestore         |
| Chat cleanup                  | Old messages deleted, lock released  |

---

## File Change Summary

### Critical Files (Must Change)

| File                                                  | Changes                 |
| ----------------------------------------------------- | ----------------------- |
| `functions/serviceAccountKey.json`                    | DELETE + rotate         |
| `.env`                                                | Remove from git history |
| `packages/shared/firebase/firebase.ts`                | Remove hardcoded creds  |
| `packages/shared/firebase/userPermissionsOverride.js` | DELETE                  |
| `packages/shared/firebase/userPermissions.ts`         | Remove bypass logic     |
| `firestore.rules`                                     | Harden 12 rules         |
| `functions/src/analytics.js`                          | Add input validation    |
| `functions/src/rateLimiter.js`                        | Fail closed             |

### High Priority Files

| File                                                                | Changes              |
| ------------------------------------------------------------------- | -------------------- |
| `packages/webgl/src/hooks/unityEvents/useHLSStream.js`              | Complete rewrite     |
| `packages/webgl/src/hooks/unityEvents/useMediaScreenVideoPlayer.js` | Fix timeouts         |
| `packages/webgl/src/hooks/unityEvents/useMediaScreenThumbnails.js`  | Fix interval         |
| `packages/webgl/src/hooks/useAutoAvatarSync.js`                     | Fix listener leak    |
| `packages/webgl/src/hooks/useUnityMessaging.js`                     | Fix double-serialize |
| `functions/src/chatCleanup.js`                                      | Add distributed lock |

### New Files to Create

| File                                               | Purpose                  |
| -------------------------------------------------- | ------------------------ |
| `packages/webgl/src/constants/timing.js`           | Magic number constants   |
| `packages/webgl/src/contexts/UnityStateContext.js` | Replace window globals   |
| `functions/src/auditLog.js`                        | Audit logging utility    |
| `packages/shared/firebase/validation.ts`           | Input validation helpers |

---

## Verification Steps

After implementation, verify:

1. **Security:**

   ```bash
   # Test Firestore rules
   firebase emulators:start
   npm run test:security-rules
   ```

2. **Memory:**

   ```bash
   # Run memory profiling
   cd packages/testing && npm run dev
   # Open Chrome DevTools > Memory > Take heap snapshot
   # Mount/unmount Unity, compare snapshots
   ```

3. **Integration:**
   ```bash
   # Full stack test
   npm run build
   firebase deploy --only functions
   # Test in staging environment
   ```

---

## Risk Assessment

| Risk                                             | Mitigation                                  |
| ------------------------------------------------ | ------------------------------------------- |
| Unity C# needs update for serialization          | Coordinate with Unity team before Phase 3.1 |
| Credential rotation causes downtime              | Deploy during low-traffic window            |
| Rate limiter fail-closed blocks legitimate users | Monitor error rates, have rollback ready    |
| TypeScript migration breaks existing code        | Migrate incrementally, test each file       |

---

## Dependencies

- Unity team coordination for serialization change
- Firebase Console access for credential rotation
- Google Cloud Console for API key regeneration
- Staging environment for testing

---

## Success Criteria

- [ ] All 18 critical issues resolved
- [ ] No memory leaks detected in 100-cycle test
- [ ] Security rules pass all test cases
- [ ] Rate limiting functional under load
- [ ] Audit logs capturing all admin actions
- [ ] Clean build with zero TypeScript errors (migrated files)
