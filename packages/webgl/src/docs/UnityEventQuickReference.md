# Unity Event Quick Reference

This document outlines the events that Unity should implement to achieve full integration with the React frontend.

## Events from React to Unity

Events sent from React to Unity via `ReactIncomingEvent.HandleEvent` or similar mechanism:

| Event Name | Description | Data Structure |
|------------|-------------|----------------|
| `PlacePrefab` | Place a prefab in the Unity scene | `{ prefabName: string, position: {x,y,z}, rotation: {x,y,z}, scale: {x,y,z}, objectId: string }` |
| `PlacePortalPrefab` | Place a portal prefab in the Unity scene | `{ portalId: string, prefabName: string, position: {x,y,z}, rotation: {x,y,z}, scale: {x,y,z} }` |
| `UpdateObjectTransform` | Update an object's transform | `{ objectId: string, position?: {x,y,z}, rotation?: {x,y,z}, scale?: {x,y,z} }` |
| `DeleteObject` | Delete an object | `{ objectId: string }` |
| `SetHLSStream` | Set an HLS stream URL | `{ identifier: string, playerIndex: string, streamUrl: string }` |
| `FirebaseUserFromReact` | Send user data to Unity | User object with properties like uid, displayName, etc. |

## Events from Unity to React

Events that Unity should dispatch to React:

| Event Name | Description | Data Structure |
|------------|-------------|----------------|
| `ObjectSelected` | Sent when an object is selected | `{ objectId: string, prefabName: string, position: {x,y,z}, rotation: {x,y,z}, scale: {x,y,z} }` |
| `ObjectDeselected` | Sent when an object is deselected | None |
| `ObjectTransformChanged` | Sent when an object's transform changes from Unity | `{ objectId: string, position: {x,y,z}, rotation: {x,y,z}, scale: {x,y,z} }` |
| `HelloFromUnity` | Test event to verify communication | Any test data |
| `RequestUserForUnity` | Request user data from React | None |
| `MediaScreenClick` | User clicked on a media screen | `{ mediaScreenId: string }` |
| `PlayerInstantiated` | Player has been instantiated in the scene | None |

## Implementation Details for Object Transformation

For the object selection and transformation features, Unity should:

1. When a user clicks on an object in edit mode, dispatch an `ObjectSelected` event with the object's data.
2. When the user deselects an object, dispatch an `ObjectDeselected` event.
3. Handle incoming `UpdateObjectTransform` events to update object transforms.
4. Handle incoming `DeleteObject` events to remove objects from the scene.

Example script to handle selection:

```csharp
using UnityEngine;
using System.Collections;
using System;

public class SelectableObject : MonoBehaviour
{
    public string objectId;
    public string prefabName;

    private void OnMouseDown()
    {
        if (EditModeManager.IsEditModeActive)
        {
            // Create event data
            var data = new
            {
                objectId = this.objectId,
                prefabName = this.prefabName,
                position = new { x = transform.position.x, y = transform.position.y, z = transform.position.z },
                rotation = new { x = transform.eulerAngles.x, y = transform.eulerAngles.y, z = transform.eulerAngles.z },
                scale = new { x = transform.localScale.x, y = transform.localScale.y, z = transform.localScale.z }
            };

            // Dispatch to React
            ReactBridge.DispatchEventToReact("ObjectSelected", JsonUtility.ToJson(data));
        }
    }
}
``` 