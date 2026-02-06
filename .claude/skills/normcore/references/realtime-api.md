# Realtime API Reference

The Realtime API bridges the Unity scene to Normcore's datastore. Most development happens at this layer.

## Realtime

The `Realtime` component manages a connection to a single room and all `RealtimeView` instances in the scene.

### Editor Properties

| Property               | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| **App Settings**       | Reference to `NormcoreAppSettings` asset (app key, matcher URL) |
| **App Key**            | Unique app identifier from dashboard.normcore.io                |
| **Join Room On Start** | Auto-connect during `Start()` — by name, quickmatch, or offline |

### Connection

```csharp
// Manual connection
_realtime.Connect("room-name");

// With options
_realtime.Connect("room-name", new Room.ConnectOptions {
    roomServerOptions = new Room.RoomServerOptions { configuration = "medium" },
    preferredRegions = new[] { "europe-west" },
    offlineMode = false
});

// Disconnect
_realtime.Disconnect();
```

Room names are **namespaced to your App Key** — same name + different key = different room.

### Key Properties

| Property       | Type     | Description                                  |
| -------------- | -------- | -------------------------------------------- |
| `connected`    | `bool`   | True when connected to a room                |
| `connecting`   | `bool`   | True during connection attempt               |
| `disconnected` | `bool`   | True when not connected                      |
| `room`         | `Room`   | The underlying Room instance                 |
| `clientID`     | `int`    | This client's ID assigned by the room server |
| `roomName`     | `string` | Current room name                            |

### Events

| Event                            | Signature                           | When                            |
| -------------------------------- | ----------------------------------- | ------------------------------- |
| `didConnectToRoom`               | `Action<Realtime>`                  | After successful connection     |
| `didDisconnectFromRoom`          | `Action<Realtime>`                  | After disconnection             |
| `didDisconnectFromRoomWithEvent` | `Action<Realtime, DisconnectEvent>` | Disconnect with reason (v2.16+) |

### Instantiate / Destroy

```csharp
// Instantiate a networked prefab (must be in Resources/)
var obj = Realtime.Instantiate("PrefabName", position, rotation,
    new Realtime.InstantiateOptions {
        ownedByClient                    = true,
        preventOwnershipTakeover         = true,
        destroyWhenOwnerOrLastClientLeaves = true,
        useInstance                      = _realtime
    });

// Destroy a networked object
Realtime.Destroy(gameObject);
```

### Multi-Room Support

Multiple `Realtime` instances can connect to different rooms simultaneously. Assign specific instances to RealtimeViews via the inspector or `useInstance` option.

---

## RealtimeView

Identifies GameObjects and their RealtimeComponents across clients. Creates models for each component and stores them in the datastore.

### Editor Properties

| Property              | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| **Scene View UUID**   | Unique ID for scene-placed views (not prefabs). Ensures same model across clients. |
| **Components**        | Lists attached RealtimeComponents with assigned component IDs                      |
| **Children**          | Child RealtimeViews whose data integrates into parent's datastore entry            |
| **Realtime Instance** | Which Realtime to sync with. Auto-populated for single-instance scenes.            |

### Ownership + Lifetime Flags (Scene Views)

| Flag                           | Description                                                             |
| ------------------------------ | ----------------------------------------------------------------------- |
| **Owned by Creating Client**   | Request ownership on creation                                           |
| **Prevent Ownership Takeover** | Block `RequestOwnership()` unless unowned                               |
| **Destroy Last Client Leaves** | Clear view/models when last client disconnects. Unchecked = persistent. |

For **prefab** views, set these via `Realtime.InstantiateOptions`.

### Key Properties

| Property                    | Type       | Description                           |
| --------------------------- | ---------- | ------------------------------------- |
| `isOwnedLocally`            | `bool`     | This client owns the view             |
| `isOwnedLocallyInHierarchy` | `bool`     | This client owns the view or a parent |
| `isOwnedRemotely`           | `bool`     | Another client owns the view          |
| `ownerID`                   | `int`      | Owning client's ID (-1 = unowned)     |
| `isUnownedInHierarchy`      | `bool`     | No client owns this or parents        |
| `realtime`                  | `Realtime` | The associated Realtime instance      |

### Ownership Methods

```csharp
_realtimeView.RequestOwnership();  // Claim ownership (immediate local, server-validated)
_realtimeView.ClearOwnership();    // Release ownership
```

### Delegates

| Delegate                            | Purpose                                                   |
| ----------------------------------- | --------------------------------------------------------- |
| `sceneViewWillRegisterWithRealtime` | Configure Realtime instance during additive scene loading |

### Reset View UUID

Use when duplicating scenes to prevent communication with stale UUIDs. Resets also block retrieval of associated persistent data.

---

## RealtimeComponent\<TModel\>

The primary way to synchronise custom data. Maintains sync between scene GameObjects and RealtimeModel instances.

### Lifecycle: Scene Objects

1. `Awake()` + `Start()` — RealtimeView registers with Realtime
2. Empty model created → `OnRealtimeModelReplaced()` fires
3. Server connects → new model created/populated → `OnRealtimeModelReplaced()` fires again
4. `Realtime.connected` becomes true, `didConnectToRoom` fires

### Lifecycle: Prefab Objects

1. `Realtime.Instantiate()` called
2. Prefab instantiated on all clients
3. `Awake()` executes
4. Model created/populated → `OnRealtimeModelReplaced()` fires
5. `Start()` executes

### Core Override

```csharp
public class MySync : RealtimeComponent<MyModel>
{
    protected override void OnRealtimeModelReplaced(MyModel previousModel, MyModel currentModel)
    {
        // Unsubscribe from previous
        if (previousModel != null)
            previousModel.somePropertyDidChange -= OnSomePropertyChanged;

        // Subscribe to current
        if (currentModel != null)
        {
            currentModel.somePropertyDidChange += OnSomePropertyChanged;

            // Set defaults on fresh models
            if (currentModel.isFreshModel)
                currentModel.someProperty = defaultValue;
        }
    }

    void OnSomePropertyChanged(MyModel model, int value) { /* update scene */ }
}
```

### Sync Pattern

```csharp
// Write to model → auto-syncs to all clients
public void SetColor(Color color) { model.color = color; }

// Read from model → always current
void Update() { _renderer.material.color = model.color; }
```

### Restrictions

- Cannot be added at runtime (all RealtimeComponents must exist on the prefab/scene object)
- Cannot dynamically add/remove Rigidbody components
- Cannot reparent objects with RealtimeComponents

---

## RealtimeTransform

Built-in RealtimeComponent for position/rotation/scale synchronisation.

### Modes

| Mode                         | Syncs                                         | Coordinate Space |
| ---------------------------- | --------------------------------------------- | ---------------- |
| **Transform** (no Rigidbody) | localPosition, localRotation, localScale      | Local            |
| **Rigidbody**                | position, rotation, velocity, angularVelocity | World            |
| **Rigidbody2D**              | Same as Rigidbody, 2D variant                 | World            |

### Editor Options

| Option                            | Description                                                |
| --------------------------------- | ---------------------------------------------------------- |
| Sync Position                     | Toggle position sync                                       |
| Sync Rotation                     | Toggle rotation sync                                       |
| Sync Scale                        | Toggle scale sync                                          |
| Smoothing                         | Enable interpolation for remote transforms                 |
| Maintain Ownership While Sleeping | Keep ownership when rigidbody sleeps (default: auto-clear) |

### Ownership Behaviour

- Automatically requests ownership on **collision** (if unowned)
- Automatically clears ownership when rigidbody **sleeps**
- Kinematic rigidbodies maintain ownership while sleeping
- Only the **owner** can move the object

### Methods

| Method                     | Description                              |
| -------------------------- | ---------------------------------------- |
| `SnapTo(Vector3 position)` | Instant reposition without interpolation |
| `RequestOwnership()`       | Claim movement authority                 |

### Rigidbody Parenting Restriction

Rigidbodies **cannot** have moving parents (PhysX simulates in world space). Non-rigidbody colliders as children are fine. For pick-up mechanics, sync position to a target rather than reparenting.

---

## RealtimeAnimator

Synchronises Unity Animator parameters across clients. Add alongside a RealtimeView. Syncs all parameters automatically — no additional configuration needed.

---

## RealtimeRef

Provides a serialisable reference to another RealtimeView that resolves across clients. Useful for linking networked objects together.
