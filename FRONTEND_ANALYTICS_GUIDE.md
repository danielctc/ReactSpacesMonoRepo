# Frontend Analytics Integration Guide

A comprehensive guide for integrating the Unity WebGL Metaverse Analytics system into your frontend applications.

## 🎯 Overview

This analytics system provides secure, real-time tracking for Unity WebGL metaverse applications. All data is processed server-side via Cloud Functions and stored in Firebase Firestore.

## 🔧 Prerequisites

- Firebase project configured with Cloud Functions deployed
- React application with Firebase SDK
- User authentication system in place

## 📚 Available Hooks and Components

### 1. Core Analytics Hook - `useAnalytics`

Primary hook for all analytics functionality:

```javascript
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';

function MyComponent() {
  const { 
    track, 
    trackVideoPlay, 
    trackUnityEvent, 
    trackReactEvent, 
    trackModal,
    isReady,
    sessionId 
  } = useAnalytics(spaceId, {
    autoStart: true,
    enableDebugLogs: true,
    sessionMetadata: {
      customField: 'value'
    }
  });

  // Track a custom event
  const handleCustomEvent = async () => {
    await track('custom_event', {
      category: 'user_interaction',
      action: 'button_click',
      label: 'hero_cta'
    });
  };

  return (
    <button onClick={handleCustomEvent}>
      Track This Action
    </button>
  );
}
```

### 2. Unity Event Hooks

#### Portal Analytics
```javascript
import { useUnityOnPortalClick } from '@disruptive-spaces/shared/hooks/unityEvents/useUnityOnPortalClick';
import { useUnityOnPortalNavigate } from '@disruptive-spaces/shared/hooks/unityEvents/useUnityOnPortalNavigate';

function PortalSystem() {
  const { clickedPortal, clearClickedPortal, isAnalyticsReady } = useUnityOnPortalClick();
  
  // Portal clicks automatically tracked with:
  // - portalId
  // - targetSpaceId
  // - targetSpaceName (fetched from Firestore)
  // - sourceSpaceId
  // - isEditMode
  
  return (
    <div>
      {clickedPortal && (
        <PortalEditor 
          portal={clickedPortal} 
          onClose={clearClickedPortal}
        />
      )}
    </div>
  );
}
```

#### Video Analytics
```javascript
import { useUnityOnPlayVideo } from '@disruptive-spaces/shared/hooks/unityEvents/useUnityOnPlayVideo';

function VideoSystem() {
  const { videoUrl } = useUnityOnPlayVideo();
  
  // Video events automatically tracked:
  // 1. Unity-side: VIDEO_PLAY when video starts playing
  // 2. React-side: VIDEO_CLICK when user opens video player modal
  // 3. React-side: VIDEO_CLOSE when user closes video player modal
  
  // Data tracked includes:
  // - videoId, videoUrl, videoTitle
  // - gameObjectName, isEditMode
  // - spaceId, timestamp
  
  return videoUrl ? <VideoPlayer url={videoUrl} /> : null;
}
```

### 3. Analytics Data Query Hooks

#### Portal Analytics Data
```javascript
import { usePortalAnalytics } from '@disruptive-spaces/shared/hooks/unityEvents/usePortalAnalytics';

function PortalDashboard() {
  const {
    portalClicks,
    portalNavigations,
    allPortalEvents,
    isLoading,
    refreshAll,
    getPortalSpecificAnalytics,
    getPopularPortals,
    totalPortalClicks,
    totalPortalNavigations
  } = usePortalAnalytics(spaceId, {
    autoRefresh: true,
    refreshInterval: 30000,
    limitResults: 100
  });

  const handlePortalAnalysis = (portalId) => {
    const analytics = getPortalSpecificAnalytics(portalId);
    console.log('Portal Analytics:', analytics);
  };

  return (
    <div>
      <h2>Portal Analytics</h2>
      <p>Total Portal Clicks: {totalPortalClicks}</p>
      <p>Total Portal Navigations: {totalPortalNavigations}</p>
      
      <h3>Popular Portals</h3>
      {getPopularPortals().map(portal => (
        <div key={portal.portalId}>
          <p>{portal.portalId}: {portal.totalEvents} events</p>
          <p>Target: {portal.targetSpaceId}</p>
        </div>
      ))}
      
      <button onClick={refreshAll}>Refresh Data</button>
    </div>
  );
}
```

## 🎮 Event Types and Categories

### Unity Events
```javascript
// Available Unity event types
ANALYTICS_EVENT_TYPES.UNITY = {
  VIDEO_PLAY: 'unity_video_play',
  PORTAL_CLICK: 'unity_portal_click',
  PORTAL_NAVIGATE: 'unity_portal_navigate',
  MEDIA_SCREEN_CLICK: 'unity_media_screen_click',
  NAMEPLATE_CLICK: 'unity_nameplate_click',
  PLAYER_SPAWN: 'unity_player_spawn',
  PLAYER_MOVE: 'unity_player_move',
  SPACE_LOAD: 'unity_space_load',
  SPACE_READY: 'unity_space_ready',
  OBJECT_INTERACT: 'unity_object_interact'
};
```

### React Events
```javascript
// Available React event types
ANALYTICS_EVENT_TYPES.REACT = {
  SPACE_ENTER: 'react_space_enter',
  SPACE_EXIT: 'react_space_exit',
  MODAL_OPEN: 'react_modal_open',
  MODAL_CLOSE: 'react_modal_close',
  BUTTON_CLICK: 'react_button_click',
  FORM_SUBMIT: 'react_form_submit',
  ERROR_OCCURRED: 'react_error_occurred',
  VIDEO_CLICK: 'react_video_click',
  VIDEO_CLOSE: 'react_video_close'
};
```

### Event Categories
```javascript
ANALYTICS_CATEGORIES = {
  NAVIGATION: 'navigation',
  MEDIA_INTERACTION: 'media_interaction',
  SOCIAL_INTERACTION: 'social_interaction',
  CONTENT_INTERACTION: 'content_interaction',
  UI_INTERACTION: 'ui_interaction',
  SYSTEM_EVENT: 'system_event',
  USER_BEHAVIOR: 'user_behavior',
  ERROR: 'error'
};
```

## 📊 Data Structure

### Analytics Event Structure
```javascript
{
  eventId: "auto_generated_id",
  sessionId: "session_uuid",
  eventType: "unity_portal_click",
  timestamp: "2024-01-15T10:30:00Z",
  userId: "user_uid",
  category: "navigation",
  source: "unity" | "react",
  data: {
    // Event-specific data
    portalId: "portal_SpaceA_SpaceB_123",
    targetSpaceId: "SpaceB",
    targetSpaceName: "Cinema Space",
    sourceSpaceId: "SpaceA",
    isEditMode: false,
    navigationType: "confirmed",
    // Server validation
    serverValidated: true,
    clientSide: true,
    timestamp: "server_timestamp"
  }
}
```

### Analytics Session Structure
```javascript
{
  sessionId: "session_uuid",
  userId: "user_uid",
  spaceId: "space_id",
  startTime: "timestamp",
  endTime: "timestamp",
  eventCount: 15,
  lastActivityTime: "timestamp",
  isActive: true,
  metadata: {
    unityVersion: "2022.3.0f1",
    reactVersion: "18.x",
    startUrl: "https://example.com",
    referrer: "https://google.com"
  }
}
```

## 🔒 Security and Permissions

### Cloud Functions Only
- All analytics data is processed server-side
- Client applications cannot directly write to Firestore
- Data validation and sanitization handled by Cloud Functions
- No direct Firestore access for analytics collections

### Required Cloud Functions
Ensure these functions are deployed:
```bash
firebase deploy --only functions
```

Functions:
- `trackAnalytics` - Track individual events
- `createAnalyticsSession` - Create user sessions
- `endAnalyticsSession` - End user sessions

## 🚀 Quick Start Implementation

### 1. Basic Setup
```javascript
import { AnalyticsProvider } from '@disruptive-spaces/shared/providers/AnalyticsProvider';
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';

function App() {
  return (
    <AnalyticsProvider>
      <YourMainComponent />
    </AnalyticsProvider>
  );
}

function YourMainComponent() {
  const { track, isReady } = useAnalytics('your-space-id');
  
  useEffect(() => {
    if (isReady) {
      console.log('Analytics ready!');
    }
  }, [isReady]);
  
  return <YourUI />;
}
```

### 2. Custom Event Tracking
```javascript
function CustomEventExample() {
  const { track } = useAnalytics('space-id');
  
  const trackCustomAction = async () => {
    await track('custom_action', {
      category: 'user_interaction',
      action: 'feature_used',
      label: 'advanced_feature',
      value: 1,
      customData: {
        feature_id: 'feature_123',
        user_level: 'premium'
      }
    });
  };
  
  return (
    <button onClick={trackCustomAction}>
      Use Advanced Feature
    </button>
  );
}
```

### 3. Modal Tracking
```javascript
function ModalExample() {
  const { trackModal } = useAnalytics('space-id');
  
  const handleModalOpen = () => {
    trackModal('settings_modal', 'open', {
      trigger: 'header_button',
      user_action: 'settings_access'
    });
  };
  
  return (
    <button onClick={handleModalOpen}>
      Open Settings
    </button>
  );
}
```

## 📈 Analytics Query Examples

### Query All Portal Events
```javascript
import { 
  getAllPortalAnalytics, 
  getPortalAnalytics, 
  getPortalNavigationAnalytics 
} from '@disruptive-spaces/shared/firebase/analyticsFirestore';

async function loadPortalData(spaceId) {
  try {
    // Get all portal events
    const allEvents = await getAllPortalAnalytics(spaceId, {
      limitResults: 50
    });
    
    // Get portal clicks only
    const clicks = await getPortalAnalytics(spaceId, {
      limitResults: 25
    });
    
    // Get portal navigations only
    const navigations = await getPortalNavigationAnalytics(spaceId, {
      limitResults: 25
    });
    
    console.log('Portal Analytics:', {
      allEvents,
      clicks,
      navigations
    });
  } catch (error) {
    console.error('Error loading portal data:', error);
  }
}
```

### Query Video Play Events
```javascript
import { trackVideoPlayEvent } from '@disruptive-spaces/shared/firebase/analyticsFirestore';

async function trackVideoInteraction(spaceId, sessionId, userId, videoData) {
  try {
    const eventId = await trackVideoPlayEvent(spaceId, sessionId, userId, {
      videoId: videoData.gameObjectName,
      videoUrl: videoData.url,
      videoTitle: videoData.title,
      duration: videoData.duration,
      quality: videoData.quality
    });
    
    console.log('Video event tracked:', eventId);
  } catch (error) {
    console.error('Error tracking video event:', error);
  }
}
```

## 🔧 Debugging and Troubleshooting

### Enable Debug Logging
```javascript
const { track, isReady } = useAnalytics('space-id', {
  enableDebugLogs: true
});
```

### Check Analytics Status
```javascript
function AnalyticsStatus() {
  const { isReady, isTracking, sessionId } = useAnalytics('space-id');
  
  return (
    <div>
      <p>Analytics Ready: {isReady ? '✅' : '❌'}</p>
      <p>Tracking Active: {isTracking ? '✅' : '❌'}</p>
      <p>Session ID: {sessionId || 'No session'}</p>
    </div>
  );
}
```

### Common Issues
1. **500 Errors**: Ensure Cloud Functions are deployed
2. **No Data**: Check user authentication
3. **Duplicates**: Client-side deduplication is handled automatically
4. **Permissions**: Analytics data is server-only, no client access

## 📱 Portal Analytics Deep Dive

### Portal Event Data Structure
```javascript
// Portal Click Event
{
  eventType: "unity_portal_click",
  category: "navigation",
  portalId: "portal_SpaceA_SpaceB_123456789",
  targetSpaceId: "SpaceB",
  targetSpaceName: "Cinema Space", // Fetched from Firestore
  sourceSpaceId: "SpaceA",
  isEditMode: true,
  timestamp: "2024-01-15T10:30:00Z"
}

// Portal Navigation Event
{
  eventType: "unity_portal_navigate",
  category: "navigation",
  portalId: "portal_SpaceA_SpaceB_123456789",
  targetSpaceId: "SpaceB",
  targetSpaceName: "Cinema Space", // Fetched from Firestore
  sourceSpaceId: "SpaceA",
  isEditMode: false,
  navigationType: "direct" | "confirmed",
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Portal Analytics Functions
```javascript
// Get analytics for a specific portal
const portalAnalytics = getPortalSpecificAnalytics('portal_id');
console.log({
  clicks: portalAnalytics.clicks,
  navigations: portalAnalytics.navigations,
  totalEvents: portalAnalytics.totalEvents,
  lastActivity: portalAnalytics.lastActivity
});

// Get most popular portals
const popularPortals = getPopularPortals();
popularPortals.forEach(portal => {
  console.log(`${portal.portalId}: ${portal.totalEvents} events`);
  console.log(`Target: ${portal.targetSpaceId}`);
  console.log(`Clicks: ${portal.clicks}, Navigations: ${portal.navigations}`);
});
```

## 🎯 Best Practices

### 1. Session Management
- Analytics sessions auto-start when user enters space
- Sessions auto-end when user leaves or page closes
- One session per space visit

### 2. Event Tracking
- Use appropriate categories for events
- Include relevant context data
- Avoid tracking PII (personally identifiable information)

### 3. Performance
- Analytics hooks are optimized for performance
- Client-side deduplication prevents spam
- Server-side validation ensures data integrity

### 4. Data Privacy
- Only track necessary user interactions
- All data is anonymized by user ID
- No sensitive information in event data

## 📋 Checklist for Implementation

- [ ] Deploy Cloud Functions (`firebase deploy --only functions`)
- [ ] Update Firestore rules if needed
- [ ] Import analytics hooks in your components
- [ ] Initialize analytics with space ID
- [ ] Test event tracking in development
- [ ] Enable debug logging for troubleshooting
- [ ] Verify data appears in Firebase console
- [ ] Implement custom event tracking as needed
- [ ] Add portal analytics if using portals
- [ ] Test session management (enter/exit events)

## 🆘 Support and Resources

### Firebase Console
- View analytics data: `Firebase Console > Firestore > spaces/{spaceId}/analyticsEvents`
- Check sessions: `Firebase Console > Firestore > spaces/{spaceId}/analyticsSessions`
- Monitor functions: `Firebase Console > Functions > Logs`

### Debugging Commands
```bash
# Check Cloud Functions logs
firebase functions:log

# Deploy functions only
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

---

**📝 Note**: This analytics system is designed for Unity WebGL metaverse applications and requires the Cloud Functions to be deployed for proper operation. All analytics data is processed server-side for security and data integrity. 