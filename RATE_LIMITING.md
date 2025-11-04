# Rate Limiting Implementation

This document describes the rate limiting system implemented across the application to prevent abuse and protect resources.

## Overview

Rate limiting has been implemented at two levels:
1. **Server-side (Cloud Functions)**: Firestore-based rate limiting with atomic transactions
2. **Client-side**: localStorage-based rate limiting for immediate feedback

## Server-Side Rate Limiting

### Location
- Implementation: `functions/src/rateLimiter.js`
- Applied in: `analytics.js`, `chatCleanup.js`

### Rate Limit Configuration

| Action Type | Window | Max Requests | Scope |
|-------------|--------|--------------|-------|
| `analytics` | 1 minute | 100 per user | Per user + space |
| `analytics` (resource) | 1 minute | 500 per space | Per space |
| `sessionCreate` | 1 minute | 10 | Per user + space |
| `chatCleanup` | 1 hour | 5 | Per user (admin) |
| `default` | 1 minute | 60 | Per user |

### Usage Example

```javascript
const { checkRateLimit, checkResourceRateLimit } = require('./rateLimiter');

exports.myFunction = onCall(async (request) => {
  // Check user-specific rate limit
  await checkRateLimit(request.auth.uid, 'analytics', spaceId);
  
  // Check resource-specific rate limit
  await checkResourceRateLimit(spaceId, 'analytics');
  
  // ... rest of function
});
```

### How It Works

1. Uses Firestore transactions for atomic read-modify-write operations
2. Stores request timestamps in `rateLimits` collection
3. Filters requests to only count those within the time window
4. Throws `resource-exhausted` error when limit is exceeded
5. Automatically cleans up old rate limit documents daily

### Error Response

When rate limit is exceeded:
```json
{
  "code": "resource-exhausted",
  "message": "Rate limit exceeded. Please wait 45 seconds before trying again. (Limit: 100 requests per 60 seconds)"
}
```

## Client-Side Rate Limiting

### Location
- Implementation: `packages/shared/utils/clientRateLimiter.js`
- Applied in: 
  - `UserProvider.jsx` (guest user creation)
  - `spacesFirestore.js` (file uploads)
  - `mediaScreenFirestore.js` (file uploads)

### Rate Limit Configuration

| Action Type | Window | Max Attempts |
|-------------|--------|--------------|
| `guestUserCreate` | 1 minute | 3 |
| `fileUpload` | 1 minute | 10 |
| `chatMessage` | 10 seconds | 20 |
| `spaceJoin` | 1 minute | 5 |

### Usage Example

```javascript
import { checkClientRateLimit } from '@disruptive-spaces/shared/utils/clientRateLimiter';

const handleAction = async () => {
  // Check rate limit
  const rateLimitCheck = checkClientRateLimit('fileUpload', spaceId);
  
  if (!rateLimitCheck.allowed) {
    console.error(rateLimitCheck.message);
    // Show error to user
    return;
  }
  
  // Proceed with action
  await performAction();
};
```

### How It Works

1. Uses `localStorage` to track request timestamps
2. Filters timestamps to only count recent requests
3. Returns result object with `allowed`, `retryAfter`, and `message`
4. Automatically records new attempts when allowed
5. Data is scoped per user session (browser storage)

### Response Object

```javascript
{
  allowed: false,
  retryAfter: 42,  // seconds
  message: "Too many attempts. Please wait 42 seconds before trying again."
}
```

## Protected Functions

### Cloud Functions

#### Analytics Functions
- `trackAnalytics`: 100 requests/min per user, 500/min per space
- `createAnalyticsSession`: 10 requests/min per user
- `endAnalyticsSession`: 60 requests/min per user

#### Admin Functions
- `manualChatCleanup`: 5 requests/hour (admin only)

### Client-Side Actions

#### User Actions
- Guest user creation: 3 attempts/min per space
- File uploads: 10 uploads/min per space
- Space joins: 5 joins/min (future implementation)
- Chat messages: 20 messages/10sec (future implementation)

## Cleanup

### Automated Cleanup
A scheduled Cloud Function runs daily at 3 AM UTC:
```javascript
exports.cleanupRateLimits = onSchedule('0 3 * * *', ...)
```

This removes rate limit documents older than 1 hour from Firestore.

### Manual Cleanup
You can manually trigger cleanup:
```javascript
const { cleanupRateLimits } = require('./rateLimiter');
const deletedCount = await cleanupRateLimits();
```

## Security Considerations

### Why Two Levels?

1. **Client-side**: Provides immediate feedback, reduces unnecessary server calls
2. **Server-side**: Ultimate authority, cannot be bypassed, protects resources

### Limitations

- **Client-side can be bypassed**: Users can clear localStorage
- **Server-side is authoritative**: Always implement server-side limits
- **Not a replacement for authentication**: Use with proper auth checks

## Monitoring

### Check Rate Limit Status

```javascript
import { getRemainingAttempts } from '@disruptive-spaces/shared/utils/clientRateLimiter';

const remaining = getRemainingAttempts('fileUpload', spaceId);
console.log(`Remaining uploads: ${remaining}`);
```

### Firestore Console

Monitor rate limits in Firestore:
- Collection: `rateLimits`
- Documents contain: userId, actionType, requests[], windowStart

## Customization

### Modify Limits

#### Server-side (`functions/src/rateLimiter.js`)
```javascript
const RATE_LIMITS = {
  myAction: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 50
  }
};
```

#### Client-side (`packages/shared/utils/clientRateLimiter.js`)
```javascript
const RATE_LIMITS = {
  myAction: {
    windowMs: 60 * 1000,  // 1 minute
    maxAttempts: 20
  }
};
```

### Add New Protected Action

1. Add config to `RATE_LIMITS` in appropriate file
2. Call `checkRateLimit()` or `checkClientRateLimit()` before action
3. Handle errors appropriately
4. Update this documentation

## Testing

### Test Rate Limiting

```javascript
// Client-side
import { checkClientRateLimit, clearClientRateLimit } from './clientRateLimiter';

// Simulate multiple attempts
for (let i = 0; i < 5; i++) {
  const result = checkClientRateLimit('fileUpload', 'testSpace');
  console.log(`Attempt ${i + 1}:`, result.allowed);
}

// Clear for testing
clearClientRateLimit('fileUpload', 'testSpace');
```

### Server-side Testing

Deploy functions and use Firebase Emulator:
```bash
firebase emulators:start --only functions
```

## Future Enhancements

1. **IP-based rate limiting** for unauthenticated requests
2. **Dynamic rate limits** based on user tier
3. **Redis integration** for distributed rate limiting
4. **Rate limit analytics dashboard**
5. **Automatic ban system** for repeated violations

## Troubleshooting

### Rate Limit Not Working

1. Check if function is properly imported
2. Verify rate limit config exists
3. Check Firestore rules allow writes to `rateLimits` collection
4. Check Cloud Function logs for errors

### False Positives

1. Verify clock synchronization
2. Check for multiple instances counting separately
3. Review window duration settings

### Performance Issues

1. Implement cleanup if rate limit docs are accumulating
2. Consider increasing cleanup frequency
3. Add indexes on `windowStart` field in Firestore

## Support

For issues or questions:
1. Check Cloud Function logs in Firebase Console
2. Review Firestore `rateLimits` collection
3. Test with Firebase Emulator
4. Check browser console for client-side errors

---

**Last Updated**: October 17, 2025  
**Version**: 1.0.0


