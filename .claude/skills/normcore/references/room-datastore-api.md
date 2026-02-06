# Room + Datastore API Reference

The foundation layer. Platform-independent — deals with data only, unaware of Unity objects. The Realtime API wraps this.

## Room

Manages server connection, datastore, audio streams, and RPC messaging.

### Key Methods

| Method                                     | Description                                                                                   |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `Connect(roomName, appKey, ...)`           | Connect to a room server                                                                      |
| `Disconnect()`                             | Leave the room                                                                                |
| `Tick()`                                   | **Must be called every frame** — handles timeouts, sends datastore updates, dispatches events |
| `CreateAudioInputStream()`                 | Create a voice/audio broadcast stream                                                         |
| `GetAudioOutputStream(clientID, streamID)` | Get another client's audio stream                                                             |

### Key Properties

| Property                  | Type              | Description                                           |
| ------------------------- | ----------------- | ----------------------------------------------------- |
| `datastore`               | `Datastore`       | Synchronised data access (available after connection) |
| `roomModel`               | `RealtimeModel`   | Optional custom root model                            |
| `clientID`                | `int`             | This client's server-assigned ID                      |
| `time`                    | `double`          | Room server time                                      |
| `ping`                    | `float`           | Round-trip latency in ms                              |
| `connected`               | `bool`            | Connection state                                      |
| `offlineMode`             | `bool`            | Whether this is an offline room                       |
| `region`                  | `string`          | Connected region identifier                           |
| `quickmatchRoomCode`      | `string`          | Shareable quickmatch code                             |
| `quickmatchRoomGroupName` | `string`          | Room's quickmatch group                               |
| `quickmatchRoomCapacity`  | `int`             | Max players for quickmatch                            |
| `disconnectEvent`         | `DisconnectEvent` | Most recent disconnect reason                         |

### Connection Model

All clients using the **same room name + same app key** join the same server. Room names are namespaced per app key.

---

## Datastore

Stores all RealtimeModels and keeps them in sync with the server.

### Synchronisation Flow

1. Local change → delta update sent to server + all clients
2. Late-joining clients receive **complete datastore snapshot**
3. Subsequent changes arrive as delta updates only (bandwidth efficient)

---

## RealtimeModel

Data container synchronised across all clients. Compiled by Normcore from annotated partial classes.

### Class Requirements

```csharp
[RealtimeModel]
public partial class MyModel {
    // Must be: partial, no inheritance, [RealtimeModel] attribute
}
```

### [RealtimeProperty] Attribute

```csharp
[RealtimeProperty(propertyID, reliable)]
[RealtimeProperty(propertyID, reliable, changeEvent)]
```

| Parameter     | Type   | Description                                                                       |
| ------------- | ------ | --------------------------------------------------------------------------------- |
| `propertyID`  | `int`  | Unique within this model. Start at 1. Never reuse — comment out deprecated IDs.   |
| `reliable`    | `bool` | `true` = guaranteed delivery, ordered. `false` = dropped if newer update follows. |
| `changeEvent` | `bool` | Generate `{property}DidChange` C# event                                           |

**Reliability guidance:**

- **Reliable** (`true`): State changes set once (health, score, colour, name)
- **Unreliable** (`false`): Frequent updates (transforms, animations, velocities)

Default sync rate: **20 Hz**

### [Interpolate] Attribute

```csharp
[RealtimeModel]
public partial class MyModel {
    [RealtimeProperty(1, false)]
    [Interpolate]
    private Vector3 _position;  // Creates additional "Interpolated" property
}
```

Enables timeline-based interpolation for smooth animation. Requires client ownership. Adds small delay to gather interpolation data.

### Meta-Model for Ownership

```csharp
[RealtimeModel(createMetaModel: true)]
public partial class MyModel {
    [RealtimeProperty(1, true)] private float _value;
}
```

Required when your custom RealtimeComponent needs ownership support.

### Full Example

```csharp
[RealtimeModel]
public partial class PlayerDataModel {
    [RealtimeProperty(1, true, true)]  private string  _name;
    [RealtimeProperty(2, true, true)]  private Color   _avatarColor;
    [RealtimeProperty(3, false)]       private Vector3 _velocity;
    [RealtimeProperty(4, true, true)]  private int     _score;
    // [RealtimeProperty(5, true)]     private int     _deprecated_health;  ← never reuse ID 5
    [RealtimeProperty(6, true, true)]  private int     _health;
}
```

### Supported Primitives

**C# types:** `bool`, `byte`, `sbyte`, `short`, `ushort`, `int`, `uint`, `long`, `ulong`, `float`, `double`, `string`, `byte[]`

**Unity types:** `Color`, `Vector2`, `Vector3`, `Vector4`, `Quaternion`

**Collections:** `RealtimeArray`, `RealtimeSet`, `RealtimeDictionary`, `StringKeyDictionary`

**Nested models:** One RealtimeModel can contain another as a property.

**byte[] note:** Disable equality check with `includeEqualityCheck: false` — default check only compares reference, not contents.

---

## Collections

### RealtimeSet (Unordered)

- Unordered collection of RealtimeModels
- Simultaneous add/remove across clients without conflict
- Powers Normcore's prefab instantiation (RealtimeViewModels)
- **Best for:** Dynamic object spawning, inventory items

### RealtimeDictionary (uint → Model)

- `Dictionary<uint, ModelType>` equivalent
- Dynamically add/remove entries at runtime
- **Best for:** Player scores (clientID as key), variable-count data

### RealtimeArray (Append-Only)

- `List<ModelType>` with append-only semantics
- **Removing items by index is not supported** (would cause merge conflicts)
- **Best for:** Sequential data like brush strokes, event logs

### StringKeyDictionary (Transactional)

- `Dictionary<string, ModelType>` equivalent
- **Transactional**: changes not reflected until server confirms
- Concurrent modifications to the same key cause rejection
- Uses internal versioning per key
- **Best for:** Named resources, config values, shared state requiring conflict detection

### When to Use Which

| Need                            | Collection                                                        |
| ------------------------------- | ----------------------------------------------------------------- |
| Unordered, no conflicts         | RealtimeSet                                                       |
| Key-value with uint keys        | RealtimeDictionary                                                |
| Append-only ordered data        | RealtimeArray                                                     |
| String keys, conflict detection | StringKeyDictionary                                               |
| Need removal by index           | RealtimeDictionary with index-as-key, or RealtimeSet with sorting |

---

## Ownership

### Core Model

- Every model has `ownerID` (default: `-1`, unowned)
- Unowned models: any client can modify
- Owned models: only owning client can modify
- **Cascades**: parent ownership enforced on all children

### Methods

```csharp
// On RealtimeView or RealtimeModel
view.RequestOwnership();    // Immediate local effect, server-validated
view.ClearOwnership();      // Release

// On instantiation
Realtime.Instantiate("Prefab", ownedByClient: true);
```

### Flags

| Flag                       | Effect                                                      |
| -------------------------- | ----------------------------------------------------------- |
| `preventOwnershipTakeover` | Server denies `RequestOwnership()` unless currently unowned |

### Component-Level Ownership

Individual RealtimeComponents or RealtimeModels can be owned separately from their parent RealtimeView — enables granular access control (e.g., anyone can read position, only owner can write health).

---

## Lifetime Flags

### destroyWhenOwnerOrLastClientLeaves

| Value            | Behaviour                                                  |
| ---------------- | ---------------------------------------------------------- |
| `true` (default) | Model deleted when owner disconnects or last client leaves |
| `false`          | Model persists between sessions                            |

```csharp
// Persistent object
Realtime.Instantiate("SharedBoard", destroyWhenOwnerOrLastClientLeaves: false);

// Player (cleaned up on disconnect)
Realtime.Instantiate("Player",
    ownedByClient: true,
    preventOwnershipTakeover: true,
    destroyWhenOwnerOrLastClientLeaves: true);
```

Server **always** honours lifetime flags regardless of how the client disconnects.
