# Unity SpacesSDK_Lenovo - Compiler Errors Report
**Generated**: 31 Jan 2026
**Project Path**: /Volumes/Daniel Crucial/Unity work/SpacesSDK_Lenovo
**Build Log**: Library/Editor-LastSuccessfulBuild.log

## Summary
- **Total Errors**: 314 (aggregated)
- **Unique Error Types**: 2
  - CS0115: Method override signature mismatch (288)
  - CS0104: Ambiguous type reference (26)

---

## Error Breakdown

### CS0115: Method Override Errors (288)
**Issue**: Methods attempting to override base class methods but signatures don't match (likely due to URP API changes)

**Affected Packages/Assets**:
1. **Packages/dev.ameye.linework** (22 errors)
   - `EdgeDetection.cs(445,34)`: `EdgeDetectionPass.OnCameraSetup()`
   - `EdgeDetection.cs(485,34)`: `EdgeDetectionPass.Execute()`
   - `EdgeDetection.cs(665,30)`: `EdgeDetection.SetupRenderPasses()`
   - `FastOutline.cs(299,34)`: `FastOutlinePass.OnCameraSetup()`
   - `FastOutline.cs(304,34)`: `FastOutlinePass.Execute()`
   - `FastOutline.cs(490,30)`: `FastOutline.SetupRenderPasses()`
   - `SoftOutline.cs(465,34)`: `SoftOutlinePass.OnCameraSetup()`
   - `SoftOutline.cs(504,34)`: `SoftOutlinePass.Execute()`
   - `SoftOutline.cs(785,30)`: `SoftOutline.SetupRenderPasses()`
   - `SurfaceFill.cs(370,34)`: `SurfaceFillPass.OnCameraSetup()`
   - `SurfaceFill.cs(375,34)`: `SurfaceFillPass.Execute()`
   - `SurfaceFill.cs(587,30)`: `SurfaceFill.SetupRenderPasses()`
   - `WideOutline.cs(627,34)`: `WideOutlinePass.OnCameraSetup()`
   - `WideOutline.cs(681,34)`: `WideOutlinePass.Execute()`
   - `WideOutline.cs(1056,30)`: `WideOutline.SetupRenderPasses()`
   - Plus 7 more similar errors

2. **Assets/Code/URP-Render-Features-main** (4 errors)
   - `BlurRenderPass.cs(36,30)`: `BlurRenderPass.Configure()`
   - `BlurRenderPass.cs(46,30)`: `BlurRenderPass.Execute()`
   - `DesaturationRenderPass.cs(57,30)`: `DesaturationRenderPass.OnCameraSetup()`
   - `DesaturationRenderPass.cs(87,30)`: `DesaturationRenderPass.Execute()`
   - Plus many more in this directory (~262 total in this asset)

3. **Various other RenderPass implementations** (262+ errors)

**Root Cause**: Universal Render Pipeline (URP) API has changed method signatures between Unity versions. The render pass base class methods have been updated, but these implementations still use old signatures.

**Resolution Strategy**: 
- Update method signatures to match current URP API
- Common fixes:
  - `OnCameraSetup(CommandBuffer, ref RenderingData)` → Check new URP API
  - `Execute(ScriptableRenderContext, ref RenderingData)` → Check new URP API
  - `SetupRenderPasses(ScriptableRenderer, in RenderingData)` → Check new URP API
  - `Configure(CommandBuffer, RenderTextureDescriptor)` → Check new URP API

---

### CS0104: Ambiguous Type Reference (26)
**Issue**: Type name exists in multiple namespaces, compiler cannot determine which to use

**File**: `Assets/BuildReport/Scripts/Editor/Window/BRT_BuildReportWindow.cs`
**Lines**: 2206, 2207, 2214, 2215, 2223 (and likely others)
**Error**: `TextureData` is ambiguous between `BuildReportTool.TextureData` and `UnityEngine.U2D.TextureData`

**Root Cause**: Namespace collision - both BuildReportTool and UnityEngine.U2D define TextureData class

**Resolution**: Add explicit namespace qualification in BRT_BuildReportWindow.cs
```csharp
// Instead of: TextureData
// Use: BuildReportTool.TextureData  // or full namespace
```

---

## Files with Errors

### Critical (CS0115 - URP API Mismatch)
| File | Error Count | Issue |
|------|------------|-------|
| Packages/dev.ameye.linework/Runtime/* | 22 | URP render pass override signatures |
| Assets/Code/URP-Render-Features-main/* | 262+ | URP render pass/feature implementations |
| Various other render-related scripts | ~14 | URP API incompatibility |

### Critical (CS0104 - Ambiguous Types)
| File | Error Count | Issue |
|------|------------|-------|
| Assets/BuildReport/Scripts/Editor/Window/BRT_BuildReportWindow.cs | 26 | TextureData namespace collision |

---

## Next Steps

1. **Priority 1**: Fix CS0104 in BRT_BuildReportWindow.cs (5 minutes)
   - Add namespace qualification to TextureData references

2. **Priority 2**: Fix CS0115 in linework package (1-2 hours)
   - Check current URP ScriptableRenderPass base class API
   - Update all method signatures accordingly
   - May need to update package or patch it locally

3. **Priority 3**: Fix CS0115 in URP-Render-Features (2-4 hours)
   - Similar to linework - update all RenderPass implementations
   - This appears to be a third-party asset that needs updating

---

## Commands to Review Errors

```bash
# View all CS0115 errors with file paths
grep "error CS0115" Library/Editor-LastSuccessfulBuild.log

# View all CS0104 errors
grep "error CS0104" Library/Editor-LastSuccessfulBuild.log

# Count errors by file
grep "error CS" Library/Editor-LastSuccessfulBuild.log | cut -d: -f1 | sort | uniq -c | sort -rn
```

