# Avatar/Skin Loading Debug Report

**Date:** 2026-01-30
**Issue:** ReadyPlayerMe avatars not loading in Unity WebGL metaverse
**Severity:** High - Core feature non-functional

---

## Executive Summary

Avatar loading system is properly configured but failing due to **network authority mismatch** in Photon Fusion. React sends avatar URLs successfully, Unity receives the events, but avatar changes never propagate across the network because the local player lacks `HasStateAuthority` to modify networked properties.

**Root Cause:** `AvatarUrlUpdater.ChangeAvatarUrl()` requires `HasStateAuthority` to update `NetworkedAvatarUrl`, but local players only have `HasInputAuthority` in Photon Fusion client-server architecture.

**Impact:** Players cannot change their avatars. The system silently fails with only a warning log that's easily missed.

---

## Technical Analysis

### React → Unity Event Flow ✅ WORKING

**React Side:**
1. User selects avatar in `AvatarModal.jsx` or creates one in `ReadyPlayerMeModal.jsx`
2. `sendUnityEvent("AvatarUrlFromReact", { url: "https://models.readyplayer.me/xxx.glb" })` called
3. Event queued via `useSendUnityEvent` hook
4. Sent to Unity: `ReactIncomingEvent.HandleEvent(JSON.stringify({ eventName, data }))`

**Unity Side:**
1. `ReactIncomingEvent.HandleEvent()` receives JSON payload ✅
2. Parses event as `AvatarUrlFromReact` case (line 196-200) ✅
3. Deserializes to `AvatarUrlData` ✅
4. Invokes `OnReactAvatarUrlFromReact` event ✅

**Evidence:** Logs show "Unity: AvatarUrlFromReact received" from `ReactIncomingEvent.cs:197`

### Event Subscription ✅ WORKING

**AvatarUrlUpdater.cs** (line 83-86):
```csharp
if (Object != null && Object.HasInputAuthority)
{
    ReactIncomingEvent.OnReactAvatarUrlFromReact += HandleAvatarUrlFromReact;
}
```

- Subscription occurs in `Start()` for local player ✅
- `HandleAvatarUrlFromReact()` receives the URL and calls `ChangeAvatarUrl()` ✅

### Network Authority Mismatch ❌ BROKEN

**AvatarUrlUpdater.cs** (line 180-191):
```csharp
public void ChangeAvatarUrl(string newAvatarUrl)
{
    if (Object != null && Object.HasStateAuthority)
    {
        NetworkedAvatarUrl = newAvatarUrl;
    }
    else
    {
        LogWarning("Cannot change avatar URL: No state authority.");
    }
}
```

**Problem:** In Photon Fusion's client-server architecture:
- Local player has `HasInputAuthority = true` (can send input)
- Local player has `HasStateAuthority = false` (cannot modify networked state)
- Only the **server/host** has `HasStateAuthority`

**Result:** Avatar URL change silently fails with warning log that goes unnoticed.

### Avatar Loading Logic (NOT REACHED)

**AvatarUrlUpdater.cs** (line 136-153) - `Render()` method:
- Detects `NetworkedAvatarUrl` changes every frame
- Triggers `StartAvatarLoading()` when URL changes
- **Never executes** because `NetworkedAvatarUrl` never gets set

**Avatar Loading Pipeline:**
1. `LoadAvatarModelRepeatedly()` - Retry logic with max 15 attempts
2. `LoadAvatarModelCoroutine()` - Actual GLB loading via ReadyPlayerMe SDK
3. `AvatarObjectLoader` - Downloads and parses GLB
4. `character.ChangeModel()` - Applies model to Game Creator character system

**Assessment:** Loading code is robust with timeouts, retries, validation. Not the issue.

---

## Supporting Evidence

### File Locations

**React:**
- `/packages/webgl/src/components/AvatarModal.jsx` (line 47)
- `/packages/webgl/src/components/ReadyPlayerMeModal.jsx` (line 44)
- `/packages/webgl/src/hooks/unityEvents/core/useSendUnityEvent.js` (line 16)

**Unity:**
- `/Assets/SpacesSDK/Runtime/React/EventsManagement/ReactIncomingEvent.cs` (line 196-200)
- `/Assets/SpacesSDK/Runtime/Scripts/AvatarUrlUpdater.cs` (line 85, 180-191, 436-453)
- `/Assets/SpacesSDK/Runtime/React/MonoBehaviours/IncomingEvents/DataClasses/AvatarUrlData.cs`

### Expected vs. Actual Behavior

| Stage | Expected | Actual | Status |
|-------|----------|--------|--------|
| React sends event | ✅ | ✅ | OK |
| Unity receives event | ✅ | ✅ | OK |
| Event subscription fires | ✅ | ✅ | OK |
| `ChangeAvatarUrl()` called | ✅ | ✅ | OK |
| `NetworkedAvatarUrl` updated | ✅ | ❌ | **FAIL** |
| Avatar loads | ✅ | ❌ | **FAIL** |

### Log Output (Expected)

**Current logs:**
```
[ReactIncomingEvent] Unity: AvatarUrlFromReact received
[AvatarUrlUpdater] (Proxy) Received avatar URL from React: https://...
[AvatarUrlUpdater] (Proxy) Changing avatar URL to: https://...
[AvatarUrlUpdater] (Proxy) Cannot change avatar URL: No state authority.
```

**Missing logs** (never appear):
```
[AvatarUrlUpdater] Detected URL change in Render...
[AvatarUrlUpdater] Loading avatar from URL...
[AvatarUrlUpdater] Avatar loading completed successfully.
```

---

## Root Cause Analysis

### Architecture Pattern

The system uses **Photon Fusion's client-server architecture**:

1. **Host/Server** - One client acts as authoritative server
2. **Clients** - All other players (including the one who acts as host)

**Authority types:**
- `HasInputAuthority` - Can send input for this object (local player only)
- `HasStateAuthority` - Can modify networked state (host only)

### The Authority Conflict

**Current flow:**
```
Local Player (HasInputAuthority = true, HasStateAuthority = false)
    ↓
Receives React event
    ↓
Calls ChangeAvatarUrl()
    ↓
Checks HasStateAuthority → FALSE
    ↓
Warning logged, operation aborted
```

**Required flow:**
```
Local Player (HasInputAuthority = true)
    ↓
Receives React event
    ↓
Sends RPC to Host/Server
    ↓
Host/Server (HasStateAuthority = true)
    ↓
Updates NetworkedAvatarUrl
    ↓
Change replicates to all clients via Render()
```

---

## Recommended Fix

### Solution 1: Add RPC for Avatar Changes (Recommended)

**Modify AvatarUrlUpdater.cs:**

```csharp
public void ChangeAvatarUrl(string newAvatarUrl)
{
    if (string.IsNullOrEmpty(newAvatarUrl))
    {
        LogError("Provided avatar URL is empty or null.");
        return;
    }

    if (!IsValidReadyPlayerMeUrl(newAvatarUrl))
    {
        LogError($"Invalid avatar URL format: {newAvatarUrl}");
        return;
    }

    Log($"Changing avatar URL to: {newAvatarUrl}");

    if (Object != null && Object.HasStateAuthority)
    {
        // Direct update for host
        NetworkedAvatarUrl = newAvatarUrl;
    }
    else if (Object != null && Object.HasInputAuthority)
    {
        // RPC call for clients
        RPC_SetAvatarUrl(newAvatarUrl);
    }
    else
    {
        LogWarning("Cannot change avatar URL: No state or input authority.");
    }
}

[Rpc(RpcSources.InputAuthority, RpcTargets.StateAuthority)]
private void RPC_SetAvatarUrl(string newAvatarUrl, RpcInfo info = default)
{
    Log($"RPC received to set avatar URL: {newAvatarUrl}");

    if (!IsValidReadyPlayerMeUrl(newAvatarUrl))
    {
        LogError($"RPC rejected: Invalid avatar URL format: {newAvatarUrl}");
        return;
    }

    NetworkedAvatarUrl = newAvatarUrl;
}
```

**Benefits:**
- Proper Photon Fusion pattern
- Works for both host and clients
- Maintains network authority rules
- No changes to React code needed

### Solution 2: Use [Networked] with OnChange Callback

Alternative approach using Fusion's built-in change detection:

```csharp
[Networked(OnChanged = nameof(OnAvatarUrlChanged))]
public NetworkString<_128> NetworkedAvatarUrl { get; private set; }

public static void OnAvatarUrlChanged(Changed<AvatarUrlUpdater> changed)
{
    var behaviour = changed.Behaviour;
    var newUrl = behaviour.NetworkedAvatarUrl.ToString();

    if (!string.IsNullOrEmpty(newUrl))
    {
        behaviour.isAvatarLoaded = false;
        behaviour.currentRetryCount = 0;
        behaviour.StartAvatarLoading();
    }
}
```

Then remove the manual change detection in `Render()`.

**Benefits:**
- Cleaner code
- Fusion handles change detection
- More reliable than manual comparison

### Solution 3: Server-Validated Avatar Changes

For added security (prevent cheating with invalid avatars):

```csharp
[Rpc(RpcSources.InputAuthority, RpcTargets.StateAuthority)]
private void RPC_RequestAvatarChange(string newAvatarUrl, RpcInfo info = default)
{
    // Server-side validation
    if (!IsValidReadyPlayerMeUrl(newAvatarUrl))
    {
        Log($"Avatar change rejected for {info.Source}: Invalid URL");
        return;
    }

    // Optional: Check against whitelist or validate with ReadyPlayerMe API

    NetworkedAvatarUrl = newAvatarUrl;
}
```

---

## Implementation Steps

1. **Backup current AvatarUrlUpdater.cs**
2. **Add RPC method** to handle avatar URL changes from clients
3. **Modify ChangeAvatarUrl()** to use RPC when lacking state authority
4. **Test in multiplayer scenario:**
   - Host changes avatar ✓
   - Client changes avatar ✓
   - Avatar changes replicate to other players ✓
5. **Verify logs show:**
   - "RPC received to set avatar URL"
   - "Detected URL change in Render"
   - "Avatar loading completed successfully"

---

## Additional Observations

### ReadyPlayerMe Integration

- SDK properly integrated at `/Assets/Ready Player Me/Core/`
- `AvatarObjectLoader` handles GLB loading with CORS support
- Async loading with callbacks (`OnCompleted`, `OnFailed`)
- 30-second timeout per attempt, 15 max retries

### WebGL Build Considerations

**Current settings** (line 24-25):
- `urlWaitTimeout = 10.0f` - Wait time for initial URL
- `backgroundTabMultiplier = 3.0f` - Extended time for background tabs

**Good practices observed:**
- Background tab detection via `Application.isFocused`
- Extended timeouts for WebGL reliability
- Retry mechanism with exponential backoff

### React Integration Health

**Event system working correctly:**
- Queue mechanism prevents lost events
- Retry on send failure
- Waits for Unity `isLoaded` before sending
- Proper JSON stringification (double-encoded for complex data)

**No issues detected in:**
- `useSendUnityEvent` hook
- `UnityProvider` context
- Event payload formatting

---

## Files Requiring Changes

1. **AvatarUrlUpdater.cs** - Add RPC method, modify `ChangeAvatarUrl()`
2. **(Optional)** **AvatarUrlUpdater.cs** - Add `[Networked(OnChanged)]` attribute

**No React changes required.**

---

## Testing Checklist

- [ ] Host player changes avatar → visible to all
- [ ] Client player changes avatar → visible to all
- [ ] Avatar change logs appear in console
- [ ] Avatar loads within 5 seconds (good network)
- [ ] Avatar retries work (simulate bad network)
- [ ] Invalid URLs rejected gracefully
- [ ] Multiple players can change avatars simultaneously
- [ ] Avatar persists after disconnect/reconnect
- [ ] No errors in Unity console
- [ ] No errors in browser console

---

## Prevention Measures

### Code Review Focus

When working with Photon Fusion networked properties:
1. Always check authority before modifying `[Networked]` properties
2. Use RPCs for client-initiated state changes
3. Document which authority type each method requires

### Monitoring Improvements

Add telemetry for avatar change success/failure:
```csharp
private void LogAvatarChangeAttempt(string url, bool hasAuthority, bool success)
{
    // Send to analytics
}
```

### Documentation Updates

Add to Unity project docs:
- "Avatar System Architecture" - Explain authority flow
- "Common Pitfalls" - Document this exact issue
- "RPC Patterns" - Reference implementation

---

## Unresolved Questions

1. Should avatar changes require validation against a whitelist?
2. Should avatar URL be persisted in Firebase and restored on join?
3. Is there rate limiting needed for avatar changes (prevent spam)?
4. Should avatar loading failures fall back to a default avatar?

---

## Summary

**What's broken:** Network authority check prevents local players from updating their avatar URL.

**Why it's broken:** Photon Fusion client-server architecture requires RPC for client-initiated state changes.

**How to fix:** Add `[Rpc]` method to relay avatar URL changes from clients to the authoritative server.

**Estimated fix time:** 15 minutes code + 15 minutes testing = 30 minutes total.

**Priority:** High - Core feature, straightforward fix, low risk.
