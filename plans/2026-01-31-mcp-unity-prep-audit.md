# MCP Unity Setup & Integration Prep

## Status: PREP COMPLETE ✅

**Waiting for Unity SDK download to complete**

---

## Executive Summary

### Architecture Note

**This monorepo is frontend-only.** Backend storage and security rules are managed in a separate repository:

- **Admin Repo:** [ReactSpacesAdmin](https://github.com/spacesmetaverse/ReactSpacesAdmin)
- **Storage Rules:** Defined in admin repo, deployed separately

### Issues to Address

| #   | Issue                            | File                         | Severity  | Notes                         |
| --- | -------------------------------- | ---------------------------- | --------- | ----------------------------- |
| 1   | Event name typo (trailing space) | useUnityOnRequestForMedia.js | 🟠 HIGH   | Will cause event mismatch     |
| 2   | alert() in production code       | useUnityOnRequestForMedia.js | 🟠 HIGH   | Should use Logger             |
| 3   | Empty Firestore indexes          | firestore.indexes.json       | 🟡 MEDIUM | Analytics queries may be slow |

### Clarified Items (Not Issues)

| Item                            | Status           | Explanation                   |
| ------------------------------- | ---------------- | ----------------------------- |
| 'users' group bypass            | ✅ By Design     | Allows anonymous/guest access |
| No space ownership in analytics | ✅ Experimental  | Not production code           |
| No storage.rules in repo        | ✅ Separate Repo | Rules in ReactSpacesAdmin     |

### When Download Completes

1. Get new SDK path from you
2. Update `.mcp.json` with correct path
3. Test MCP Unity connection
4. Check for MCP package updates

### Audits Completed (11 areas)

- ✅ Unity Integration Code
- ✅ Unity Event Hooks (37 hooks)
- ✅ react-unity-webgl versions
- ✅ Agora SDK versions
- ✅ Firebase Cloud Functions
- ✅ Firestore Indexes
- ✅ Authentication Flow
- ✅ Package Dependencies
- ✅ Vite Build Configs
- ✅ Firebase Storage Rules
- ✅ Documentation/Skills

---

## Prep Work Completed

### 1. Unity Integration Code Review ✅

**Key Files Identified:**
| Component | Path |
|-----------|------|
| Messaging Hook | `packages/webgl/src/hooks/useUnityMessaging.js` |
| Unity Provider | `packages/webgl/src/providers/UnityProvider.jsx` |
| WebGL Loader | `packages/webgl/src/WebGLLoader.jsx` |
| Keyboard Utils | `packages/webgl/src/utils/unityKeyboard.js` |
| Main Renderer | `packages/webgl/src/WebGLRenderer/index.jsx` |

**Issues Found:**

1. **Hardcoded build paths** (WebGLLoader.jsx:256-259) → "SpacesMetaverse_SDK" - may need updating
2. **react-unity-webgl v10.1.5** → verify Unity 6 compatibility
3. **Module.WebGLInputHandler direct access** → Unity 6 may rename internals
4. **No Unity version detection** → can't handle 5.x vs 6.x differences
5. **Keyboard polling race conditions** → 5s timeout may miss Unity 6 lazy-loading

### 2. Documentation Audit ✅

**Existing Docs (Good Quality):**

- `docs/unity-6-webgl-webgpu-reference.md` - 95% complete
- `docs/stack-reference-firebase-photon-agora.md` - 93% complete

**Skills Created:**

- `.claude/skills/daniel-unity/SKILL.md` ✅
- `.claude/skills/daniel-stack/SKILL.md` ✅

**Minor Gaps to Address Later:**

- WebGPU browser support status outdated
- Photon Fusion section incomplete (only link, no patterns)
- Missing cost estimation section
- Token refresh lifecycle not documented

### 3. Current MCP Config

```json
{
  "mcpServers": {
    "mcp-unity": {
      "command": "node",
      "args": ["/path/to/SpacesSDK/Packages/com.gamelovers.mcp-unity/Server~/build/index.js"],
      "env": { "UNITY_PORT": "8090" }
    }
  }
}
```

**Status:** Path points to old (trashed) SDK location → needs updating

---

## Once Download Completes

### Step 1: Update MCP Config

- Get new SDK path from user
- Update `.mcp.json` with correct path
- Verify `com.gamelovers.mcp-unity` package exists

### Step 2: Check for MCP Updates

- Read `Packages/com.gamelovers.mcp-unity/package.json` for current version
- Check GitHub/npm for latest version
- Report if update available

### Step 3: Test MCP Connection

- Start Unity Editor with project
- Test `get_console_logs` or `get_scene_info`
- Verify bidirectional communication

### Step 4: Optional Improvements

Based on code review findings:

- [ ] Consider parameterizing build name (currently hardcoded)
- [ ] Check react-unity-webgl compatibility with Unity 6
- [ ] Document any API changes needed

---

## Available MCP Tools (once connected)

| Tool                | Purpose                          |
| ------------------- | -------------------------------- |
| `execute_menu_item` | Run Unity menu commands          |
| `select_gameobject` | Select objects in hierarchy      |
| `add_package`       | Add packages to project          |
| `run_tests`         | Execute Unity tests              |
| `get_console_logs`  | Read console output              |
| `update_component`  | Modify component values          |
| `get_scene_info`    | Scene details                    |
| `create_prefab`     | Create prefabs                   |
| Scene tools         | load, save, create scenes        |
| Transform tools     | move, rotate, scale objects      |
| Material tools      | create, assign, modify materials |

---

---

## Unity Event Hooks Deep Dive ✅

### Architecture Overview

**37 hooks** in `packages/webgl/src/hooks/unityEvents/` - the React↔Unity communication layer.

### Core Infrastructure

| Hook                     | Purpose                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `useSendUnityEvent`      | Queue & deliver events TO Unity via `ReactIncomingEvent.HandleEvent` |
| `useListenForUnityEvent` | Listen for events FROM Unity with JSON parsing                       |

### Hook Categories

**Send-to-Unity (4):** `usePlacePrefab`, `usePlacePortal`, `usePlaceVideoCanvas`, `usePlaceCatalogueItem`

**Listen-from-Unity - Lifecycle (3):** `useUnityOnFirstSceneLoaded`, `useUnityOnPlayerInstantiated`, `useUnityOnHelloFromUnity`

**Listen-from-Unity - Interaction (4):** `useUnityOnNameplateClick`, `useUnityOnPortalClick`, `useUnityOnCatalogueItemClick`, `useUnityOnPortalNavigate`

**Listen-from-Unity - Media (3):** `useUnityOnPlayVideo`, `useUnityOnRequestForMedia`, `useMediaScreenVideoPlayer`

**Listen-from-Unity - System (4):** `useUnityOnRequestUser`, `useUnityOnStoreUserData`, `useUnityPlayerList`, `useUnityKickPlayer`

**Data Fetchers (9):** `useSpaceObjects`, `useSpacePortals`, `useSpaceCatalogueItems`, `useVideoCanvasItems`, `useFetchVideoUrl`, `useUnityPortalImages`, `useUnityMediaScreenImages`, `useUnityThumbnails`, `useMediaScreenThumbnails`

**Streaming (1):** `useHLSStream`

**Analytics (2):** `useUnityAnalytics`, `usePortalAnalytics`

### Issues Found

| Issue                   | Location                                                            | Severity |
| ----------------------- | ------------------------------------------------------------------- | -------- |
| Event name typo         | `useUnityOnRequestForMedia` - trailing space                        | HIGH     |
| `alert()` in production | `useUnityOnRequestForMedia`                                         | HIGH     |
| Double JSON encoding    | All send patterns                                                   | MEDIUM   |
| Magic number delays     | `useHLSStream` (500ms, 2s), `useMediaScreenVideoPlayer` (100ms, 5s) | MEDIUM   |
| Over-engineered HLS     | 4 different send methods, polling intervals                         | MEDIUM   |
| ID parsing fragility    | `useUnityOnCatalogueItemClick` - split on '\_'                      | MEDIUM   |
| No unit tests           | Entire hooks directory                                              | LOW      |

### Real-time Listeners (only 3)

1. `useSpaceCatalogueItems` - Firestore onSnapshot
2. `useVideoCanvasItems` - Firestore onSnapshot
3. `useMediaScreenThumbnails` - 5min interval refresh

### Patterns Worth Noting

- All events to Unity go through `ReactIncomingEvent.HandleEvent(eventName, JSON.stringify(data))`
- Player readiness checked via `window.isPlayerInstantiated` flag
- Dual send methods (standard + direct) create redundancy in placement hooks
- All data double-JSON-encoded: `{ eventName, data: JSON.stringify(data) }`

---

## react-unity-webgl Research ✅

### Current Version Status

| Item               | Value                                 |
| ------------------ | ------------------------------------- |
| **Your version**   | ^10.1.5 (in package.json)             |
| **Latest version** | 10.1.6 (Oct 2024)                     |
| **Update needed?** | Minor - just TypeScript compiler bump |

### Recent Releases (v10.x)

| Version | Date     | Changes                             |
| ------- | -------- | ----------------------------------- |
| 10.1.6  | Oct 2024 | TypeScript compiler update          |
| 10.1.5  | Jul 2024 | Hidden cleanup canvas element       |
| 10.1.4  | Jul 2024 | Improved TypeScript typings         |
| 10.1.0  | Jul 2024 | Unity Metrics Info API              |
| 10.0.0  | Jul 2024 | Major: removed `unload` requirement |
| 9.9.0   | Jun 2024 | autoSyncPersistentDataPath support  |
| 9.8.0   | Feb 2024 | workerUrl for multithreading        |

### Unity 6 Compatibility

**Status: Likely compatible but not explicitly documented**

- react-unity-webgl v9+ supports Unity 2020+ builds
- No explicit Unity 6 mention in release notes
- Community reports some Unity 6 WebGL issues (invisible assets) but these appear Unity-side, not library-side
- ReactUnity (different project) fixed Unity 6 issues in v0.19.0

### Recommendations

1. **Update to 10.1.6** - Minor update, low risk
2. **Test with Unity 6 build** - Verify compatibility when SDK ready
3. **Check Unity 6 WebGL build settings** - May need adjustments for:
   - Graphics API (WebGL 2.0 vs WebGPU)
   - Compression format
   - Memory size

### Sources

- [react-unity-webgl npm](https://www.npmjs.com/package/react-unity-webgl)
- [GitHub Releases](https://github.com/jeffreylanters/react-unity-webgl/releases)
- [React Unity WebGL Docs](https://react-unity-webgl.dev/)

---

## Agora SDK Research ✅

### Current Versions in Project

| Package          | Location          | Version | Latest    |
| ---------------- | ----------------- | ------- | --------- |
| agora-rtc-sdk-ng | packages/webgl    | ^4.24.0 | 4.24.2 ⚠️ |
| agora-rtc-sdk-ng | packages/website  | 4.23.1  | 4.24.2 ⚠️ |
| agora-rtc-sdk-ng | root package.json | ^4.23.2 | 4.24.2 ⚠️ |
| agora-rtc-react  | packages/webgl    | ^2.3.0  | 2.4.0 ⚠️  |
| agora-rtc-react  | root package.json | ^2.3.0  | 2.4.0 ⚠️  |

### Version Inconsistencies Found

1. **agora-rtc-sdk-ng**: 3 different versions across packages (4.23.1, ^4.23.2, ^4.24.0)
2. **Should align** to single version for consistency

### Latest Versions

| Package          | Latest | Notes                  |
| ---------------- | ------ | ---------------------- |
| agora-rtc-sdk-ng | 4.24.2 | ~1 month old           |
| agora-rtc-react  | 2.4.0  | Supports sdk-ng 4.23.2 |

### Key Features (agora-rtc-react 2.x)

- No longer need sdk-ng in package.json (bundled)
- Components: `AgoraRTCProvider`, `RemoteUser`, `RemoteVideoTrack`
- Hooks: `useRemoteUsers`, `useRemoteVideoTracks`, `useRemoteAudioTracks`, `useVolumeLevel`, `useIsConnected`

### Recommendations

1. **Align versions** across all package.json files
2. **Update agora-rtc-react to 2.4.0** - may allow removing explicit sdk-ng dependency
3. **Test voice chat** after updates - breaking changes possible

### Sources

- [agora-rtc-sdk-ng npm](https://www.npmjs.com/package/agora-rtc-sdk-ng)
- [agora-rtc-react npm](https://www.npmjs.com/package/agora-rtc-react)
- [GitHub Releases](https://github.com/AgoraIO-Extensions/agora-rtc-react/releases)

---

## Firebase Cloud Functions Audit ✅

### Functions Overview

| Function                 | Type             | Purpose                                        |
| ------------------------ | ---------------- | ---------------------------------------------- |
| `trackAnalytics`         | Callable         | Track user analytics events with deduplication |
| `createAnalyticsSession` | Callable         | Create named analytics sessions                |
| `endAnalyticsSession`    | Callable         | End analytics sessions                         |
| `manualChatCleanup`      | Callable         | Admin-triggered chat message cleanup           |
| `cleanupOldChatMessages` | Scheduled (2 AM) | Auto-delete chat messages >24h old             |
| `cleanupRateLimits`      | Scheduled (3 AM) | Remove expired rate limit docs                 |

### Configuration

- **Node**: 20 (LTS)
- **Region**: us-central1
- **Memory**: 256MiB
- **Timeout**: 60s
- **Firebase SDK**: v6 (latest)

### Security Issues Found

| Severity     | Issue                             | Location              |
| ------------ | --------------------------------- | --------------------- |
| **CRITICAL** | No space ownership verification   | analytics.js:29, 143  |
| HIGH         | Rate limiter graceful degradation | rateLimiter.js:98-101 |
| HIGH         | No `sessionData` size validation  | analytics.js:163      |
| HIGH         | Error message leak to client      | chatCleanup.js:190    |

### Performance Issues

| Issue                       | Location          | Impact                   |
| --------------------------- | ----------------- | ------------------------ |
| Sequential space processing | chatCleanup.js:52 | Could exceed 60s timeout |
| Unbounded requests array    | rateLimiter.js:38 | Document size bloat      |
| `minInstances: 0`           | analytics.js:11   | Cold start latency       |
| Code duplication            | chatCleanup.js    | ~100 lines duplicated    |

### Recommendations (Priority Order)

1. **Add space ownership verification** to trackAnalytics/createAnalyticsSession
2. **Validate sessionData size** (max 10KB)
3. **Remove error message leak** - use generic response
4. **Extract duplicate cleanup logic** into shared utility
5. **Refactor rate limit documents** - use per-minute buckets
6. **Parallelize space iteration** in chat cleanup

### Files

- [analytics.js](functions/src/analytics.js) - 229 lines
- [rateLimiter.js](functions/src/rateLimiter.js) - 236 lines
- [chatCleanup.js](functions/src/chatCleanup.js) - 192 lines
- [rateLimitCleanup.js](functions/src/rateLimitCleanup.js) - 21 lines

---

## Firestore Indexes Audit ✅

### Current State: **EMPTY** ⚠️

`firestore.indexes.json` contains no composite indexes - relying entirely on automatic single-field indexes.

### Composite Queries Found (Need Explicit Indexes)

| Collection          | Query Pattern                                       | Needs Index |
| ------------------- | --------------------------------------------------- | ----------- |
| `analyticsEvents`   | `orderBy('timestamp', 'desc') + where('eventType')` | ✅ YES      |
| `analyticsEvents`   | `orderBy('timestamp', 'desc') + where('category')`  | ✅ YES      |
| `analyticsEvents`   | `orderBy('timestamp', 'desc') + where('userId')`    | ✅ YES      |
| `analyticsSessions` | `orderBy('startTime', 'desc') + where('userId')`    | ✅ YES      |
| `analyticsSessions` | `orderBy('startTime', 'desc') + where('isActive')`  | ✅ YES      |
| `chatMessages`      | `orderBy('timestamp') + where('timestamp', '<')`    | ✅ YES      |
| `chatMessages`      | `orderBy('timestamp', 'asc') + startAt()`           | Automatic   |
| `catalogue`         | `where('type', '==', 'video_canvas')`               | Automatic   |
| `spaces`            | `where('tags', 'array-contains')`                   | Automatic   |
| `rateLimits`        | `where('windowStart', '<')`                         | Automatic   |

### Impact of Missing Indexes

- **Without indexes**: Queries fail with `FAILED_PRECONDITION` or auto-create (slow first query)
- **Auto-create delay**: Can take minutes to hours for new indexes to build
- **Production risk**: First user hitting composite query gets an error

### Recommendation

Create indexes for analytics queries **before** production traffic.

---

## Authentication Flow Audit ✅

### Architecture Overview

**UserProvider** (`packages/shared/providers/UserProvider.jsx`) is the core auth state manager:

- Firebase `onAuthStateChanged` listener for auth state
- Minimal user pattern (set UID/email immediately, fetch profile async)
- Guest user support via `guestUserGenerator.js`
- Unity integration via EventBus → `sendUserToUnity()`

### Auth Methods Supported

| Method         | Location           | Status               |
| -------------- | ------------------ | -------------------- |
| Email/Password | SignIn.jsx:111-167 | ✅                   |
| reCAPTCHA v2   | SignIn.jsx:40-51   | ✅ (bypassed in dev) |
| Guest Access   | SignIn.jsx:226-266 | ✅                   |
| Password Reset | SignIn.jsx:169-213 | ✅                   |

### Security Findings

| Severity     | Issue                                 | Location                   |
| ------------ | ------------------------------------- | -------------------------- |
| **CRITICAL** | 'users' group bypass (testing mode)   | userPermissions.ts:166-172 |
| HIGH         | Full page reload on signin            | SignIn.jsx:141             |
| MEDIUM       | Username check only queries 100 users | userFirestore.js:41        |
| MEDIUM       | Guest RPM URL hardcoded (testing)     | guestUserGenerator.js:48   |

### Good Practices Found ✅

- Email separated into private subcollection
- Guest access gated by `allowGuestUsers` flag
- Race conditions mitigated with `isMounted` pattern
- Token refresh via `getIdTokenResult(true)`
- Profanity filtering on registration
- Firestore rules align with implementation

### Guest User Flow

1. Space has `allowGuestUsers: true` in Firestore
2. Guest clicks "Continue as Guest"
3. `guestUserGenerator.js` creates temporary user object
4. Guest UID pattern: `guest_{timestamp}_{random}`
5. Username: `Visitor_XXXX` (random 4 digits)
6. Groups: `['guests']`

### Auth → Unity Flow

```
onAuthStateChanged → setUser() → sendUserToUnity()
    ↓
EventBus.publish('sendUserToUnity', filteredUser)
    ↓
useUnityOnRequestUser hook
    ↓
sendEvent('PlaceUserData', user) → ReactIncomingEvent.HandleEvent
```

### Files

- [UserProvider.jsx](packages/shared/providers/UserProvider.jsx) - 694 lines
- [SignIn.jsx](packages/shared/components/auth/SignIn.jsx) - 569 lines
- [userPermissions.ts](packages/shared/firebase/userPermissions.ts) - 287 lines
- [guestUserGenerator.js](packages/shared/utils/guestUserGenerator.js) - 149 lines

---

## Package Dependencies Audit ✅

### Workspace Structure

| Package                              | Version | Type               |
| ------------------------------------ | ------- | ------------------ |
| root                                 | -       | pnpm workspace     |
| @disruptive-spaces/shared            | 1.0.0   | Shared utilities   |
| @disruptive-spaces/webgl             | 0.9.22  | Unity WebGL loader |
| @disruptive-spaces/chat              | 0.9.22  | Chat component     |
| @disruptive-spaces/header-auth-links | 0.9.22  | Auth UI            |
| @disruptive-spaces/testing           | 0.1.5   | Dev harness        |
| website                              | 0.9.22  | Main website       |
| functions                            | -       | Cloud Functions    |

### Version Inconsistencies ⚠️

| Package               | Versions Found                                        | Recommended |
| --------------------- | ----------------------------------------------------- | ----------- |
| **firebase**          | ^11.5.0 (root, shared), ^11.4.0 (website)             | ^11.5.0     |
| **agora-rtc-sdk-ng**  | ^4.24.0 (webgl), 4.23.1 (website), ^4.23.2 (root)     | ^4.24.0     |
| **vite**              | ^6.2.1 (chat, header-auth, testing), ^6.2.2 (website) | ^6.2.2      |
| **react-unity-webgl** | ^10.1.5 (webgl, header-auth, testing)                 | ^10.1.6     |

### Duplicate Dependencies

| Package            | Location(s)                                | Action        |
| ------------------ | ------------------------------------------ | ------------- |
| `@chakra-ui/react` | webgl, chat, header-auth, testing, website | Hoist to root |
| `@emotion/react`   | webgl, header-auth, testing, website       | Hoist to root |
| `framer-motion`    | webgl, chat, header-auth, testing, website | Hoist to root |
| `react-icons`      | webgl, header-auth, testing, website       | Hoist to root |
| `prop-types`       | webgl, chat, header-auth, testing          | Hoist to root |
| `react-hook-form`  | webgl, header-auth, testing                | Hoist to root |

### Missing Dependencies

| Issue                       | Location                     |
| --------------------------- | ---------------------------- |
| No `@types/react` in shared | packages/shared/package.json |
| No explicit React in shared | Uses workspace:\* refs only  |

### pnpm Override Enforcement ✅

```json
"pnpm": {
  "overrides": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### Node Version

- Root: `>=20`
- Functions: `20` (exact)
- Status: ✅ Aligned

### Recommendations

1. **Align firebase** to ^11.5.0 in website package
2. **Align agora-rtc-sdk-ng** to ^4.24.0 everywhere
3. **Update react-unity-webgl** to ^10.1.6
4. **Consider hoisting** common deps (Chakra, Emotion, framer-motion) to root
5. **Add TypeScript config** to shared package

---

## Vite Build Configs Audit ✅

### Config Comparison

| Package     | Plugin           | React Dedupe      | Sourcemaps | Versioned Output |
| ----------- | ---------------- | ----------------- | ---------- | ---------------- |
| webgl       | react-swc        | ❌                | ❌         | ✅ v{version}    |
| chat        | react-swc        | ❌                | ❌         | ✅ v{version}    |
| header-auth | react-swc        | ❌                | ❌         | ✅ v{version}    |
| testing     | react-swc        | ✅ dedupe + alias | ❌         | ✅ v{version}    |
| website     | react (standard) | ❌                | ✅         | ✅ v{version}    |

### Issues Found

1. **Plugin Inconsistency**
   - 4 packages: `@vitejs/plugin-react-swc` (faster, uses SWC)
   - 1 package: `@vitejs/plugin-react` (standard, uses Babel)
   - Recommendation: Use react-swc everywhere for consistency/speed

2. **React Deduplication Missing** ⚠️
   - Only `testing` package has React deduplication configured
   - Other packages may have "multiple React instances" issues
   - Symptoms: hooks errors, context not working across packages

3. **Sourcemaps Missing**
   - Only `website` has `sourcemap: true`
   - Other packages harder to debug in production

4. **No Code Splitting**
   - No `manualChunks` configuration
   - All code in single bundle per package
   - Could improve initial load times

5. **Missing Optimizations**
   - No compression plugin (vite-plugin-compression)
   - No bundle analysis (rollup-plugin-visualizer)
   - No CSS extraction control

### Good Practices Found ✅

- Relative paths with `base: './'`
- Version-based cache busting (`main.v${version}.js`)
- Shared package alias configured consistently
- `emptyOutDir: true` prevents stale builds

### testing Package (Best Config)

Has the most complete config with React deduplication:

```javascript
resolve: {
  alias: {
    'react': path.resolve(rootDir, 'node_modules/react'),
    'react-dom': path.resolve(rootDir, 'node_modules/react-dom'),
    // ... jsx-runtime aliases
  },
  dedupe: ['react', 'react-dom', 'framer-motion', '@chakra-ui/react']
},
optimizeDeps: {
  include: ['react', 'react-dom', 'react/jsx-runtime'],
  force: true
}
```

### Recommendations

1. **Copy React deduplication** from testing to all other packages
2. **Standardize on react-swc** for all packages
3. **Enable sourcemaps** in all packages for debugging
4. **Add code splitting** for large dependencies (Chakra, Agora)
5. **Consider shared Vite config** base to reduce duplication

---

## Firebase Storage Rules Audit ✅

### Current State: **NO RULES FILE** ⚠️

No `storage.rules` file exists in the project. No `storage` section in `firebase.json`.

### Storage Usage Found

| File                 | Path Pattern                  | Purpose             |
| -------------------- | ----------------------------- | ------------------- |
| `firebaseStorage.js` | `avatars/{userId}/avatar.glb` | User avatar uploads |
| `firebaseStorage.js` | `avatars/defaults/*.glb`      | 7 default avatars   |

### Functions

| Function                        | Purpose                                |
| ------------------------------- | -------------------------------------- |
| `uploadAvatarGLB()`             | Upload GLB file + update Firestore     |
| `uploadAvatarFromUrl()`         | Fetch external GLB → upload to Storage |
| `getAvatarUrl()`                | Get download URL for user avatar       |
| `getDefaultAvatarForUsername()` | Deterministic default avatar selection |
| `fetchHttpUrlFromGsUrl()`       | Convert gs:// to HTTP URL              |

### Security Concerns

| Severity | Issue                                                              |
| -------- | ------------------------------------------------------------------ |
| **HIGH** | No version-controlled storage.rules                                |
| **HIGH** | Rules may exist only in Firebase Console (untracked)               |
| MEDIUM   | No file size validation in `uploadAvatarGLB()`                     |
| MEDIUM   | No file type validation (trusts contentType header)                |
| LOW      | Default avatars use hardcoded URLs (should use environment config) |

### Recommended storage.rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Default avatars - public read
    match /avatars/defaults/{fileName} {
      allow read: if true;
      allow write: if false; // Admin-only via Console
    }

    // User avatars - owner read/write, public read
    match /avatars/{userId}/{fileName} {
      allow read: if true; // Avatars are public
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 10 * 1024 * 1024 // 10MB
                   && request.resource.contentType.matches('model/gltf-binary');
    }
  }
}
```

### Recommendations

1. **Create storage.rules** file with above template
2. **Add storage section** to firebase.json
3. **Add file size validation** in React code (client-side check)
4. **Add file type validation** (verify GLB magic bytes)
5. **Move default avatar URLs** to environment config

---

## Notes

- Old SDK in Trash: `/Users/comparethecloud/.Trash/SpacesSDK_DevelopmentBuild`
- User downloading fresh copy
- MCP requires Unity Editor running on port 8090
