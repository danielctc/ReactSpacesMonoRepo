# Synchronising Custom Data

Full guide for creating custom RealtimeModels and RealtimeComponents to sync arbitrary data across clients.

## Overview

Realtime components synchronise state between the Unity scene and a model in the Normcore datastore. The flow:

```
Local script → model property → network → all clients' models → scene update
```

## Step 1: Create the Model

```csharp
using Normal.Realtime;
using UnityEngine;

[RealtimeModel]
public partial class ColorSyncModel {
    [RealtimeProperty(1, true, true)]   // ID=1, reliable, change event
    private Color _color;

    [RealtimeProperty(2, true, true)]   // ID=2, reliable, change event
    private string _label;

    [RealtimeProperty(3, false)]        // ID=3, unreliable, no event
    private Vector3 _velocity;
}
```

### Model Rules

1. Class must be `partial`
2. Class **cannot** inherit from another class
3. Must have `[RealtimeModel]` attribute
4. Fields must be private with underscore prefix
5. Fields must be [supported primitive types](room-datastore-api.md#supported-primitives)
6. Property IDs must be unique within the model — **never reuse** deprecated IDs

### Property ID Management

```csharp
[RealtimeModel]
public partial class MyModel {
    [RealtimeProperty(1, true)] private int _score;
    // [RealtimeProperty(2, true)] private int _oldHealth;  ← DEPRECATED, never reuse ID 2
    [RealtimeProperty(3, true)] private int _health;        // Use new ID when changing type
}
```

### Reliability Decision

| Scenario                     | Reliable?                                 |
| ---------------------------- | ----------------------------------------- |
| Health, score, name, colour  | `true` — set infrequently, must arrive    |
| Position, velocity, rotation | `false` — updated every frame, ok to drop |
| Animation parameters         | `false` — continuous updates              |
| Game state changes           | `true` — must be consistent               |

## Step 2: Create the Component

```csharp
using Normal.Realtime;
using UnityEngine;

public class ColorSync : RealtimeComponent<ColorSyncModel>
{
    [SerializeField] private MeshRenderer _renderer;

    // Called when model is created or replaced
    protected override void OnRealtimeModelReplaced(
        ColorSyncModel previousModel,
        ColorSyncModel currentModel)
    {
        // 1. Unsubscribe from previous model events
        if (previousModel != null)
        {
            previousModel.colorDidChange -= ColorDidChange;
            previousModel.labelDidChange -= LabelDidChange;
        }

        // 2. Subscribe to new model events
        if (currentModel != null)
        {
            currentModel.colorDidChange += ColorDidChange;
            currentModel.labelDidChange += LabelDidChange;

            // 3. Set defaults on fresh models
            if (currentModel.isFreshModel)
            {
                currentModel.color = Color.white;
                currentModel.label = "New Object";
            }

            // 4. Apply current state to scene
            UpdateColor(currentModel.color);
            UpdateLabel(currentModel.label);
        }
    }

    // Event handlers — called for both local and remote changes
    private void ColorDidChange(ColorSyncModel model, Color color)
    {
        UpdateColor(color);
    }

    private void LabelDidChange(ColorSyncModel model, string label)
    {
        UpdateLabel(label);
    }

    // Scene update methods
    private void UpdateColor(Color color)
    {
        _renderer.material.color = color;
    }

    private void UpdateLabel(string label)
    {
        // Update UI text, etc.
    }

    // Public API for other scripts
    public void SetColor(Color color) => model.color = color;
    public void SetLabel(string label) => model.label = label;
}
```

## Step 3: Wire Up in Unity

1. Add `RealtimeView` to the GameObject (or parent)
2. Add your `ColorSync` component to the same GameObject
3. Assign serialised field references in the inspector
4. If runtime-spawned: place prefab in `Assets/Resources/`

## Lifecycle Details

### Scene Objects

| Step | What Happens                                                                           |
| ---- | -------------------------------------------------------------------------------------- |
| 1    | `Awake()` + `Start()` run; RealtimeView registers                                      |
| 2    | Empty model created → `OnRealtimeModelReplaced(null, emptyModel)`                      |
| 3    | Server connects → populated model → `OnRealtimeModelReplaced(emptyModel, serverModel)` |
| 4    | `Realtime.connected` = true, `didConnectToRoom` fires                                  |

### Prefab Objects

| Step | What Happens                                                     |
| ---- | ---------------------------------------------------------------- |
| 1    | `Realtime.Instantiate()` called                                  |
| 2    | Prefab instantiated on all clients                               |
| 3    | `Awake()` runs                                                   |
| 4    | Model created/populated → `OnRealtimeModelReplaced(null, model)` |
| 5    | `Start()` runs                                                   |

### Key Difference

Scene objects get `OnRealtimeModelReplaced` called **twice** (empty then populated). Prefab objects get it called **once** (already populated).

## Default Values

Always set defaults inside `OnRealtimeModelReplaced` using `isFreshModel`:

```csharp
if (currentModel.isFreshModel)
{
    currentModel.health = 100;
    currentModel.color  = Color.blue;
}
```

This ensures only the creating client sets initial values — other clients receive the synced values.

## EasySync (Zero-Code Alternative)

For quick prototyping, add `EasySync` component to any GameObject. It auto-syncs public fields without any code.

### Supported Types

**Primitives:** bool, byte, sbyte, ushort, short, uint, int, ulong, long, float, double

**Unity:** Vector2, Vector3, Vector4, Quaternion, Color

### Configuration

| Setting       | When                                     |
| ------------- | ---------------------------------------- |
| Unreliable    | Frequently changing (position, rotation) |
| Reliable      | State changes (on/off, colour set once)  |
| Interpolation | Smooth visual updates (adds small delay) |

### Converting to Code

Right-click EasySync → **"Convert to RealtimeComponent"** — generates matching RealtimeComponent + RealtimeModel scripts.

## Common Mistakes

| Problem                               | Cause                                  | Fix                                             |
| ------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| `OnRealtimeModelReplaced` never fires | Component added after RealtimeView     | Remove and re-add component                     |
| Model properties don't sync           | Missing `[RealtimeProperty]` attribute | Add attribute with unique ID                    |
| Changes don't appear on other clients | Model not owned / ownership blocking   | Check ownership or use `RequestOwnership()`     |
| Events fire but scene doesn't update  | Not updating scene in event handler    | Apply model values to renderer/UI in handler    |
| Stale data on rejoin                  | Model destroyed on disconnect          | Set `destroyWhenOwnerOrLastClientLeaves: false` |
