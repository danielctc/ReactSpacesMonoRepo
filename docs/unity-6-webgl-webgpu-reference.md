# Unity 6 WebGL & WebGPU Complete Reference Guide

> **Last Updated:** January 2026
> **Unity Version:** 6000.3 LTS (Unity 6.3)
> **Purpose:** Comprehensive reference for WebGL/WebGPU development with React integration

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [WebGL vs WebGPU Comparison](#webgl-vs-webgpu-comparison)
3. [WebGPU (Experimental)](#webgpu-experimental)
4. [Build Settings & Configuration](#build-settings--configuration)
5. [Player Settings Reference](#player-settings-reference)
6. [Memory Management](#memory-management)
7. [JavaScript Interop](#javascript-interop)
8. [React Unity WebGL Integration](#react-unity-webgl-integration)
9. [Graphics & Rendering](#graphics--rendering)
10. [Audio Handling](#audio-handling)
11. [Input System](#input-system)
12. [Networking](#networking)
13. [Caching & Asset Bundles](#caching--asset-bundles)
14. [Browser Compatibility](#browser-compatibility)
15. [Texture Compression](#texture-compression)
16. [Debugging & Profiling](#debugging--profiling)
17. [Deployment](#deployment)
18. [Common Issues & Solutions](#common-issues--solutions)
19. [Best Practices Checklist](#best-practices-checklist)

---

## Platform Overview

### Naming Convention
- **Unity 6+**: Platform is called "Web" (not "WebGL")
- Supports multiple graphics APIs: WebGL2 (default) and WebGPU (experimental)
- Build output creates WebAssembly (WASM) compiled via Emscripten

### Key Characteristics
- Single-threaded C# execution (WebAssembly limitation)
- No direct socket access (browser security)
- Runs in browser sandbox with memory constraints
- Requires user interaction for audio/fullscreen/cursor lock

### Technical Foundation
```
Source Code (C#) → IL2CPP → C++ → Emscripten → WebAssembly
Shaders (HLSL) → Translation → GLSL (WebGL2) or WGSL (WebGPU)
```

---

## WebGL vs WebGPU Comparison

| Feature | WebGL2 | WebGPU |
|---------|--------|--------|
| **Status** | Stable, Production-ready | Experimental |
| **Browser Support** | All modern browsers | Chrome, Edge, Firefox (limited) |
| **Compute Shaders** | ❌ Not supported | ✅ Supported |
| **Indirect Rendering** | ❌ Not supported | ✅ Supported |
| **GPU Skinning** | ❌ Not supported | ✅ Supported |
| **VFX Graph** | ❌ Not supported | ✅ Supported |
| **Mobile Support** | Better compatibility | Limited |
| **Default** | ✅ Yes | ❌ No (manual enable) |

### Recommendation
- **Production**: Use WebGL2 for broad compatibility
- **Future-proofing**: Enable both APIs with WebGPU as primary fallback to WebGL2

---

## WebGPU (Experimental)

### Enabling WebGPU

1. **Edit → Project Settings → Player → Web**
2. Expand **Other Settings**
3. Disable **Auto Graphics API**
4. Click **+** and add **WebGPU**
5. Drag WebGPU to top of list (priority)
6. Keep WebGL2 as fallback

### WebGPU Features
- Modern GPU frameworks (DirectX 12, Vulkan, Metal)
- Compute shaders for GPU parallelization
- Indirect rendering commands
- GPU-driven skinning
- VFX Graph support

### WebGPU Limitations

**Compute Shaders:**
- ✅ `RWStructuredBuffer` supported
- ❌ `RWBuffer` not supported
- ❌ Async compute not supported
- ❌ Wave Intrinsics not available

**Barrier Functions:**
- Must only call from non-uniform code blocks
- Uniform block calls = shader compilation failure

**GPU Readback:**
- ❌ Synchronous readback not supported:
  - `Texture2D.GetPixels()`
  - `ComputeBuffer.GetData()`
  - `ScreenCapture.CaptureScreenshot()`
- ✅ Use `AsyncGPUReadback` API instead

**Texture Formats:**
- ❌ RGBA8, RHalf not supported for read-write storage
- ✅ RFloat supported for storage textures
- Use `SystemInfo.GetCompatibleFormat()` to check

**Other:**
- ❌ Dynamic resolution scaling
- ❌ Cubemap arrays
- Maximum 16 terrain textures per shader

### Browser WebGPU Support
Check current support: [MDN WebGPU Browser Compatibility](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility)

---

## Build Settings & Configuration

### Development vs Release Builds

| Setting | Development | Release |
|---------|-------------|---------|
| Compression | ❌ None | ✅ Gzip/Brotli |
| Minification | ❌ No | ✅ Yes |
| Debug Symbols | ✅ Included | ❌ External/Off |
| Profiler | ✅ Available | ❌ Disabled |
| File Size | Large | Optimized |

### Compression Options

```csharp
// Set via script
PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
```

| Format | Extension | Notes |
|--------|-----------|-------|
| **Gzip** | `.gz` | All browsers, HTTP/HTTPS |
| **Brotli** | `.br` | Best ratio, HTTPS only (Chrome/Firefox) |
| **Disabled** | none | For custom server compression |

### Code Stripping

```csharp
// Enable maximum stripping
PlayerSettings.SetManagedStrippingLevel(
    NamedBuildTarget.WebGL,
    ManagedStrippingLevel.High
);
```

**Strip Engine Code:** Enable in Player Settings → Other Settings → Optimization

**Potential Issues:**
- Reflection may break
- May need `link.xml` to preserve classes
- AssetBundles loading stripped classes = errors

### Exception Handling

```csharp
PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
```

| Level | Performance | Debugging | Build Size |
|-------|-------------|-----------|------------|
| **None** | Best | Limited | Smallest |
| **Explicitly Thrown** | Good | Moderate | Medium |
| **Full** | Worst | Complete | Largest |

**Recommendation:** Use `Full` for development, `None` for release.

---

## Player Settings Reference

### Resolution and Presentation
- **Default Canvas Width/Height**: Initial canvas size
- **Run In Background**: Continue when window loses focus
- **Web Template**: Default, Minimal, or PWA

### Publishing Settings

| Setting | Description | Recommendation |
|---------|-------------|----------------|
| Compression Format | Gzip/Brotli/Disabled | Brotli for HTTPS |
| Decompression Fallback | JS decompressor | Only if no server config |
| Data Caching | IndexedDB caching | ✅ Enable |
| Name Files As Hashes | MD5 filenames | ✅ Enable for cache busting |
| Debug Symbols | Off/External/Embedded | External for release |

### Memory Settings

| Setting | Default | Max | Notes |
|---------|---------|-----|-------|
| Initial Memory Size | 32 MB | - | Starting heap |
| Maximum Memory Size | 2048 MB | 4096 MB | Upper limit |
| Memory Growth Mode | Geometric | - | Recommended |

### IL2CPP Settings
- **Code Generation**: "Faster (smaller) builds" recommended
- **C++ Compiler**: Release configuration for production

---

## Memory Management

### Unity Heap Architecture

```
┌─────────────────────────────────────────┐
│           Browser Memory Space          │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │     Unity Heap (WebAssembly)      │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Managed Objects (C#)       │  │  │
│  │  ├─────────────────────────────┤  │  │
│  │  │  Native Objects             │  │  │
│  │  ├─────────────────────────────┤  │  │
│  │  │  Assets, Scenes, Shaders    │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Garbage Collection Constraints

**Critical Limitation:** GC only runs when no managed code is executing (end of frame)

**Problem Pattern:**
```csharp
// ❌ BAD - Quadratic memory growth
string result = "";
for (int i = 0; i < 10000; i++) {
    result += i.ToString(); // Creates temp objects each iteration
}
// GC cannot run until loop completes!
```

**Solution Patterns:**

```csharp
// ✅ GOOD - StringBuilder
var sb = new StringBuilder(10000);
for (int i = 0; i < 10000; i++) {
    sb.Append(i);
}
string result = sb.ToString();
```

```csharp
// ✅ GOOD - NativeArray (bypasses GC)
using (var data = new NativeArray<byte>(size, Allocator.Temp)) {
    // Operations here
} // Disposed immediately after scope
```

### Memory Optimization Techniques

1. **Use NativeArray<T>** for temporary allocations
2. **Object Pooling** for frequently created/destroyed objects
3. **AssetBundles** for on-demand loading (load directly to Unity heap)
4. **Addressables** for managed asset lifecycle
5. **Pre-allocate** buffers and collections
6. **Use structs** over classes for small data types

### Memory Growth Modes

| Mode | Behaviour | Use Case |
|------|-----------|----------|
| **None** | Fixed size | Predictable memory |
| **Linear** | Grows by fixed amount | Controlled growth |
| **Geometric** | Doubles when needed | General purpose (recommended) |

---

## JavaScript Interop

### Architecture Overview

```
┌──────────────┐    SendMessage     ┌──────────────┐
│              │ ←───────────────── │              │
│    Unity     │                    │  JavaScript  │
│    (C#)      │ ───────────────→  │   (Browser)  │
│              │    DllImport       │              │
└──────────────┘                    └──────────────┘
```

### Creating JSLib Plugins

**Location:** `Assets/Plugins/WebGL/MyPlugin.jslib`

```javascript
// MyPlugin.jslib
mergeInto(LibraryManager.library, {

    // Simple function - no parameters
    ShowAlert: function() {
        window.alert("Hello from Unity!");
    },

    // With string parameter
    ShowMessage: function(messagePtr) {
        var message = UTF8ToString(messagePtr);
        console.log(message);
    },

    // With numeric parameters
    AddNumbers: function(a, b) {
        return a + b;
    },

    // Dispatch event to React
    DispatchUnityEvent: function(eventNamePtr, dataPtr) {
        var eventName = UTF8ToString(eventNamePtr);
        var data = UTF8ToString(dataPtr);
        try {
            window.dispatchReactUnityEvent(eventName, data);
        } catch (e) {
            console.warn("React Unity event dispatch failed:", e);
        }
    }
});
```

### Calling JSLib from C#

```csharp
using System.Runtime.InteropServices;
using UnityEngine;

public class JSBridge : MonoBehaviour
{
    // Import JSLib functions
    [DllImport("__Internal")]
    private static extern void ShowAlert();

    [DllImport("__Internal")]
    private static extern void ShowMessage(string message);

    [DllImport("__Internal")]
    private static extern int AddNumbers(int a, int b);

    [DllImport("__Internal")]
    private static extern void DispatchUnityEvent(string eventName, string data);

    public void TriggerAlert()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        ShowAlert();
        #else
        Debug.Log("ShowAlert - WebGL only");
        #endif
    }

    public void SendEventToReact(string eventName, string jsonData)
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        DispatchUnityEvent(eventName, jsonData);
        #endif
    }
}
```

### JavaScript to Unity (SendMessage)

```javascript
// From browser JavaScript
unityInstance.SendMessage('GameController', 'MethodName');
unityInstance.SendMessage('GameController', 'MethodWithInt', 42);
unityInstance.SendMessage('GameController', 'MethodWithString', 'Hello');
```

**C# Receiver:**
```csharp
public class GameController : MonoBehaviour
{
    public void MethodName() { }
    public void MethodWithInt(int value) { }
    public void MethodWithString(string message) { }
}
```

### Data Type Mapping

| C# Type | JavaScript | Notes |
|---------|------------|-------|
| `int`, `float` | Number | Direct pass |
| `string` | Pointer | Use `UTF8ToString()` |
| `byte[]` | Pointer | Use `HEAPU8.subarray()` |
| Complex objects | JSON string | Serialize/deserialize |

### Pre-execution Files (.jspre)

**Location:** `Assets/Plugins/WebGL/MyHelpers.jspre`

```javascript
// Executed before main module loads
// Good for shared utilities used in .jslib files
var MyHelpers = {
    formatData: function(data) {
        return JSON.stringify(data);
    }
};
```

---

## React Unity WebGL Integration

### Installation

```bash
npm install react-unity-webgl
# or
pnpm add react-unity-webgl
```

### Basic Setup

```tsx
import { Unity, useUnityContext } from 'react-unity-webgl';

function UnityGame() {
    const { unityProvider, isLoaded, loadingProgression } = useUnityContext({
        loaderUrl: '/Build/game.loader.js',
        dataUrl: '/Build/game.data',
        frameworkUrl: '/Build/game.framework.js',
        codeUrl: '/Build/game.wasm',
    });

    return (
        <div>
            {!isLoaded && (
                <p>Loading... {Math.round(loadingProgression * 100)}%</p>
            )}
            <Unity
                unityProvider={unityProvider}
                style={{ width: '100%', height: '600px' }}
            />
        </div>
    );
}
```

### React → Unity Communication

```tsx
import { useUnityContext } from 'react-unity-webgl';

function GameControls() {
    const { sendMessage } = useUnityContext({ /* config */ });

    const spawnEnemies = (count: number) => {
        // Calls SpawnEnemies(int) on GameController GameObject
        sendMessage('GameController', 'SpawnEnemies', count);
    };

    const setPlayerName = (name: string) => {
        sendMessage('Player', 'SetName', name);
    };

    return (
        <button onClick={() => spawnEnemies(10)}>
            Spawn 10 Enemies
        </button>
    );
}
```

### Unity → React Communication

**Step 1: Create JSLib** (`Assets/Plugins/WebGL/ReactBridge.jslib`)

```javascript
mergeInto(LibraryManager.library, {
    SendScoreToReact: function(score) {
        try {
            window.dispatchReactUnityEvent('GameScore', score);
        } catch (e) {
            console.warn('Event dispatch failed:', e);
        }
    },

    SendMessageToReact: function(messagePtr) {
        var message = UTF8ToString(messagePtr);
        try {
            window.dispatchReactUnityEvent('GameMessage', message);
        } catch (e) {
            console.warn('Event dispatch failed:', e);
        }
    }
});
```

**Step 2: C# Caller**

```csharp
using System.Runtime.InteropServices;

public class ScoreManager : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SendScoreToReact(int score);

    [DllImport("__Internal")]
    private static extern void SendMessageToReact(string message);

    public void UpdateScore(int newScore)
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SendScoreToReact(newScore);
        #endif
    }
}
```

**Step 3: React Listener**

```tsx
import { useUnityContext } from 'react-unity-webgl';
import { useEffect, useCallback } from 'react';

function GameWithEvents() {
    const { addEventListener, removeEventListener } = useUnityContext({ /* config */ });

    const handleScore = useCallback((score: number) => {
        console.log('Score updated:', score);
    }, []);

    const handleMessage = useCallback((message: string) => {
        console.log('Game message:', message);
    }, []);

    useEffect(() => {
        addEventListener('GameScore', handleScore);
        addEventListener('GameMessage', handleMessage);

        return () => {
            removeEventListener('GameScore', handleScore);
            removeEventListener('GameMessage', handleMessage);
        };
    }, [addEventListener, removeEventListener, handleScore, handleMessage]);

    return <Unity unityProvider={unityProvider} />;
}
```

### Complex Data Transfer

```csharp
// C# - Send JSON
[Serializable]
public class PlayerData
{
    public string name;
    public int score;
    public float[] position;
}

public void SendPlayerData(PlayerData data)
{
    string json = JsonUtility.ToJson(data);
    #if UNITY_WEBGL && !UNITY_EDITOR
    SendMessageToReact(json);
    #endif
}
```

```tsx
// React - Receive JSON
interface PlayerData {
    name: string;
    score: number;
    position: number[];
}

const handlePlayerData = useCallback((jsonString: string) => {
    const data: PlayerData = JSON.parse(jsonString);
    console.log('Player:', data.name, 'Score:', data.score);
}, []);
```

---

## Graphics & Rendering

### Recommended Render Pipeline

**Use URP (Universal Render Pipeline)** for:
- Efficient cross-platform rendering
- Better mobile/web performance
- SRP Batcher support
- Shader Graph compatibility

### URP Configuration for Web

1. Create URP asset with web-optimized settings
2. Disable unnecessary features:
   - Post-processing (if not needed)
   - HDR (unless required)
   - Shadows complexity

### WebGL2 Graphics Capabilities
- Based on OpenGL ES 3.0
- Linear and Gamma color space
- Static and Dynamic batching
- GPU instancing (limited)

### WebGPU Graphics Capabilities
All WebGL2 features plus:
- Compute shaders
- Indirect rendering
- GPU skinning
- VFX Graph

### Performance Tips

```csharp
// Enable SRP Batcher (URP)
// Project Settings → Graphics → SRP Batcher: Enabled

// Reduce draw calls
// - Use GPU instancing
// - Atlas textures
// - Combine meshes where possible
```

---

## Audio Handling

### Web Audio API Limitations

Unity Web uses Web Audio API instead of FMOD.

**Supported:**
- ✅ Basic playback (play, pause, stop)
- ✅ Volume control
- ✅ Pitch adjustment (positive values only)
- ✅ Spatial audio / 3D positioning
- ✅ Doppler effect
- ✅ Loop control
- ✅ Playback scheduling

**Not Supported:**
- ❌ Microphone input
- ❌ Audio streaming
- ❌ AudioMixer effects (volume only)
- ❌ Scriptable Audio Pipeline
- ❌ Negative pitch values

### User Interaction Requirement

**Critical:** Browsers block audio until user interaction.

```csharp
// Ensure audio plays after user click/tap
public class AudioStarter : MonoBehaviour
{
    void Update()
    {
        // Wait for any input before playing audio
        if (Input.anyKeyDown || Input.GetMouseButtonDown(0))
        {
            AudioSource.PlayClipAtPoint(startClip, Vector3.zero);
        }
    }
}
```

**React Solution:**
```tsx
function GameWithAudio() {
    const [audioEnabled, setAudioEnabled] = useState(false);
    const { sendMessage } = useUnityContext({ /* config */ });

    const enableAudio = () => {
        setAudioEnabled(true);
        sendMessage('AudioManager', 'EnableAudio');
    };

    return (
        <div>
            {!audioEnabled && (
                <button onClick={enableAudio}>
                    Click to Enable Audio
                </button>
            )}
            <Unity unityProvider={unityProvider} />
        </div>
    );
}
```

### Audio Load Types

| Load Type | Use Case | Memory |
|-----------|----------|--------|
| **Decompress On Load** | Short clips, SFX | Higher |
| **Compressed In Memory** | Longer audio, music | Lower |

**iOS Silent Mode:** Use `Compressed In Memory` to ensure audio plays in silent mode.

### File Formats
- ✅ AAC (recommended)
- ✅ MP3 (better runtime download support)
- ⚠️ OGG (may have issues with runtime downloads)

---

## Input System

### Supported Input Types
- Keyboard
- Mouse
- Touch (limited mobile support)
- Gamepad (via HTML5 Gamepad API)
- Device sensors (secure context only - HTTPS)

### Keyboard Capture

```csharp
// Control keyboard capture
WebGLInput.captureAllKeyboardInput = true;  // Unity captures all keys
WebGLInput.captureAllKeyboardInput = false; // HTML can receive keys
```

### Cursor Locking

```csharp
// Request cursor lock (must be from user action)
Cursor.lockState = CursorLockMode.Locked;

// Maintain lock on focus changes
Cursor.stickyCursorLock = true; // Default is true for WebGL
```

**Requires user interaction:** Click or keypress to activate.

### Touch Challenges

- Unity WebGL touch support is limited
- Mobile keyboard requires workarounds
- Consider: [WebMobileInputFix](https://github.com/dantasulisses/WebMobileInputFix)

### Gamepad Detection

```csharp
// Must be called after user interacts with gamepad
string[] joysticks = Input.GetJoystickNames();
```

**Note:** Browsers require user interaction before exposing gamepad data.

---

## Networking

### Supported Methods

| Method | Supported | Notes |
|--------|-----------|-------|
| UnityWebRequest | ✅ Yes | Via Fetch API |
| WWW (legacy) | ✅ Yes | Via XMLHttpRequest |
| WebSockets | ✅ Via JS plugin | Native not available |
| WebRTC | ✅ Via JS plugin | P2P connections |
| Raw Sockets | ❌ No | Browser security |
| System.Net | ❌ No | Not supported |
| Ping/ICMP | ❌ No | Not supported |

### CORS Requirements

Server must return appropriate headers:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Async-Only Requests

**Critical:** Never use blocking code!

```csharp
// ❌ BAD - Will deadlock
while (!request.isDone) { }

// ✅ GOOD - Use coroutines
IEnumerator FetchData(string url)
{
    using (UnityWebRequest request = UnityWebRequest.Get(url))
    {
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            Debug.Log(request.downloadHandler.text);
        }
    }
}
```

### WebSocket via JavaScript

```javascript
// WebSocket.jslib
mergeInto(LibraryManager.library, {
    WebSocketConnect: function(urlPtr) {
        var url = UTF8ToString(urlPtr);
        window.gameSocket = new WebSocket(url);

        window.gameSocket.onmessage = function(event) {
            // Send to Unity via SendMessage
            unityInstance.SendMessage('NetworkManager', 'OnMessage', event.data);
        };
    }
});
```

---

## Caching & Asset Bundles

### Data Caching (IndexedDB)

Enable in **Player Settings → Publishing Settings → Data Caching**

Benefits:
- Caches `.data` files
- Survives browser cache clearing
- Larger storage limits than HTTP cache

### AssetBundle Caching

**Enable cache control:**

```javascript
// In your index.html or custom template
unityInstance.Module.cacheControl = function(url) {
    if (url.endsWith('.bundle')) {
        return 'must-revalidate';
    }
    return 'immutable';
};
```

**Cache Control Values:**
- `must-revalidate` - Cache with revalidation
- `immutable` - Cache without revalidation
- `no-store` - Don't cache

### AssetBundle Compression

| Compression | Supported | Notes |
|-------------|-----------|-------|
| LZMA | ❌ No | Requires threading |
| LZ4 | ✅ Yes | Recommended |
| Uncompressed | ✅ Yes | Largest size |

**Tip:** Use LZ4 + server-side Gzip/Brotli for best results.

### Addressables

```csharp
// Load addressable asset
var handle = Addressables.LoadAssetAsync<GameObject>("MyPrefab");
yield return handle;
Instantiate(handle.Result);

// Release when done
Addressables.Release(handle);
```

---

## Browser Compatibility

### Desktop Browsers

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Firefox | ✅ Full | Good performance |
| Safari 15+ | ✅ Full | Requires Safari 15+ for WebGL2 |
| Edge | ✅ Full | Chromium-based |

**Safari Limitations:**
- IndexedDB not supported in iframes
- WebGL2 requires Safari 15+

### Mobile Browsers (Experimental)

| Browser | Support | Notes |
|---------|---------|-------|
| iOS Safari 15+ | ⚠️ Limited | High-end devices only |
| Chrome Android 58+ | ⚠️ Limited | Memory constraints |

**Mobile Warning:** Unity does not officially support mobile web. Consider native builds for mobile.

### Requirements
- 64-bit browser
- WebGL 2.0 support
- WebAssembly support
- Adequate memory (varies by content)

---

## Texture Compression

### Format Recommendations

| Target | Format | Extension Support |
|--------|--------|-------------------|
| Desktop | DXT | Native |
| Mobile | ASTC | `WEBGL_compressed_texture_astc` |

### Configuration

**Build Settings:**
```
File → Build Profiles → Web → Texture Compression
```

**Player Settings:**
```
File → Build Profiles → Web → Player Settings → Other Settings → Texture compression format
```

### Multi-Platform Strategy

**Option 1: Separate Builds**
- Build with DXT for desktop
- Build with ASTC for mobile
- Detect platform and load appropriate build

**Option 2: Runtime Detection**

```javascript
// Check ASTC support
var gl = document.createElement('canvas').getContext('webgl2');
var hasASTC = !!gl.getExtension('WEBGL_compressed_texture_astc');

// Load appropriate data file
var dataUrl = hasASTC ? 'game_astc.data' : 'game_dxt.data';
```

### Fallback Behavior
If hardware doesn't support selected format:
- Unity decompresses at runtime
- Increases memory usage
- Slower loading

---

## Debugging & Profiling

### Development Build Features

Enable **Development Build** in Build Settings for:
- Profiler connection
- Readable function names
- Debug symbols
- Console logging

### Browser Console

All `Debug.Log()` output goes to browser console:
- **Chrome:** Ctrl+Shift+J (Windows) / Cmd+Option+J (Mac)
- **Firefox:** Ctrl+Shift+K (Windows) / Cmd+Option+K (Mac)

### Unity Profiler

1. Enable **Development Build**
2. Enable **Autoconnect Profiler** (cannot attach to running WebGL)
3. Build and run
4. Open Profiler window in Editor

### Browser Profiling Tools

**Chrome DevTools:**
- Performance tab for flame graphs
- Memory tab for heap snapshots

**Firefox Profiler:**
- Call stack visualization
- Frame-by-frame analysis

### Debug Symbols

```csharp
// Build script configuration
PlayerSettings.WebGL.debugSymbolMode = WebGLDebugSymbolMode.External;
PlayerSettings.WebGL.emscriptenArgs = "-s DEMANGLE_SUPPORT=1";
```

### Diagnostics Overlay

Enable in Player Settings to show:
- JavaScript memory
- WASM heap usage
- Frame timing

---

## Deployment

### Server Configuration

#### Required MIME Types

| Extension | MIME Type |
|-----------|-----------|
| `.wasm` | `application/wasm` |
| `.js` | `application/javascript` |
| `.data` | `application/octet-stream` |
| `.unityweb` | `application/octet-stream` |

#### Compression Headers

**Gzip (.gz files):**
```
Content-Encoding: gzip
Content-Type: application/wasm  (for .wasm.gz)
```

**Brotli (.br files):**
```
Content-Encoding: br
Content-Type: application/wasm  (for .wasm.br)
```

### Firebase Hosting Example

```json
// firebase.json
{
  "hosting": {
    "public": "build",
    "headers": [
      {
        "source": "**/*.@(wasm|wasm.gz|wasm.br)",
        "headers": [
          { "key": "Content-Type", "value": "application/wasm" }
        ]
      },
      {
        "source": "**/*.wasm.gz",
        "headers": [
          { "key": "Content-Encoding", "value": "gzip" }
        ]
      },
      {
        "source": "**/*.wasm.br",
        "headers": [
          { "key": "Content-Encoding", "value": "br" }
        ]
      }
    ]
  }
}
```

### Nginx Configuration

```nginx
location ~ \.wasm\.gz$ {
    add_header Content-Encoding gzip;
    default_type application/wasm;
}

location ~ \.wasm\.br$ {
    add_header Content-Encoding br;
    default_type application/wasm;
}

location ~ \.js\.gz$ {
    add_header Content-Encoding gzip;
    default_type application/javascript;
}
```

### Decompression Fallback

If you can't configure server headers:
1. Enable **Decompression Fallback** in Publishing Settings
2. Files get `.unityweb` extension
3. JavaScript decompressor included
4. ⚠️ Larger loader, slower loading

---

## Common Issues & Solutions

### "Out of Memory" Errors

**Symptoms:**
- Browser crashes on load
- "Could not allocate memory" errors

**Solutions:**
1. Reduce Maximum Memory Size
2. Use AssetBundles/Addressables
3. Optimize textures (compression, size)
4. Implement object pooling
5. Profile memory usage

### "Incorrect Header Check" Errors

**Cause:** Server not sending correct Content-Encoding headers

**Solution:** Configure server compression headers or enable Decompression Fallback

### CORS Errors

**Symptoms:**
- Network requests fail
- "Cross-Origin Request Blocked" in console

**Solutions:**
1. Configure CORS headers on server
2. Use same-origin requests
3. Set up proxy server

### Audio Not Playing

**Cause:** Browser autoplay policy

**Solution:** Require user interaction before audio:
```tsx
<button onClick={() => sendMessage('AudioManager', 'Play')}>
    Start Game (enables audio)
</button>
```

### Build Size Too Large

**Optimizations:**
1. Enable code stripping (High level)
2. Strip Engine Code
3. Use Brotli compression
4. Remove unused packages
5. Optimize textures
6. Use AssetBundles for lazy loading

### "Could not produce class with ID XXX"

**Cause:** Code stripping removed needed class

**Solution:** Add `link.xml`:
```xml
<linker>
    <assembly fullname="UnityEngine">
        <type fullname="UnityEngine.ClassName" preserve="all"/>
    </assembly>
</linker>
```

### Memory Access Out of Bounds

**Causes:**
- Accessing null/disposed objects
- Array bounds errors
- Native code issues

**Solutions:**
1. Enable Full Exception support (debugging)
2. Check for null references
3. Validate array indices

---

## Best Practices Checklist

### Build Configuration
- [ ] Use Brotli compression for HTTPS deployment
- [ ] Enable code stripping (High)
- [ ] Strip Engine Code enabled
- [ ] Exception support: None for release, Full for debug
- [ ] Name Files As Hashes enabled
- [ ] Data Caching enabled

### Performance
- [ ] Use URP render pipeline
- [ ] Enable SRP Batcher
- [ ] Optimize texture sizes and compression
- [ ] Use AssetBundles/Addressables
- [ ] Implement object pooling
- [ ] Avoid GC pressure (use NativeArray, StringBuilder)
- [ ] Profile memory usage

### Audio
- [ ] Require user interaction before playing audio
- [ ] Use Compressed In Memory for iOS compatibility
- [ ] Use MP3 format for runtime downloads

### Networking
- [ ] Configure CORS headers on server
- [ ] Use coroutines (never blocking calls)
- [ ] Handle network errors gracefully

### Testing
- [ ] Test on multiple browsers
- [ ] Test compressed and development builds
- [ ] Test memory on mobile devices (if targeting)
- [ ] Profile with browser DevTools

### Deployment
- [ ] Configure correct MIME types
- [ ] Configure compression headers
- [ ] Enable cache headers for assets
- [ ] Test decompression fallback if needed

---

## References

### Official Documentation
- [Unity Web Manual](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl.html)
- [WebGPU Documentation](https://docs.unity3d.com/6000.3/Documentation/Manual/WebGPU.html)
- [Web Player Settings](https://docs.unity3d.com/6000.3/Documentation/Manual/class-PlayerSettingsWebGL.html)
- [Memory in Unity Web](https://docs.unity3d.com/6000.3/Documentation/Manual/webgl-memory.html)

### React Unity WebGL
- [Official Documentation](https://react-unity-webgl.dev/)
- [GitHub Repository](https://github.com/jeffreylanters/react-unity-webgl)
- [NPM Package](https://www.npmjs.com/package/react-unity-webgl)

### Community Resources
- [Unity WebGL Memory Optimization (Kongregate)](https://medium.com/@kongregate/unity-webgl-memory-and-performance-optimization-3939780a7e97)
- [Better Minimal WebGL Template](https://seansleblanc.itch.io/better-minimal-webgl-template)
- [Unity Web Diagnostics Overlay](https://unity.com/how-to/profile-optimize-web-build)

### Browser APIs
- [MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [MDN WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

*Document generated from comprehensive research of Unity 6.3 LTS documentation and community resources.*
