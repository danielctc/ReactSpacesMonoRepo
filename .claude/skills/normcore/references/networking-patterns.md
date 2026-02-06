# Networking Patterns

Common multiplayer patterns with Normcore implementation details.

## Player Controller

### Spawning

```csharp
using Normal.Realtime;

public class PlayerSpawner : MonoBehaviour
{
    [SerializeField] private string _playerPrefab = "Player";
    private Realtime _realtime;

    void Awake()
    {
        _realtime = GetComponent<Realtime>();
        _realtime.didConnectToRoom += DidConnectToRoom;
    }

    void DidConnectToRoom(Realtime realtime)
    {
        Realtime.Instantiate(_playerPrefab, Vector3.zero, Quaternion.identity,
            new Realtime.InstantiateOptions {
                ownedByClient                      = true,
                preventOwnershipTakeover           = true,
                destroyWhenOwnerOrLastClientLeaves = true,
                useInstance                        = realtime
            });
    }
}
```

### Ownership Guard

Only process input for the local player:

```csharp
public class PlayerController : MonoBehaviour
{
    private RealtimeView _realtimeView;

    void Start()
    {
        _realtimeView = GetComponent<RealtimeView>();
    }

    void Update()
    {
        // CRITICAL: skip input for remote players
        if (!_realtimeView.isOwnedLocallyInHierarchy) return;

        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        // Movement logic...
    }
}
```

### Camera Setup

Use `ParentConstraint` for camera following — allows dynamic source assignment after player instantiation:

- Position offset: (0, 1.5, -3)
- Rotation offset: (15, 0, 0)

### Prefab Structure

```
Player (prefab root)
├── RealtimeView
├── RealtimeTransform (position/velocity/rigidbody)
├── PlayerSpawner or PlayerController
└── Character (child)
    ├── RealtimeTransform (rotation/animation)
    └── Mesh/Animator
```

---

## Networked Physics

### The Problem

Unity's PhysX is **non-deterministic** — identical starting conditions produce different positions across devices. Continuous synchronisation required.

### Ownership Model

- One client's physics simulation is **authoritative** (the owner)
- Owner syncs state to datastore → non-owners treat datastore as ground truth
- **To move a physics object, you must own it**

### Automatic Behaviour

RealtimeTransform with Rigidbody:

- Auto-requests ownership on **collision** (if unowned)
- Auto-clears ownership when rigidbody **sleeps**
- Kinematic rigidbodies maintain ownership while sleeping

### Configuration

| Setting                           | Use When                       |
| --------------------------------- | ------------------------------ |
| Maintain Ownership While Sleeping | Player-held objects, platforms |
| Default (auto-clear)              | Throwable objects, loose props |

### Rigidbody Parenting Restriction

**Rigidbodies cannot have moving parents.** PhysX simulates in world space — synchronisation order uncertainty causes drift. Solutions:

- Keep rigidbodies at scene root
- For pick-up: sync position to target transform, don't reparent
- Non-rigidbody colliders as children are fine

### Kinematic vs Dynamic

| Type      | Use For                                          |
| --------- | ------------------------------------------------ |
| Kinematic | Player-controlled movement, platforms, elevators |
| Dynamic   | Throwables, loose objects, physics puzzles       |

---

## RPC Events (Model-Based)

Normcore discourages traditional RPCs. Instead, use a model-based event pattern:

### Model

```csharp
[RealtimeModel]
public partial class ExplosionEventModel {
    [RealtimeProperty(1, true)] private int     _trigger;
    [RealtimeProperty(2, true)] private int     _senderID;
    [RealtimeProperty(3, true)] private Vector3 _position;
    [RealtimeProperty(4, true)] private float   _scale;
}
```

### Pattern

The model includes:

- A `_trigger` counter that increments each fire
- Event data properties (position, scale, senderID)
- `FireEvent()` method that increments trigger + sets data
- `eventDidFire` delegate invoked when server confirms the update

### Component

```csharp
public class ExplosionEvent : RealtimeComponent<ExplosionEventModel>
{
    public event Action<Vector3, float> onExplosion;

    protected override void OnRealtimeModelReplaced(
        ExplosionEventModel prev, ExplosionEventModel cur)
    {
        if (prev != null) prev.triggerDidChange -= OnTriggerChanged;
        if (cur  != null) cur.triggerDidChange  += OnTriggerChanged;
    }

    void OnTriggerChanged(ExplosionEventModel m, int trigger)
    {
        onExplosion?.Invoke(m.position, m.scale);
    }

    public void Emit(Vector3 pos, float scale)
    {
        model.position = pos;
        model.scale    = scale;
        model.trigger  = model.trigger + 1;  // Increment triggers sync
    }
}
```

### Warning

> "Any state modified in response to an event like this can easily diverge between clients." Prefer prefab instantiation or model state for most use cases.

---

## Prefab Pooling

Avoids instantiation overhead for frequently spawned objects.

### Setup

Add `RealtimePool` component to the same GameObject as `Realtime`.

### Behaviour

| Action                           | What Happens                                                   |
| -------------------------------- | -------------------------------------------------------------- |
| Instantiate (pool has instances) | Oldest disabled instance re-enabled                            |
| Instantiate (pool empty)         | New instance created                                           |
| Destroy                          | Root GameObject **disabled** (not destroyed), returned to pool |

### API

```csharp
// Preload instances
realtimePool.PreloadPrefab("PlayerPrefab", 10);
realtimePool.PreloadPrefab(playerPrefab, 10);

// Async preload (Unity 6+)
var op = realtimePool.PreloadPrefabAsync(prefab, 100);
op.completed += _ => Debug.Log("Preloaded");

// Clear pool
realtimePool.Clear(playerPrefab);  // Specific
realtimePool.Clear();               // All
```

### Lifecycle Callbacks

Implement `IRealtimePoolCallbacks`:

```csharp
public class PooledBullet : MonoBehaviour, IRealtimePoolCallbacks
{
    public void PrefabWillReuseFromPool()  { /* Reset state */ }
    public void PrefabWillReturnToPool()   { /* Clean up */ }
}
```

**Critical:** `OnDestroy()` is **never called** on pooled prefabs — they're disabled, not destroyed.

### Custom Pool Logic

Implement `IRealtimePrefabInstantiateDelegate` for full control over instantiation/destruction.

---

## Collectible (First-Touch-Wins)

```csharp
public class NetworkedCollectible : MonoBehaviour
{
    private RealtimeView _view;
    private bool _collected;

    void Start() => _view = GetComponent<RealtimeView>();

    void OnTriggerEnter(Collider other)
    {
        if (_collected || !other.CompareTag("Player")) return;

        _view.RequestOwnership();

        if (_view.isOwnedLocally)
        {
            _collected = true;
            // Award to collector
            Realtime.Destroy(gameObject);
        }
    }
}
```

Ownership request is atomic — only one client succeeds, preventing double-collection.

---

## Persistent Objects (Between Sessions)

```csharp
// Whiteboard that persists after all players leave
Realtime.Instantiate("SharedWhiteboard",
    ownedByClient: false,
    destroyWhenOwnerOrLastClientLeaves: false);
```

Data persists in the room's datastore. Next session connecting to the same room name gets the saved state.
