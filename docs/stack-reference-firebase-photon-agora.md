# Stack Reference: Firebase, Normcore, Agora & Integration Patterns

> **Last Updated:** February 2026
> **Purpose:** Comprehensive reference for Firebase, Normcore multiplayer, Agora RTC, and React/Unity integration patterns
> **Migration Note:** Photon Fusion was replaced with Normcore in February 2026. See [Normcore Networking](#normcore-networking) section.

---

## Table of Contents

1. [Stack Overview](#stack-overview)
2. [Firebase Ecosystem](#firebase-ecosystem)
   - [Firestore Database](#firestore-database)
   - [Authentication](#authentication)
   - [Cloud Functions](#cloud-functions)
   - [Storage](#storage)
   - [Hosting](#hosting)
3. [Normcore Networking](#normcore-networking)
   - [Core Concepts](#core-concepts)
   - [Player Sync](#player-sync)
   - [Custom Data Models](#custom-data-models)
   - [Voice Chat](#voice-chat)
   - [WebGL Support](#webgl-support)
4. [Agora RTC](#agora-rtc)
   - [React SDK](#react-sdk)
   - [Unity SDK](#unity-sdk)
   - [Spatial Audio](#spatial-audio)
   - [Token Server](#token-server)
5. [Integration Patterns](#integration-patterns)
   - [React-Firebase](#react-firebase)
   - [Unity-Firebase WebGL](#unity-firebase-webgl)
   - [Metaverse Architecture](#metaverse-architecture)
6. [Security & Best Practices](#security--best-practices)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Quick Reference](#quick-reference)

---

## Stack Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  React App   │  │ Unity WebGL  │  │   Mobile Clients     │  │
│  │  (Vite)      │  │  (Web)       │  │   (iOS/Android)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         ├─────────────────┼──────────────────────┤              │
│         │     react-unity-webgl                  │              │
│         │     (JS ↔ Unity Bridge)                │              │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │                 │                      │
┌─────────┼─────────────────┼──────────────────────┼──────────────┐
│         │         REALTIME SERVICES              │              │
├─────────┼─────────────────┼──────────────────────┼──────────────┤
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────▼───────────┐  │
│  │   Firebase   │  │   Normcore   │  │        Agora         │  │
│  │   Auth/DB    │  │  Multiplayer │  │        RTC           │  │
│  │   Storage    │  │   + Voice    │  │   Voice/Video        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────────────┐
│         │             BACKEND SERVICES                          │
├─────────┼───────────────────────────────────────────────────────┤
│  ┌──────▼───────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Cloud      │  │  Firestore   │  │   Firebase           │  │
│  │  Functions   │  │   Rules      │  │   Hosting CDN        │  │
│  │   (v2)       │  │   Engine     │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + Vite | Micro-frontend shell |
| 3D Engine | Unity WebGL | Metaverse rendering |
| Bridge | react-unity-webgl | React ↔ Unity communication |
| Database | Firebase Firestore | NoSQL document store |
| Auth | Firebase Auth | User authentication |
| Functions | Cloud Functions v2 | Serverless backend |
| Storage | Firebase Storage | Media/asset storage |
| Hosting | Firebase Hosting | CDN & deployment |
| Networking | Normcore 3.0 | Multiplayer state sync |
| Voice/Video | Agora RTC | Real-time communication |

---

## Firebase Ecosystem

### Firestore Database

#### Data Modeling Principles

**Document Design:**
- Keep documents small (< 1 MiB)
- Optimize for read patterns
- Denormalize for query efficiency
- Use subcollections for scaling

**Collection Structure:**
```
/users/{userId}           # User profiles
  /private/{docId}        # Sensitive user data
/spaces/{spaceId}         # Virtual spaces
  /objects/{objectId}     # Space objects
  /chatMessages/{msgId}   # Space chat
  /portals/{portalId}     # Space connections
  /mediaScreens/{id}      # Media displays
/groups/{groupId}         # User groups
/brands/{brandId}         # Brand data
/events/{eventId}         # Events
/webglBuilds/{buildId}    # Unity build configs
```

**Denormalization Pattern:**
```javascript
// Good: Denormalize frequently accessed data
const spaceDoc = {
  id: 'space123',
  name: 'My Space',
  ownerName: 'Daniel',      // Denormalized from /users
  ownerAvatar: 'https://...' // Avoids extra lookup
};
```

#### Query Optimization

**The "500/50/5" Rule** for new collections:
- Start with max 500 operations/second
- Increase by 50% every 5 minutes
- Avoids hot-spotting

**Indexing:**
```javascript
// Composite index needed for multi-field queries
db.collection('spaces')
  .where('isPublic', '==', true)
  .where('category', '==', 'gaming')
  .orderBy('createdAt', 'desc')
```

**Pagination:**
```javascript
// Use cursors, not offset
const first = db.collection('spaces')
  .orderBy('createdAt')
  .limit(25);

const next = db.collection('spaces')
  .orderBy('createdAt')
  .startAfter(lastDoc)
  .limit(25);
```

#### Offline Persistence (Web)

```javascript
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
```

**Caveats:**
- IndexedDB-based storage
- Multi-tab sync supported
- May disconnect unexpectedly (SDK 7.2.1+ improved)
- Can't clear cache programmatically (workaround needed)

---

### Authentication

#### Custom Claims for RBAC

**Setting Claims (Admin SDK):**
```javascript
// Cloud Function
const admin = require('firebase-admin');

exports.setUserRole = functions.https.onCall(async (data, context) => {
  // Verify caller is admin
  if (!context.auth?.token?.groups?.includes('disruptiveAdmin')) {
    throw new functions.https.HttpsError('permission-denied', 'Not admin');
  }

  await admin.auth().setCustomUserClaims(data.userId, {
    groups: data.groups  // e.g., ['disruptiveAdmin', 'space_123_owners']
  });

  return { success: true };
});
```

**Claim Limits:**
- Max 1000 bytes total
- Propagates on next token refresh (~1 hour)
- Force refresh: `user.getIdToken(true)`

**Client-side Check:**
```javascript
const token = await user.getIdTokenResult();
const isAdmin = token.claims.groups?.includes('disruptiveAdmin');
```

**Security Rules with Claims:**
```javascript
function isDisruptiveAdmin() {
  return request.auth != null
         && request.auth.token.groups != null
         && request.auth.token.groups.hasAny(['disruptiveAdmin']);
}

function isSpaceOwner(spaceId) {
  return request.auth != null
         && request.auth.token.groups != null
         && request.auth.token.groups.hasAny(['space_' + spaceId + '_owners']);
}
```

#### Auth State Management (React)

```jsx
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

function AuthProvider({ children }) {
  const [user, loading, error] = useAuthState(auth);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### Cloud Functions

#### V2 Functions - Cold Start Optimization

**Minimum Instances:**
```javascript
const { onCall } = require('firebase-functions/v2/https');

exports.getSpaceData = onCall({
  minInstances: 1,        // Keep 1 warm
  concurrency: 80,        // Handle 80 concurrent requests
  memory: '256MiB',
  region: 'europe-west1'
}, async (request) => {
  // Function logic
});
```

**Optimization Techniques:**

| Technique | Impact | Notes |
|-----------|--------|-------|
| minInstances | High | Eliminates cold starts for critical functions |
| Concurrency | High | V2 only - handle multiple requests per instance |
| Lazy imports | Medium | Import only what's needed |
| Connection reuse | Medium | Reuse Firestore/Admin SDK instances |
| Regional deployment | Medium | Deploy close to users |
| Memory allocation | Medium | More memory = faster cold starts |

**Reuse Connections:**
```javascript
// ✅ Good - Initialize outside function
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

exports.myFunction = onCall(async (request) => {
  // Uses pre-initialized db
  return await db.collection('spaces').doc(request.data.id).get();
});
```

#### Callable vs HTTP Functions

| Feature | Callable (`onCall`) | HTTP (`onRequest`) |
|---------|--------------------|--------------------|
| Auth | Automatic | Manual |
| Serialization | Automatic | Manual |
| CORS | Handled | Manual config |
| Use case | Client apps | Webhooks, APIs |

**Callable Example:**
```javascript
exports.joinSpace = onCall(async (request) => {
  // request.auth automatically populated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const { spaceId } = request.data;
  // ... logic
});
```

**HTTP Example (Webhooks):**
```javascript
exports.webhook = onRequest(async (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-signature'];
  if (!verifySignature(signature, req.body)) {
    res.status(401).send('Invalid signature');
    return;
  }
  // ... process webhook
});
```

---

### Storage

#### Security Rules Pattern

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User avatars - public read, owner write
    match /avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024  // 5MB limit
                   && request.resource.contentType.matches('image/.*');
    }

    // Space assets - space owner/host write
    match /spaces/{spaceId}/{allPaths=**} {
      allow read: if true;
      allow write: if isSpaceOwnerOrHost(spaceId);
    }

    function isSpaceOwnerOrHost(spaceId) {
      return request.auth != null
             && request.auth.token.groups != null
             && (request.auth.token.groups.hasAny(['space_' + spaceId + '_owners'])
                 || request.auth.token.groups.hasAny(['space_' + spaceId + '_hosts']));
    }
  }
}
```

#### Upload Pattern (React)

```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

async function uploadAvatar(userId, file) {
  const storageRef = ref(storage, `avatars/${userId}/${file.name}`);

  // Upload with metadata
  const metadata = {
    contentType: file.type,
    customMetadata: {
      uploadedBy: userId,
      uploadedAt: new Date().toISOString()
    }
  };

  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
}
```

#### CORS Configuration

```json
// cors.json - apply with gsutil
[
  {
    "origin": ["https://your-domain.com"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

```bash
gsutil cors set cors.json gs://your-bucket.appspot.com
```

---

### Hosting

#### Configuration (firebase.json)

```json
{
  "hosting": {
    "site": "your-site",
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "**/*.@(wasm|wasm.gz|wasm.br)",
        "headers": [
          { "key": "Content-Type", "value": "application/wasm" }
        ]
      },
      {
        "source": "**/*.gz",
        "headers": [
          { "key": "Content-Encoding", "value": "gzip" },
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "**/*.br",
        "headers": [
          { "key": "Content-Encoding", "value": "br" }
        ]
      },
      {
        "source": "**/*",
        "headers": [
          { "key": "Access-Control-Allow-Origin", "value": "*" }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### Custom Domain Setup

1. Add domain in Firebase Console → Hosting → Add custom domain
2. Add TXT record to verify ownership
3. Add A/AAAA records pointing to Firebase
4. Wait for SSL provisioning (up to 24 hours)

---

## Normcore Networking

> **Normcore** replaced Photon Fusion in February 2026. Normcore provides authoritative multiplayer networking with built-in voice chat, WebGL support, and a simpler API.
>
> **App Key:** `f41dbed8-197d-4ff7-895d-163915d85372`
> **Dashboard:** [dashboard.normcore.io](https://dashboard.normcore.io)

### Core Concepts

| Concept | Description |
|---------|-------------|
| `Realtime` | Connection manager — lives in scene, handles room join/leave |
| `RealtimeView` | Identity for synced objects (like PhotonView) |
| `RealtimeTransform` | Syncs position/rotation automatically |
| `RealtimeComponent<T>` | Base class for custom synced components |
| `RealtimeModel` | Data model for custom synced properties |
| Ownership | Who controls an object — `isOwnedLocallySelf` |

**Connection Flow:**
```csharp
using Normal.Realtime;

public class PlayerSpawner : MonoBehaviour
{
    [SerializeField] private string playerPrefabName = "Player"; // Must be in Resources/

    private Realtime _realtime;

    void Awake()
    {
        _realtime = GetComponent<Realtime>();
        _realtime.didConnectToRoom += DidConnectToRoom;
    }

    void DidConnectToRoom(Realtime realtime)
    {
        var options = new Realtime.InstantiateOptions
        {
            ownedByClient = true,
            preventOwnershipTakeover = true,
            useInstance = realtime
        };

        Realtime.Instantiate(playerPrefabName, Vector3.zero, Quaternion.identity, options);
    }
}
```

### Player Sync

**RealtimeTransform** handles position/rotation sync automatically. No serialisation code needed.

**Ownership Check (Critical):**
```csharp
using Normal.Realtime;

public class PlayerController : MonoBehaviour
{
    private RealtimeView _realtimeView;

    void Start()
    {
        _realtimeView = GetComponent<RealtimeView>();
    }

    void Update()
    {
        // CRITICAL: Only process input for local player
        if (!_realtimeView.isOwnedLocallyInHierarchy)
            return;

        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        // ... movement code
    }
}
```

### Custom Data Models

For syncing custom data (health, UIDs, avatar URLs, etc.):

```csharp
// 1. Define the model
[RealtimeModel]
public partial class PlayerUIDModel
{
    [RealtimeProperty(1, true, true)]
    private string _uid;
}

// 2. Create component
public class PlayerUIDSharer : RealtimeComponent<PlayerUIDModel>
{
    public string NetworkedUID => model?.uid ?? "";

    protected override void OnRealtimeModelReplaced(PlayerUIDModel previousModel, PlayerUIDModel currentModel)
    {
        if (previousModel != null)
            previousModel.uidDidChange -= OnUIDChanged;
        if (currentModel != null)
        {
            currentModel.uidDidChange += OnUIDChanged;
            // Handle existing value
            if (!string.IsNullOrEmpty(currentModel.uid))
                OnUIDChanged(currentModel, currentModel.uid);
        }
    }

    private void OnUIDChanged(PlayerUIDModel model, string uid)
    {
        // React to UID changes
        Debug.Log($"Player UID: {uid}");
    }

    public void SetUID(string uid)
    {
        // Only the owner can set the value
        model.uid = uid;
    }
}
```

### Voice Chat

Normcore includes built-in voice chat. On our project, voice is currently managed via React using the WebGL messaging bridge (see [Integration Patterns](#integration-patterns)).

**React-side voice events:**
- `ToggleNormcoreMic` — React → Unity: toggle microphone
- `NormcoreVoiceStateChanged` — Unity → React: voice state updates

**Native Normcore voice (if needed):**
```csharp
// Add RealtimeAvatarVoice to player prefab for automatic voice
// Normcore handles the rest — WebRTC transport, echo cancellation, etc.
```

### WebGL Support

Normcore fully supports WebGL via WebSockets. No special configuration needed.

**Key differences from Photon WebGL:**
- No manual protocol switching required
- WebSocket transport is the default
- Lower overhead than Photon's WebSocket layer
- Prefabs must be in `Assets/Resources/` for `Realtime.Instantiate()`

### Normcore vs Photon Mapping

| Photon | Normcore |
|--------|----------|
| `NetworkBehaviour` | `RealtimeComponent<T>` or `MonoBehaviour` |
| `PhotonView` / `NetworkObject` | `RealtimeView` |
| `[Networked]` property | `[RealtimeModel]` + `[RealtimeProperty]` |
| `Object.HasStateAuthority` | `realtimeView.isOwnedLocallySelf` |
| `NetworkRunner` | `Realtime` |
| `Runner.Spawn()` | `Realtime.Instantiate()` |
| `Runner.Despawn()` | `Realtime.Destroy()` |
| `Runner.Shutdown()` | `realtime.Disconnect()` |
| `PlayerRef` | `ownerIDSelf` (int client ID) |
| `[Rpc]` methods | Model property changes + `DidChange` events |
| `Spawned()` override | `OnRealtimeModelReplaced()` |
| `Render()` for change detection | `model.propertyDidChange` event delegates |

---

## Agora RTC

### React SDK Setup

```bash
npm install agora-rtc-react agora-rtc-sdk-ng
```

```tsx
import AgoraRTC, { AgoraRTCProvider, useRTCClient } from 'agora-rtc-react';

function App() {
  const client = useRTCClient(AgoraRTC.createClient({
    mode: 'rtc',
    codec: 'vp8'  // VP8 for better WebGL compatibility
  }));

  return (
    <AgoraRTCProvider client={client}>
      <VoiceChat />
    </AgoraRTCProvider>
  );
}
```

**Voice Chat Component:**
```tsx
import {
  useJoin,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteUsers,
  useRemoteAudioTracks
} from 'agora-rtc-react';

function VoiceChat({ channelName, token, uid }) {
  const { isLoading: isJoining } = useJoin({
    appid: process.env.REACT_APP_AGORA_APP_ID,
    channel: channelName,
    token: token,
    uid: uid
  });

  const { localMicrophoneTrack } = useLocalMicrophoneTrack();
  usePublish([localMicrophoneTrack]);

  const remoteUsers = useRemoteUsers();
  const { audioTracks } = useRemoteAudioTracks(remoteUsers);

  // Play all remote audio
  audioTracks.forEach(track => track.play());

  return (
    <div>
      {isJoining ? 'Joining...' : `Connected with ${remoteUsers.length} users`}
      <button onClick={() => localMicrophoneTrack?.setEnabled(false)}>
        Mute
      </button>
    </div>
  );
}
```

### Unity SDK (WebGL)

**Note:** Use community WebGL SDK: [AgoraIO-Community/Agora_Unity_WebGL](https://github.com/AgoraIO-Community/Agora_Unity_WebGL)

```csharp
// Import WebGL SDK package
// Use AgoraTemplate2020 for Unity 2020+

public class AgoraVoice : MonoBehaviour
{
    private IRtcEngine rtcEngine;

    void Start()
    {
        rtcEngine = IRtcEngine.GetEngine(APP_ID);
        rtcEngine.SetChannelProfile(CHANNEL_PROFILE.CHANNEL_PROFILE_COMMUNICATION);
        rtcEngine.EnableAudio();
    }

    public void JoinChannel(string channelName, string token, uint uid)
    {
        rtcEngine.JoinChannelByKey(token, channelName, "", uid);
    }

    public void LeaveChannel()
    {
        rtcEngine.LeaveChannel();
    }

    void OnDestroy()
    {
        IRtcEngine.Destroy();
    }
}
```

### Spatial Audio

```csharp
// Enable spatial audio
rtcEngine.EnableSpatialAudio(true);

// Create spatial audio engine
var spatialAudioEngine = rtcEngine.GetLocalSpatialAudioEngine();

// Update self position (call every frame or on move)
float[] selfPosition = new float[] { transform.position.x, transform.position.y, transform.position.z };
float[] forward = new float[] { transform.forward.x, transform.forward.y, transform.forward.z };
float[] right = new float[] { transform.right.x, transform.right.y, transform.right.z };
float[] up = new float[] { transform.up.x, transform.up.y, transform.up.z };

spatialAudioEngine.UpdateSelfPosition(selfPosition, forward, right, up);

// Update remote user positions
spatialAudioEngine.UpdateRemotePosition(remoteUid, remotePosition, remoteForward);
```

### Token Server (Cloud Function)

```javascript
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

exports.getAgoraToken = onCall({
  region: 'europe-west1'
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { channelName, role } = request.data;
  const uid = request.auth.uid;

  // Token expires in 1 hour
  const expirationTime = Math.floor(Date.now() / 1000) + 3600;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    0,  // Use 0 for string UID
    role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
    expirationTime
  );

  return { token, uid };
});
```

---

## Integration Patterns

### React-Firebase State Management

```tsx
// UserProvider.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    const unsubProfile = onSnapshot(
      doc(db, 'users', authUser.uid),
      (doc) => {
        setProfile(doc.exists() ? { id: doc.id, ...doc.data() } : null);
        setLoading(false);
      },
      (error) => {
        console.error('Profile subscription error:', error);
        setLoading(false);
      }
    );

    return () => unsubProfile();
  }, [authUser]);

  return (
    <UserContext.Provider value={{ authUser, profile, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
```

### Unity-Firebase WebGL

**Important:** Official Firebase Unity SDK doesn't support WebGL!

**Workaround Pattern:**

1. **React handles all Firebase calls**
2. **Unity communicates via react-unity-webgl**

```javascript
// React side
import { useUnityContext } from 'react-unity-webgl';

function GameContainer() {
  const { sendMessage, addEventListener, removeEventListener } = useUnityContext(config);

  useEffect(() => {
    const handleRequestSpaceData = async (spaceId) => {
      const spaceDoc = await getDoc(doc(db, 'spaces', spaceId));
      sendMessage('GameController', 'ReceiveSpaceData', JSON.stringify(spaceDoc.data()));
    };

    addEventListener('RequestSpaceData', handleRequestSpaceData);
    return () => removeEventListener('RequestSpaceData', handleRequestSpaceData);
  }, []);

  return <Unity unityProvider={unityProvider} />;
}
```

```csharp
// Unity side
using System.Runtime.InteropServices;

public class FirebaseBridge : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void RequestSpaceData(string spaceId);

    public void LoadSpace(string spaceId)
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        RequestSpaceData(spaceId);
        #endif
    }

    // Called from React
    public void ReceiveSpaceData(string json)
    {
        var spaceData = JsonUtility.FromJson<SpaceData>(json);
        // Process space data
    }
}
```

### Metaverse Architecture Pattern

```
User Joins Space Flow:
━━━━━━━━━━━━━━━━━━━━━━

1. React App
   │
   ├─► Firebase Auth (login)
   │
   ├─► Firestore (get space config)
   │
   ├─► Cloud Function (get Agora token)
   │
   └─► Send to Unity: space config, Agora token
       │
       Unity WebGL
       │
       ├─► Load 3D environment
       │
       ├─► Connect Normcore (room = spaceId)
       │
       ├─► Connect Agora (channel = spaceId)
       │
       └─► Sync player state via Normcore
           Voice via Normcore (React bridge) / Agora
```

---

## Security & Best Practices

### Firebase Security Rules Checklist

- [ ] Default deny all, then allow specific paths
- [ ] Use custom claims for roles (admin, owner, host)
- [ ] Validate data structure in rules
- [ ] Limit query sizes to prevent enumeration
- [ ] Separate public/private data in subcollections
- [ ] Test rules with emulator before deploy

### App Check Implementation

```javascript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

### Rate Limiting Pattern

```javascript
// Cloud Function with rate limiting
const rateLimit = new Map();

exports.rateLimitedFunction = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Auth required');

  const now = Date.now();
  const windowMs = 60000;  // 1 minute
  const maxRequests = 10;

  const userRequests = rateLimit.get(uid) || [];
  const recentRequests = userRequests.filter(t => t > now - windowMs);

  if (recentRequests.length >= maxRequests) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded');
  }

  recentRequests.push(now);
  rateLimit.set(uid, recentRequests);

  // ... function logic
});
```

---

## Common Issues & Solutions

### Firebase

| Issue | Solution |
|-------|----------|
| Custom claims not updating | Force token refresh: `user.getIdToken(true)` |
| Firestore offline IndexedDB disconnects | Update to SDK 7.2.1+, handle reconnection |
| CORS errors on Storage | Configure CORS with gsutil |
| Cold start latency | Set minInstances, use concurrency |
| Security rules blocking | Test with emulator, check auth state |

### Normcore

| Issue | Solution |
|-------|----------|
| Players can't join same room | Check room name matches, verify app key in NormcoreAppSettings |
| Object not syncing | Ensure `RealtimeView` + `RealtimeTransform` on prefab |
| Can't modify synced property | Check ownership: `realtimeView.isOwnedLocallySelf` |
| Prefab not spawning | Must be in `Assets/Resources/` folder |
| Missing scripts after migration | Expected from GameCreator Fusion components — rebuild with standard GC actions |
| Voice not working | Check React bridge: `ToggleNormcoreMic` / `NormcoreVoiceStateChanged` events |

### Agora

| Issue | Solution |
|-------|----------|
| Token expired | Implement token refresh before expiry |
| No audio in WebGL | Ensure user interaction first (click handler) |
| Spatial audio not working | Update positions every frame, check coordinate system |
| Echo/feedback | Enable echo cancellation, use headphones |

### Unity WebGL

| Issue | Solution |
|-------|----------|
| Firebase SDK not working | Use React bridge pattern instead |
| Audio not playing | Require user interaction first |
| Memory issues | See Unity WebGL reference doc |
| Build too large | Enable compression, code stripping |

---

## Quick Reference

### Emulator Commands

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,functions

# Export data for reuse
firebase emulators:export ./seed-data

# Start with seed data
firebase emulators:start --import=./seed-data
```

### Deployment Commands

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage

# Deploy to preview channel
firebase hosting:channel:deploy preview
```

### Useful Firebase CLI

```bash
# View function logs
firebase functions:log

# Delete a function
firebase functions:delete functionName

# List projects
firebase projects:list

# Switch project
firebase use project-id
```

### Normcore Dashboard

- [Normcore Dashboard](https://dashboard.normcore.io/)
- App Key: `f41dbed8-197d-4ff7-895d-163915d85372`
- View room statistics
- Monitor bandwidth and CCU
- Manage app settings

### Agora Console

- [Agora Console](https://console.agora.io/)
- Generate App IDs
- Configure security
- View usage analytics
- Download SDKs

---

## References

### Firebase
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Cloud Functions Tips](https://firebase.google.com/docs/functions/tips)
- [Security Rules](https://firebase.google.com/docs/rules/)
- [App Check](https://firebase.google.com/docs/app-check)

### Normcore
- [Normcore Documentation](https://normcore.io/documentation/)
- [Normcore Dashboard](https://dashboard.normcore.io/)
- [RealtimeComponent Guide](https://normcore.io/documentation/realtime/realtimecomponent)
- [RealtimeModel Guide](https://normcore.io/documentation/realtime/realtimemodel)
- [WebGL Support](https://normcore.io/documentation/platforms/webgl)
- [Voice Chat](https://normcore.io/documentation/realtime-voice/)

### Agora
- [React SDK](https://github.com/AgoraIO-Extensions/agora-rtc-react)
- [Unity WebGL SDK](https://github.com/AgoraIO-Community/Agora_Unity_WebGL)
- [Spatial Audio](https://docs.agora.io/en/voice-calling/advanced-features/spatial-audio)
- [Token Server Guide](https://docs.agora.io/en/interactive-live-streaming/develop/authentication-workflow)

### Integration
- [FirebaseWebGL Package](https://github.com/rotolonico/FirebaseWebGL)
- [react-unity-webgl](https://react-unity-webgl.dev/)

---

*Document generated from comprehensive research of official documentation and community resources.*
