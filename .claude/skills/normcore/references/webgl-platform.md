# WebGL Platform Reference

Normcore supports Unity WebGL builds with no source code modifications. WebGL applications receive equivalent network performance to native builds.

## Requirements

### Development

- Latest Unity LTS version
- Normcore unitypackage imported
- Valid `NormcoreAppSettings` with app key and matcher URL
- Matcher URL must reference a cluster supporting WebGL preview audio channels

### Production Deployment

| Requirement     | Detail                                            |
| --------------- | ------------------------------------------------- |
| HTTPS           | Valid certificate required                        |
| Content headers | Server must support WASM and gzip                 |
| Local dev       | Simple Web Server or equivalent (HTTP ok locally) |

### Browser Requirements

Browsers enforce strict **WebRTC** and **microphone access** policies. Chrome and Firefox are particularly strict — ensure HTTPS for production.

## Known Limitations

| Limitation                    | Detail                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Voice chat spatialisation** | Does NOT work on web. Unity's audio engine (FMOD) lacks web support. Voice audio routes directly through the browser, bypassing Unity's audio pipeline. |
| **Mobile WebGL controls**     | Sample app controls non-functional on mobile. Multiplayer connectivity works, but input needs custom mobile handling.                                   |
| **Region pinging**            | Not available in WebGL. Use GeoIP distance fallback from `GetRegionsListAsync()` response (includes lat/long coordinates).                              |

## Cross-Platform Compatibility

WebGL clients connect to the **same rooms** as native clients. A browser player and a desktop build player can be in the same room simultaneously with full synchronisation.

## Build Process

Standard Unity WebGL build pipeline — no Normcore-specific build steps or modifications needed beyond the initial package import.

## Region Handling for WebGL

Since WebGL can't ping servers directly, use the GeoIP approach:

```csharp
var response = await _realtime.GetRegionsListAsync();
// response includes client lat/long from GeoIP
// response.regions sorted by estimated distance (not ping)

// Connect with preferred regions
_realtime.Connect("room-name", new Room.ConnectOptions {
    preferredRegions = new[] { response.regions[0].identifier }
});
```

## React Integration (This Project)

This monorepo uses Unity WebGL embedded in React. Key integration points:

### packages/webgl

The `packages/webgl` package handles Unity WebGL loader and messaging bridge between React and Unity.

### useUnityMessaging Hook

Use the `useUnityMessaging` hook for React ↔ Unity communication. Normcore runs entirely within the Unity WebGL build — React doesn't need to know about Normcore directly.

### Communication Flow

```
React App
  └── packages/webgl (loader + messaging)
        └── Unity WebGL Build
              └── Normcore (connects to rooms, syncs state)
                    └── Room Server (cloud)
```

React sends messages to Unity via the messaging bridge. Unity handles all Normcore networking internally. React receives state updates via Unity → React messages.

### Deployment Notes

- Firebase Hosting serves the React app + Unity WebGL build
- Ensure hosting config serves `.wasm` files with correct MIME type
- Enable gzip/brotli compression for `.wasm` and `.data` files
- Unity WebGL builds can be large — consider code stripping and compression

## Performance Tips for WebGL

| Tip                                | Why                                                  |
| ---------------------------------- | ---------------------------------------------------- |
| Use unreliable sync for transforms | Reduces bandwidth, ok to drop frames                 |
| Minimise RealtimeModel field count | Each field adds serialisation overhead               |
| Use prefab pooling                 | WebGL GC is expensive — avoid frequent alloc/dealloc |
| Limit voice chat participants      | Browser audio processing is costly                   |
| Test with multiple browser tabs    | Quick local multiplayer testing                      |
| Use `Room.RoomServerOptions`       | Right-size your server for expected player count     |
