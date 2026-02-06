# Configuration & Operations Reference

Regions, quickmatch, disconnect handling, auto-reconnect, offline mode, and server options.

## Regions

### Available Regions (11)

| ID                  | Name           | Datacentres                |
| ------------------- | -------------- | -------------------------- |
| `us-east`           | US East        | New York, Ashburn VA       |
| `us-central`        | US Central     | Chicago, Dallas TX         |
| `us-west`           | US West        | San Francisco, Los Angeles |
| `europe-west`       | Europe         | Amsterdam, Frankfurt       |
| `me-central`        | Middle East    | Dubai UAE                  |
| `asia-southeast`    | Asia Southeast | Singapore                  |
| `asia-east`         | Asia East      | Osaka Japan                |
| `oceania`           | Oceania        | Sydney Australia           |
| `africa-south`      | South Africa   | Johannesburg               |
| `southamerica-east` | South America  | São Paulo                  |
| `asia-south`        | India          | Mumbai                     |

### Fetching Regions

```csharp
var response = await _realtime.GetRegionsListAsync();

// response.client: IP, GeoIP lat/long
// response.regions: sorted by lowest latency (or GeoIP distance on WebGL)
// Each region: identifier, displayName, serverIP, coordinates, ping
```

### Connecting with Preferred Region

```csharp
_realtime.Connect("room-name", new Room.ConnectOptions {
    preferredRegions = new[] { "europe-west", "us-east" }
});
```

### Multi-Player Region Strategy

Aggregate all players' ping data → sum by region → sort by lowest total latency.

### WebGL Caveat

WebGL cannot ping servers. The response uses **GeoIP distance** instead of actual latency measurements.

### Important

Normcore may occasionally place a room in a different region due to capacity constraints or network outages.

---

## Quickmatch

Automatically connects players to rooms, creating new ones when needed.

### Matching Algorithm

Players placed in the room with the **most players that still has space**. Prioritises filling existing rooms. Ties broken by most recently created room.

### Inspector Setup

Realtime → Join Room On Start → **Next Available Room (Quickmatch)**:

- Room Group Name (1-32 chars, letter-start, alphanumeric/hyphens/underscores)
- Room Capacity (1-500)

### API

```csharp
// Auto-match
_realtime.ConnectToNextAvailableQuickmatchRoom("lobby", capacity: 10);

// Direct join via room code (for invitations)
_realtime.ConnectDirectlyToQuickmatchRoom("lobby", roomCode);

// Get shareable room code after connection
string code = _realtime.room.quickmatchRoomCode;
```

### Post-Connection Properties

| Property                  | Description               |
| ------------------------- | ------------------------- |
| `quickmatchRoomGroupName` | Room's group              |
| `quickmatchRoomCode`      | Shareable invitation code |
| `quickmatchRoomCapacity`  | Max player limit          |

### Error Events

- `QuickmatchRoomFull` — Room at capacity
- `QuickmatchRoomNotFound` — Direct join code invalid
- `QuickmatchRoomGroupNameEmpty/InvalidLength/FormatInvalid`
- `QuickmatchRoomCodeEmpty/InvalidLength/FormatInvalid`
- `QuickmatchCapacityInvalid` — Outside 1-500 range

---

## Room Server Options

### Configurations (Normcore Public)

| Key               | CPU   | Memory | Multiplier |
| ----------------- | ----- | ------ | ---------- |
| `default` (small) | 1.0x  | 250MB  | 1x         |
| `medium`          | 5.0x  | 500MB  | 5x         |
| `large`           | 10.0x | 1GB    | 10x        |
| `xlarge`          | 20.0x | 2GB    | 20x        |
| `2xlarge`         | 40.0x | 4GB    | 40x        |

### Player Capacity by Type

| Type                   | Small | Medium | Large | XL    | 2XL   |
| ---------------------- | ----- | ------ | ----- | ----- | ----- |
| Console                | 40    | 100    | 200   | 280   | 400   |
| VR                     | 12    | 30     | 60    | 84    | 120   |
| VR + Voice             | 8     | 20     | 40    | 56    | 80    |
| Spectators (read-only) | 100   | 500    | 1,000 | 2,000 | 4,000 |

### Usage

```csharp
_realtime.Connect("room-name", new Room.ConnectOptions {
    roomServerOptions = new Room.RoomServerOptions {
        configuration = "medium"
    }
});
```

### Rules

- **First player** to connect determines server configuration for the session
- Configuration **cannot change** while room is active
- Server shuts down after **30 seconds idle** — new settings apply on reconnect
- Scaling is **O(n²)** — doubling players needs ~4x capacity

---

## Disconnect Events

### Handling

```csharp
_realtime.didDisconnectFromRoomWithEvent += DidDisconnect;

void DidDisconnect(Realtime realtime, DisconnectEvent disconnectEvent)
{
    // Pattern match on type
    if (disconnectEvent is DeviceIdleTimeout)
    {
        // Auto-reconnect
        _realtime.Connect(disconnectEvent.roomName, disconnectEvent.connectOptions);
    }
    else
    {
        // Show message to user
        ShowError(disconnectEvent.message);
    }
}
```

### DisconnectEvent Properties

| Property         | Description                    |
| ---------------- | ------------------------------ |
| `roomName`       | Room to reconnect to           |
| `connectOptions` | Original ConnectOptions struct |
| `message`        | Human-readable display message |

### Event Types

**Connection validation:** `NativePluginVersionMismatch`, `ClientServerVersionMismatch`, `RoomNameEmpty`, `RoomNameInvalidLength`, `AppKeyEmpty`

**Connection failures:** `FailedToConnectToServer`, `InitialDatastoreDeserializationFailed`, `ConnectionFailedWithNetworkError`

**Active connection:** `DisconnectCalledByLocalClient`, `DeviceIdleTimeout` (60s), `DatastoreDeserializationFailed`

**Auth/entitlement:** `AppDisabled`, `AppPaused`, `AppInvalidEntitlement`, `AppNotFound`

**Config:** `RoomServerOptionsInvalid` (includes `validationErrors`)

**Rate limiting:** `RateLimit`, `WebhookRejectedRequest`

**Server errors:** `InternalServerError`, `BadRequest`

---

## AutoReconnect

Automatically reconnects after network disruptions.

### Setup

Add `AutoReconnect` component next to `Realtime`. Optionally add the Reconnect UI prefab (UPM Sample).

### Reconnects For

- Network failures (wifi switching, signal loss, internet outages)
- Device sleep/wake

### Does NOT Reconnect For

- Explicit `Realtime.Disconnect()` calls
- Room kicks
- Auth/permission failures
- Invalid requests

### Retry Strategy

1. First attempt: immediate
2. Subsequent: exponential backoff with jitter
3. Maximum: **5 attempts** before stopping

### Events

| Event                     | When                               |
| ------------------------- | ---------------------------------- |
| `willConnect`             | Before reconnection attempt        |
| `willConnectAsync`        | Async hook for pre-reconnect logic |
| `didConnect`              | After successful reconnection      |
| `didDisconnect`           | After disconnection                |
| `didCancel`               | User cancelled reconnect           |
| `reconnectTimerDidUpdate` | Countdown in seconds               |

### Dynamic Room Sharding

Use `willConnectAsync` to fetch available shards before reconnecting:

```csharp
autoReconnect.willConnectAsync += async () => {
    var shardName = await FetchAvailableShard();
    autoReconnect.roomName = shardName;
};
```

---

## Offline Mode

Run Normcore without a server for singleplayer, tutorials, or disconnected experiences. Scripts work identically.

### Setup

```csharp
_realtime.Connect("room-name", new Room.ConnectOptions {
    offlineMode = true
});
```

Disable "Join Room on Start" on Realtime when calling `Connect()` manually.

### Detection

```csharp
if (_realtime.room.offlineMode) { /* offline */ }
```

### Behavioural Differences

| Aspect                | Offline                                      |
| --------------------- | -------------------------------------------- |
| Client ID             | Always `0`                                   |
| Room time             | Device system time (Unix epoch seconds)      |
| Multiple instances    | Separate, non-shared state each              |
| Datastore persistence | Cleared on `Disconnect()`                    |
| Serialisation events  | Skipped (`OnWillWrite` callbacks don't fire) |

### Limitations

- Two local clients cannot share an offline room
- No automatic persistence — build custom save/load if needed
- Serialisation-dependent scripts may behave differently

---

## Testing Multiplayer Locally

### Options

1. **Editor + Build** — Run one instance in editor, one as standalone build
2. **Multiple Builds** — Export multiple standalone builds
3. **ParrelSync** — Clone project for simultaneous editor instances
4. **Multiple Browser Tabs** — For WebGL builds, open multiple tabs (quickest for this project)

### WebGL Local Testing

```bash
# Serve the WebGL build locally
npx serve Build/  # or use Unity's Simple Web Server

# Open multiple tabs pointing to localhost
# Each tab = separate client connecting to the same room
```

---

## Connection Statistics

Available after connection via `Room`:

| Property         | Description             |
| ---------------- | ----------------------- |
| `room.ping`      | Round-trip latency (ms) |
| `room.time`      | Room server time        |
| `room.clientID`  | This client's ID        |
| `room.connected` | Connection state        |
| `room.region`    | Connected region        |
