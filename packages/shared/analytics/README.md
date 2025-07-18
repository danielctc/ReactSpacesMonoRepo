# Analytics System for Unity WebGL Metaverse

A comprehensive analytics system for tracking user interactions and events in the Unity WebGL metaverse application.

## Overview

The analytics system provides comprehensive tracking for both Unity-side (3D world interactions) and React-side (UI interactions) events. All data is stored in Firebase Firestore under each space's collection for easy querying and analysis.

**🔐 Security First**: This system uses Cloud Functions for secure, server-side analytics processing. **You must deploy the Cloud Functions before analytics will work.**

## Quick Start

1. **Deploy Cloud Functions:**
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

2. **Analytics will automatically start tracking** when users interact with your Unity WebGL metaverse.

3. **Query data** from your Firebase console at: `spaces/{spaceId}/analyticsEvents`

## Architecture

### Firebase Structure

```
spaces/
  {spaceId}/
    analyticsSessions/
      {sessionId}/
        userId: string
        spaceId: string
        startTime: timestamp
        endTime: timestamp
        eventCount: number
        lastActivityTime: timestamp
        isActive: boolean
        metadata: object
    
    analyticsEvents/
      {eventId}/
        sessionId: string
        eventType: string
        timestamp: timestamp
        userId: string
        category: string
        data: object
        source: 'unity' | 'react'
```

### Components

1. **Firebase Analytics Service** (`analyticsFirestore.js`)
   - Core Firebase operations for sessions and events
   - Event type constants and categories
   - Specialized functions for common events

2. **Analytics Hook** (`useAnalytics.js`)
   - React hook for analytics functionality
   - Session management
   - Event tracking with automatic context

3. **Unity Analytics Hook** (`useUnityAnalytics.js`)
   - Automatic Unity event listener setup
   - Maps Unity events to analytics events
   - Handles Unity-specific event data

4. **Analytics Provider** (`AnalyticsProvider.jsx`)
   - React context provider for analytics
   - Global analytics state management
   - Convenience functions for common events

## Usage

### Basic Setup

```javascript
// In your WebGL app
import { useUnityAnalytics } from './hooks/unityEvents/useUnityAnalytics';

// In your component
const MyComponent = ({ spaceId }) => {
  // Analytics will automatically start tracking Unity events
  useUnityAnalytics(spaceId, {
    enableDebugLogs: true
  });
  
  return <div>Your content</div>;
};
```

### Using Analytics Hook Directly

```javascript
import { useAnalytics } from '@disruptive-spaces/shared/hooks/useAnalytics';
import { ANALYTICS_EVENT_TYPES, ANALYTICS_CATEGORIES } from '@disruptive-spaces/shared/firebase/analyticsFirestore';

const MyComponent = ({ spaceId }) => {
  const { track, trackReactEvent, isReady } = useAnalytics(spaceId);
  
  const handleButtonClick = async () => {
    await trackReactEvent(ANALYTICS_EVENT_TYPES.REACT.UI_CLICK, {
      category: ANALYTICS_CATEGORIES.UI_INTERACTION,
      buttonName: 'my-button',
      userId: user.uid
    });
  };
  
  return (
    <button onClick={handleButtonClick}>
      Track This Click
    </button>
  );
};
```

### Using Analytics Provider

```javascript
import { AnalyticsProvider, useAnalyticsContext } from '@disruptive-spaces/shared/providers/AnalyticsProvider';

// Wrap your app
const App = () => (
  <AnalyticsProvider spaceId="my-space" options={{ enableDebugLogs: true }}>
    <MyTrackedComponent />
  </AnalyticsProvider>
);

// Use in components
const MyTrackedComponent = () => {
  const { trackUserAction, trackModal } = useAnalyticsContext();
  
  const handleAction = () => {
    trackUserAction('button_click', {
      buttonId: 'save-button',
      location: 'settings-modal'
    });
  };
  
  return <button onClick={handleAction}>Save</button>;
};
```

## Event Types

### Unity Events (Automatically Tracked)
- `unity_video_play` - Video playback events
- `unity_portal_click` - Portal interactions in edit mode
- `unity_portal_navigate` - Portal navigation in play mode
- `unity_media_screen_click` - Media screen interactions
- `unity_nameplate_click` - Player nameplate clicks
- `unity_object_interact` - General object interactions
- `unity_player_spawn` - Player spawning events
- `unity_space_ready` - Space loading completion

### React Events (Manual Tracking)
- `react_modal_open/close` - Modal interactions
- `react_ui_click` - UI element clicks
- `react_user_login/logout` - Authentication events
- `react_space_enter/exit` - Space navigation
- `react_chat_message` - Chat interactions
- `react_upload_start/complete` - File uploads

## Categories

- `navigation` - Space and portal navigation
- `media_interaction` - Video and media interactions
- `social_interaction` - Player-to-player interactions
- `ui_interaction` - React UI interactions
- `system_event` - System-level events
- `user_behavior` - General user behavior
- `content_interaction` - Content-related interactions
- `performance` - Performance metrics

## Examples

### Video Click Tracking

Video clicks are automatically tracked when using the `useUnityOnPlayVideo` hook:

```javascript
// This is already integrated in useUnityOnPlayVideo.js
const handleVideoPlay = (videoData) => {
  // Video starts playing
  setVideoUrl(video.url);
  
  // Analytics automatically tracks this event
  trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.VIDEO_PLAY, {
    category: ANALYTICS_CATEGORIES.MEDIA_INTERACTION,
    videoId: gameObjectName,
    videoUrl: video.url,
    videoTitle: video.title || video.name || gameObjectName,
    isEditMode: false
  });
};
```

### Portal Click Tracking

Portal clicks are automatically tracked when using the `useUnityOnPortalClick` hook:

```javascript
// This is already integrated in useUnityOnPortalClick.js
const handlePortalClick = (portalData) => {
  // Portal click detected
  setClickedPortal(portalData);
  
  // Analytics automatically tracks this event
  trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.PORTAL_CLICK, {
    category: ANALYTICS_CATEGORIES.NAVIGATION,
    portalId: portalData.portalId,
    targetSpaceId: targetSpaceId,
    sourceSpaceId: spaceID,
    isEditMode: true
  });
};
```

### Portal Navigation Tracking

Portal navigation is tracked when users actually confirm navigation to a new space:

```javascript
// This is integrated in WebGLRenderer.jsx and useUnityOnPortalNavigate.js
const handlePortalNavigate = (portalData) => {
  // Track when user confirms navigation
  trackUnityEvent(ANALYTICS_EVENT_TYPES.UNITY.PORTAL_NAVIGATE, {
    category: ANALYTICS_CATEGORIES.NAVIGATION,
    portalId: portalData.portalId,
    targetSpaceId: targetSpaceId,
    sourceSpaceId: spaceID,
    navigationType: 'confirmed', // or 'direct'
    isEditMode: false
  });
};
```

### Modal Tracking

```javascript
import { useAnalyticsContext } from '@disruptive-spaces/shared/providers/AnalyticsProvider';

const MyModal = ({ isOpen, onClose }) => {
  const { trackModal } = useAnalyticsContext();
  
  useEffect(() => {
    if (isOpen) {
      trackModal('open', 'settings-modal', {
        source: 'header-button',
        timestamp: new Date().toISOString()
      });
    }
  }, [isOpen, trackModal]);
  
  const handleClose = () => {
    trackModal('close', 'settings-modal', {
      duration: Date.now() - openTime
    });
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Modal content */}
    </Modal>
  );
};
```

### Custom Event Tracking

```javascript
const { track } = useAnalytics(spaceId);

// Track custom events
await track('custom_event', {
  category: ANALYTICS_CATEGORIES.USER_BEHAVIOR,
  customData: {
    feature: 'advanced-settings',
    value: 'enabled'
  },
  timestamp: new Date().toISOString()
});
```

## Querying Analytics Data

### Get Space Analytics

```javascript
import { getSpaceAnalytics, getVideoAnalytics } from '@disruptive-spaces/shared/firebase/analyticsFirestore';

// Get all analytics for a space
const events = await getSpaceAnalytics('my-space-id', {
  limitResults: 100
});

// Get video analytics specifically
const videoEvents = await getVideoAnalytics('my-space-id', {
  limitResults: 50
});

// Get analytics for a specific user
const userEvents = await getSpaceAnalytics('my-space-id', {
  userId: 'user-123',
  limitResults: 100
});
```

### Get Sessions

```javascript
import { getSpaceAnalyticsSessions } from '@disruptive-spaces/shared/firebase/analyticsFirestore';

const sessions = await getSpaceAnalyticsSessions('my-space-id', {
  isActive: true,
  limitResults: 50
});
```

## Configuration

### Debug Mode

Enable debug logging to see analytics events in the console:

```javascript
const { enableDebugMode } = useAnalyticsContext();
enableDebugMode(); // Enable debug logs

// Or set during initialization
useAnalytics(spaceId, {
  enableDebugLogs: true
});
```

### Disable Analytics

```javascript
const { disableAnalytics } = useAnalyticsContext();
disableAnalytics(); // Stop tracking events
```

## Security Implementation

### 🔐 Secure Cloud Functions Approach

The analytics system uses **Cloud Functions** for secure, server-side data validation and storage:

#### **Benefits:**
- ✅ **Server-side validation** - Prevents malicious data
- ✅ **User authentication** - Verified server-side
- ✅ **Data sanitization** - All data cleaned before storage
- ✅ **Permission control** - Users can only write their own data
- ✅ **Tamper-proof** - Analytics data cannot be manipulated by users

#### **Setup Cloud Functions:**

1. **Deploy Functions:**
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

2. **Functions Available:**
   - `trackAnalytics` - Track events securely
   - `createAnalyticsSession` - Create session securely
   - `endAnalyticsSession` - End session securely

### 📊 Data Validation

**Cloud Functions validate:**
- ✅ User authentication
- ✅ Event type whitelist
- ✅ User ID matches authenticated user
- ✅ Data structure and types
- ✅ Timestamp integrity
- ✅ Session ownership verification

## Features

### Automatic Features
- ✅ Session management with automatic cleanup
- ✅ Unity event auto-tracking
- ✅ Video play tracking
- ✅ Portal interaction tracking
- ✅ Player social interaction tracking
- ✅ Space entry/exit tracking
- ✅ Error handling and retry logic
- ✅ Debug mode for development

### Manual Features
- ✅ Custom event tracking
- ✅ Modal interaction tracking
- ✅ Performance metric tracking
- ✅ Error event tracking
- ✅ UI interaction tracking
- ✅ Batch event tracking

## Implementation Status

All core components are implemented and integrated:

1. ✅ Firebase Analytics Service
2. ✅ Analytics Hook System
3. ✅ Unity Event Analytics Integration
4. ✅ Video Click Tracking Integration
5. ✅ Analytics Provider for Session Management
6. ✅ WebGL Renderer Integration

## Future Enhancements

Potential future features:
- Real-time analytics dashboard
- User journey tracking
- A/B testing framework
- Heat map generation
- Advanced performance monitoring
- Custom alert system
- Data export functionality

## Troubleshooting

### Common Issues

1. **Events not tracking**: Check that analytics session is initialized and user is logged in
2. **Debug logs not showing**: Ensure debug mode is enabled
3. **Unity events not tracked**: Verify Unity analytics hook is properly initialized
4. **Firebase permissions**: Ensure Firestore rules allow writes to analytics collections
5. **Cloud Functions not working**: Check function deployment and authentication

### Debug Information

Enable debug mode to see detailed logs:

```javascript
useAnalytics(spaceId, {
  enableDebugLogs: true
});
```

Look for logs prefixed with:
- `📊 Analytics Provider:` - Provider-level events
- `🎯 Unity Analytics:` - Unity event tracking
- `Analytics session:` - Session management
- `Secure analytics:` - Cloud Functions calls

### Permission Issues

If you see permission errors:

1. **Check user authentication**: Ensure user is logged in
2. **Verify Cloud Functions deployment**: Run `firebase deploy --only functions`
3. **Test with admin user**: Admins have full access for testing

### Security Verification

To verify secure analytics is working:

1. **Check Cloud Functions logs**: 
   ```bash
   firebase functions:log --only trackAnalytics
   ```

2. **Look for server validation**: Events should have `serverValidated: true`

3. **Test with invalid data**: Should be rejected by Cloud Functions

4. **Monitor Firestore**: Data should appear in analytics collections 