# Unity 6.3 Package Compatibility Report

**Date:** 31 January 2026
**Unity Version:** 6000.3.6f1 (Unity 6.3 LTS)
**Project:** SpacesSDK_Lenovo

---

## Executive Summary

After downgrading from Unity 6.4 beta to Unity 6.3 LTS, several packages required version adjustments. This report documents all changes made and provides update recommendations for Asset Store packages.

---

## Package Manager Changes (Already Applied)

| Package | Previous | Updated To | Reason |
|---------|----------|------------|--------|
| `com.unity.collections` | 6.4.0 | 2.5.1 | 6.4.0 not available for Unity 6.3 |
| `com.unity.render-pipelines.core` | 17.4.0 | 17.0.3 | URP 17.4 incompatible with 6.3 |
| `com.unity.render-pipelines.universal` | 17.4.0 | 17.0.3 | Shader compilation errors |
| `com.unity.render-pipelines.universal-config` | 17.4.0 | 17.0.3 | Must match URP version |
| `com.unity.shadergraph` | 17.4.0 | 17.0.3 | Must match URP version |
| `com.unity.cloud.gltfast` | 6.14.1 | 6.9.0 | Compatibility with Unity 6.3 |
| `com.unity.splines` | 2.8.2 | 2.6.1 | Compatibility with Unity 6.3 |
| `com.unity.cinemachine` | 3.1.4 | 3.1.2 | Compatibility with Unity 6.3 |

---

## Asset Store Packages - Status & Recommendations

### Critical Packages

| Package | Current Version | Unity 6 Compatible | Action Required |
|---------|-----------------|-------------------|-----------------|
| **Photon Fusion** | 1.1.0 | ⚠️ Upgrade to **2.0.10** | [Download SDK](https://doc.photonengine.com/fusion/current/getting-started/sdk-download) (Build 1688, 27 Jan 2026) |
| **Photon Voice** | - | ✅ Yes | Update via Photon SDK |
| **Ready Player Me** | 7.3.1 | ✅ Yes (min 2021.3.32) | Update via Package Manager → My Assets |
| **GameCreator 2** | Various | ✅ Yes (Oct 2024 update) | Update via GameCreator Hub |

### Other Asset Store Packages

| Package | Location | Action |
|---------|----------|--------|
| Amplify Shader Editor | `Assets/AmplifyShaderEditor` | Check My Assets for updates |
| BOXOPHOBIC (Polyverse) | `Assets/BOXOPHOBIC` | Check My Assets for updates |
| InstaLOD | `Assets/InstaLOD` | Check My Assets for updates |
| NinjutsuGames | `Assets/Plugins/NinjutsuGames` | Check My Assets for updates |
| StarterAssets | `Assets/StarterAssets` | Unity built-in, should auto-update |

---

## Known Issues After Migration

### 1. Shader Compilation Errors (RESOLVED)
- **Error:** `Hidden/Universal/2D Lit` - redefinition of 'FragmentOutput'
- **Cause:** URP 17.4.0 incompatible with Unity 6.3
- **Fix:** Downgraded URP to 17.0.3 ✅

### 2. Mesh Read/Write Error (MANUAL FIX REQUIRED)
- **Error:** `Not allowed to access uv8 on mesh 'AdjustWindowSize'`
- **Fix:** Select mesh → Inspector → Enable "Read/Write" → Apply

### 3. Photon Fusion Compatibility
- **Issue:** Fusion 1.1.0 may have issues with Unity 6
- **Recommendation:** Upgrade to **Fusion 2.0.10** (Build 1688, released 27 Jan 2026)
- **App ID:** `2fffcc6f-f959-4745-ae63-c936ce1b15ca`
- **Source:** [Photon SDK Download](https://doc.photonengine.com/fusion/current/getting-started/sdk-download)

---

## Update Instructions

### 1. Unity Package Manager Packages
Already updated in `Packages/manifest.json`. Restart Unity to apply.

### 2. Photon Fusion/Voice

1. Download **Fusion 2.0.10** from [photonengine.com/sdks](https://doc.photonengine.com/fusion/current/getting-started/sdk-download)
2. Delete existing `Assets/Photon` folder
3. Import new SDK (.unitypackage)
4. Re-enter App ID: `2fffcc6f-f959-4745-ae63-c936ce1b15ca`

### 3. Ready Player Me

1. Window → Package Manager
2. Top dropdown → My Assets
3. Find "Ready Player Me" → Update

### 4. GameCreator 2
1. Tools → GameCreator → Hub
2. Check for Updates
3. Update all modules

### 5. Other Asset Store Packages
1. Window → Package Manager → My Assets
2. Filter by "Update Available"
3. Update each package individually

---

## Verification Checklist

After updates, verify:

- [ ] Unity opens without package resolution errors
- [ ] No shader compilation errors in Console
- [ ] Photon connects to cloud successfully
- [ ] Ready Player Me avatars load correctly
- [ ] GameCreator actions/events work
- [ ] WebGL build completes without errors
- [ ] MCP Unity server responds (port 8090)

---

## Unity 6.3 LTS Support Timeline

| Version | Support Until |
|---------|---------------|
| Unity 6.3 LTS | December 2027 |
| Unity 6.0 LTS | October 2026 |

---

## References

- [Photon Fusion 2.0 Release Notes](https://doc.photonengine.com/fusion/current/getting-started/release-notes/release-notes-2-0)
- [Ready Player Me Unity SDK](https://docs.readyplayer.me/ready-player-me/integration-guides/unity)
- [GameCreator 2 Releases](https://docs.gamecreator.io/gamecreator/releases/)
- [Unity 6.3 Upgrade Guide](https://docs.unity3d.com/6000.3/Documentation/Manual/UpgradeGuideUnity63.html)

---

## Contact

For questions about this migration, contact the development team.

**Report generated:** 31 January 2026
