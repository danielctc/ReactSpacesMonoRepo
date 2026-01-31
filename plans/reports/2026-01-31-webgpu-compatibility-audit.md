# WebGPU Compatibility Audit Report

**Date:** 2026-01-31
**Unity Project:** `/Volumes/Daniel Crucial/Unity work/SpacesSDK_Lenovo`
**React Project:** `/Users/comparethecloud/unity new/ReactSpacesMonoRepo`

---

## Executive Summary

| Category             | Status             | Action Required           |
| -------------------- | ------------------ | ------------------------- |
| Unity Build Settings | ⚠️ WebGPU Disabled | Enable in Player Settings |
| Sync GPU Readback    | 🔴 Blockers Found  | Fix 2 files               |
| Compute Shaders      | ⚠️ Partial Support | Fix FishFlock             |
| React Integration    | ✅ Compatible      | No changes needed         |
| Third-party Assets   | ⚠️ Editor Only     | Low risk                  |

---

## Part 1: Unity C# Audit

### 1.1 Current Build State

**Finding:** Current Unity builds have WebGPU **DISABLED** in build settings.

Evidence from loader.js:

```javascript
// WebGPU support was disabled in the build settings.
// Skip initialization of WebGPU context.
Module.SystemInfo.hasWebGPU = false;
```

**Fix:** Enable WebGPU in Unity:

```
Edit → Project Settings → Player → Web → Other Settings
→ Disable "Auto Graphics API"
→ Add WebGPU (drag to top)
→ Keep WebGL2 below (fallback)
```

---

### 1.2 Critical Blockers - Sync GPU Readback

#### ❌ FishFlockController.cs (MUST FIX)

**File:** `Assets/FlockBundle/FishFlock/Assets/Scripts/FishFlockController.cs`
**Lines:** 641, 841

```csharp
// ❌ BLOCKING - Sync GPU readback not supported in WebGPU
fishBuffer.GetData(fishesData);
```

**Fix:**

```csharp
#if UNITY_WEBGL
// Use async readback for WebGL/WebGPU
AsyncGPUReadback.Request(fishBuffer, request => {
    if (!request.hasError) {
        request.GetData<FishData>().CopyTo(fishesData);
    }
});
#else
fishBuffer.GetData(fishesData);
#endif
```

#### ✅ TrafficManager.cs (Already Correct)

**File:** `Assets/ithappy/Megacity/Traffic/Scripts/Traffic/TrafficManager.cs`

Already uses `AsyncGPUReadback` correctly:

```csharp
_ = AsyncGPUReadback.Request(m_RWCarsTransport, OnTransportCallback);
_ = AsyncGPUReadback.Request(m_RWCarsTransform, OnTransformCallback);
```

---

### 1.3 GetPixels/GetPixel Usage (Low Risk)

| File                       | Location              | Risk      | Notes             |
| -------------------------- | --------------------- | --------- | ----------------- |
| TIcon.cs                   | GameCreator Plugin    | 🟡 Low    | Editor-only icons |
| ASETextureArrayCreator.cs  | Amplify Shader Editor | 🟢 None   | Editor-only       |
| InstaLODNative.cs          | InstaLOD              | 🟢 None   | Editor-only       |
| PolyverseSkiesGenerator.cs | BOXOPHOBIC            | 🟡 Low    | Editor tool       |
| PhotoCaptureElement.cs     | Ready Player Me       | 🟡 Medium | WebGL camera      |
| CameraPhotoSelection.cs    | Ready Player Me       | 🟡 Medium | WebGL camera      |

**Recommendation:** These are mostly editor tools, but RPM camera capture may need WebGL conditionals if used at runtime.

---

### 1.4 SpacesSDK Core Files

#### ✅ ThumbnailCameraMain.cs (Correct Pattern)

**File:** `Assets/SpacesSDK/Runtime/React/Components/ThumbnailCamera/ThumbnailCameraMain.cs`

Uses async readback correctly:

```csharp
AsyncGPUReadback.Request(equirectangularTexture, 0, TextureFormat.RGB24, (asyncResult) => {
    output.LoadRawTextureData(asyncResult.GetData<byte>());
});
```

---

### 1.5 Platform-Specific Code Review

**Files with UNITY_WEBGL conditionals:** 50+ files

Key files reviewed:

- `ReactRaiseEvent.cs` - ✅ Properly guarded
- `WebGLInputController.cs` - ✅ Properly guarded
- `ReactKeyboardManager.cs` - ✅ Properly guarded
- `MediaScreenClick.cs` - ✅ Properly guarded
- `PlayerManager.cs` - ✅ Properly guarded

**Status:** Good coverage of WebGL-specific code paths.

---

### 1.6 Compute Shader Analysis

| Asset               | Uses ComputeBuffer | Uses GetData (sync) | WebGPU Ready |
| ------------------- | ------------------ | ------------------- | ------------ |
| FishFlockController | Yes                | Yes (line 641, 841) | ❌ No        |
| TrafficManager      | Yes                | No (uses AsyncGPU)  | ✅ Yes       |

---

## Part 2: React Side Audit

### 2.1 react-unity-webgl Integration

**Status:** ✅ Compatible with WebGPU builds

Current setup in `UnityProvider.jsx`:

```jsx
const { unityProvider, isLoaded, sendMessage } = useUnityContext({
  loaderUrl: loaderUrl,
  dataUrl: dataUrl,
  frameworkUrl: frameworkUrl,
  codeUrl: codeUrl,
});
```

This works identically for WebGL2 and WebGPU builds - the library just loads the WASM.

---

### 2.2 WebGPU Detection (Not Implemented)

**Current State:** No WebGPU feature detection in React code

**Recommended Addition:**

```typescript
// packages/webgl/src/utils/webgpu-detection.ts
export const detectWebGPU = async (): Promise<boolean> => {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
};

export const getGraphicsAPI = async (): Promise<'webgpu' | 'webgl2' | 'unknown'> => {
  if (await detectWebGPU()) return 'webgpu';
  const canvas = document.createElement('canvas');
  if (canvas.getContext('webgl2')) return 'webgl2';
  return 'unknown';
};
```

---

### 2.3 Files to Update for WebGPU Feature Flags

| File                      | Change                     | Priority |
| ------------------------- | -------------------------- | -------- |
| `UnityProvider.jsx`       | Add WebGPU detection state | Medium   |
| `WebGLRenderer/index.jsx` | Expose graphics API to UI  | Low      |
| `useWebGLState.js`        | Track WebGPU availability  | Medium   |

---

### 2.4 Unity Build Files Analysis

**Dev Builds Examined:**

- `spacessdk/Build/SpacesMetaverse_SDK.loader.js`
- `dantest/Build/dantest.loader.js`

Both contain WebGPU initialization code but disabled:

```javascript
function checkForWebGPU() {
  // WebGPU support was disabled in the build settings.
  Module.SystemInfo.hasWebGPU = false;
}
```

---

## Part 3: Action Items

### Critical (Must Fix Before WebGPU Build)

1. **Fix FishFlockController.cs**
   - Replace sync `GetData()` with `AsyncGPUReadback`
   - Lines 641, 841
   - Impact: Fish animation will break without fix

### High Priority

2. **Enable WebGPU in Unity Player Settings**
   - Disable Auto Graphics API
   - Add WebGPU first, WebGL2 second
   - Rebuild

3. **Test Ready Player Me camera features**
   - Verify `PhotoCaptureElement.cs` works in WebGL
   - May need async conversion

### Medium Priority

4. **Add WebGPU detection to React**
   - Create utility function
   - Expose in UnityProvider context
   - Use for feature flags

5. **Update documentation**
   - Server headers for WebGPU builds
   - Browser compatibility notes

### Low Priority

6. **Review third-party assets**
   - GameCreator icon generation
   - BOXOPHOBIC skybox generator
   - Most are editor-only, low risk

---

## Part 4: Build Checklist

Before enabling WebGPU:

- [ ] Fix `FishFlockController.cs` async readback
- [ ] Verify no `RWBuffer<>` in custom shaders
- [ ] Verify no LZMA AssetBundle compression
- [ ] Enable WebGPU in Player Settings (keep WebGL2 fallback)
- [ ] Test on Chrome (best WebGPU support)
- [ ] Test fallback to WebGL2 on Safari/Firefox
- [ ] Configure server MIME types
- [ ] Update firebase.json headers if needed

---

## Browser Compatibility Reference

| Browser       | WebGPU Support | Notes                   |
| ------------- | -------------- | ----------------------- |
| Chrome 113+   | ✅ Full        | Recommended for testing |
| Edge 113+     | ✅ Full        | Chromium-based          |
| Firefox       | ⚠️ Behind flag | `dom.webgpu.enabled`    |
| Safari 17.4+  | ⚠️ Limited     | macOS Sonoma+           |
| Mobile Chrome | ⚠️ Limited     | Android 12+             |
| iOS Safari    | ❌ None        | Not supported yet       |

---

## Appendix: Files Scanned

### Unity (SpacesSDK_Lenovo)

- Total .cs files scanned: 500+
- WebGPU blocker patterns found: 2 critical, 6 low-risk
- UNITY_WEBGL conditionals: 50+ files

### React (ReactSpacesMonoRepo)

- WebGL-related files: 47
- Unity integration files: 10
- WebGPU references: In Unity builds only

---

_Report generated by Claude Code audit_
