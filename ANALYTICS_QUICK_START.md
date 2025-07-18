# Analytics Quick Start Guide

Get analytics tracking up and running in 5 minutes!

## 🚀 Prerequisites
- Firebase project with Cloud Functions deployed
- React app with authentication

## 📦 Installation

```bash
# Deploy the required Cloud Functions
firebase deploy --only functions
```

## 🔧 Basic Setup

### 1. Initialize Analytics in Your Component
```javascript
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';

function MySpace() {
  const { track, isReady } = useAnalytics('your-space-id');
  
  // Track a custom event
  const handleButtonClick = async () => {
    await track('custom_button_click', {
      category: 'user_interaction',
      buttonId: 'hero-cta',
      action: 'click'
    });
  };
  
  return (
    <div>
      <p>Analytics Ready: {isReady ? '✅' : '❌'}</p>
      <button onClick={handleButtonClick}>
        Click Me (Tracked)
      </button>
    </div>
  );
}
```

### 2. Portal Analytics (Auto-Tracking)
```javascript
import { useUnityOnPortalClick } from '@disruptive-spaces/shared/hooks/unityEvents/useUnityOnPortalClick';

function PortalHandler() {
  const { clickedPortal, clearClickedPortal } = useUnityOnPortalClick();
  
  // Portal clicks automatically tracked with:
  // - portalId, targetSpaceId, targetSpaceName
  // - sourceSpaceId, isEditMode, timestamp
  
  return (
    <div>
      {clickedPortal && (
        <div>
          <p>Portal clicked: {clickedPortal.portalId}</p>
          <button onClick={clearClickedPortal}>Close</button>
        </div>
      )}
    </div>
  );
}
```

### 3. Video Play Analytics (Auto-Tracking)
```javascript
import { useUnityOnPlayVideo } from '@disruptive-spaces/shared/hooks/unityEvents/useUnityOnPlayVideo';

function VideoHandler() {
  const { videoUrl } = useUnityOnPlayVideo();
  
  // Video plays automatically tracked with:
  // - videoId, videoUrl, videoTitle
  // - gameObjectName, isEditMode, timestamp
  
  return videoUrl ? <VideoPlayer url={videoUrl} /> : null;
}
```

## 📊 View Analytics Data

### Firebase Console
```
Firebase Console > Firestore > spaces/{spaceId}/analyticsEvents
```

### Query Data in Code
```javascript
import { usePortalAnalytics } from '@disruptive-spaces/shared/hooks/unityEvents/usePortalAnalytics';

function AnalyticsDashboard() {
  const {
    portalClicks,
    portalNavigations,
    totalPortalClicks,
    getPopularPortals
  } = usePortalAnalytics('your-space-id');
  
  return (
    <div>
      <h2>Portal Analytics</h2>
      <p>Total Clicks: {totalPortalClicks}</p>
      <p>Popular Portals: {getPopularPortals().length}</p>
    </div>
  );
}
```

## 🎯 What Gets Tracked Automatically

### ✅ Auto-Tracked Events
- ✅ Portal clicks and navigation
- ✅ Video play events
- ✅ Space enter/exit (session management)
- ✅ Nameplate clicks
- ✅ Media screen interactions
- ✅ Unity player events

### 🔧 Custom Events (You Add)
- Button clicks
- Form submissions
- Modal opens/closes
- Feature usage
- Error tracking

## 🔍 Event Data Structure

Every event includes:
```javascript
{
  eventType: "unity_portal_click",
  timestamp: "2024-01-15T10:30:00Z",
  userId: "user_uid",
  sessionId: "session_id",
  category: "navigation",
  source: "unity",
  data: {
    portalId: "portal_SpaceA_SpaceB_123",
    targetSpaceId: "SpaceB",
    targetSpaceName: "Cinema Space", // 🎉 Now includes space names!
    sourceSpaceId: "SpaceA",
    serverValidated: true
  }
}
```

## 🛠️ Debug Mode

Enable debug logging to see what's happening:
```javascript
const { track, isReady } = useAnalytics('space-id', {
  enableDebugLogs: true
});
```

## 🔒 Security Notes

- ✅ All data processed server-side (Cloud Functions)
- ✅ No direct client access to analytics data
- ✅ Data validation and sanitization
- ✅ User data anonymized by Firebase Auth UID

## 📋 Quick Checklist

- [ ] Deploy Cloud Functions (`firebase deploy --only functions`)
- [ ] Add `useAnalytics` hook to your main component
- [ ] Replace 'your-space-id' with actual space ID
- [ ] Test with debug logging enabled
- [ ] Check Firebase Console for data
- [ ] Add custom event tracking as needed

## 🆘 Troubleshooting

### No Data Appearing?
1. Check Cloud Functions are deployed
2. Verify user is authenticated
3. Check Firebase Console logs
4. Enable debug logging

### 500 Errors?
```bash
firebase functions:log
```

### Need More Detail?
See the complete [Frontend Analytics Guide](./FRONTEND_ANALYTICS_GUIDE.md) for advanced usage, all available hooks, and detailed examples.

---

**🎯 Result**: You now have comprehensive analytics tracking for your Unity WebGL metaverse application with portal navigation tracking, video play analytics, and session management! 