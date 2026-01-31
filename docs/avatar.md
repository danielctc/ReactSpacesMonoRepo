# Avatar System Documentation

Custom Firestore-based avatar collection system replacing ReadyPlayerMe (RPM).

## Overview

Admins upload GLB + PNG pairs to the `avatars` Firestore collection. Users select from available avatars in the AvatarModal. Selected avatars sync to Unity via the existing `AvatarUrlFromReact` event.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  AvatarModal    │────▶│  avatarsFirestore │────▶│  Firestore  │
│  (User Select)  │     │  (CRUD Ops)       │     │  avatars/   │
└─────────────────┘     └──────────────────┘     └─────────────┘
         │                                              │
         │                                              │
         ▼                                              ▼
┌─────────────────┐                           ┌─────────────────┐
│ updateUserAvatar│                           │ Firebase Storage│
│ (userFirestore) │                           │ avatars/collection/
└─────────────────┘                           └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Unity WebGL     │
│ (AvatarUrlFromReact)
└─────────────────┘
```

## Firestore Schema

### Collection: `avatars`

```javascript
{
  id: string,              // Document ID (auto-generated)
  name: string,            // "Business Professional"
  glbUrl: string,          // Firebase Storage URL to GLB
  thumbnailUrl: string,    // Firebase Storage URL to PNG
  category: string,        // "default" | "professional" | "casual" | "fantasy" | "custom"
  sortOrder: number,       // For UI ordering
  isActive: boolean,       // Enable/disable without deletion
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### User Document Fields (in `users/{uid}`)

```javascript
{
  // ... existing fields
  avatarId: string,           // Reference to avatars collection
  avatarUrl: string,          // GLB URL for Unity
  avatarThumbnailUrl: string, // PNG thumbnail for UI display
  rpmURL: string,             // Legacy (kept for backwards compatibility)
}
```

## Storage Structure

```
avatars/
├── collection/                    # New avatar collection
│   └── {avatarId}/
│       ├── model.glb              # 3D model
│       └── thumbnail.png          # Portrait thumbnail
├── defaults/                      # Existing default avatars
│   └── {id}.glb
└── {userId}/                      # User-specific uploads
    └── avatar.glb
```

## Security Rules

```javascript
match /avatars/{avatarId} {
  allow read: if true;           // Anyone can browse avatars
  allow write: if isDisruptiveAdmin();  // Only admins can manage
}
```

## Key Files

| File                                                     | Purpose                                |
| -------------------------------------------------------- | -------------------------------------- |
| `packages/shared/firebase/avatarsFirestore.js`           | CRUD operations for avatars collection |
| `packages/shared/firebase/userFirestore.js`              | `updateUserAvatar()` function          |
| `packages/webgl/src/components/AvatarModal.jsx`          | User avatar selection UI               |
| `packages/webgl/src/components/AvatarAdminPanel.jsx`     | Admin upload/manage UI                 |
| `packages/webgl/src/components/ProfileButton.jsx`        | Profile avatar display                 |
| `packages/webgl/src/components/chat/ChatMessageList.jsx` | Chat avatar display                    |

## Usage

### For Admins: Upload Avatars

1. Open SpaceManageModal (gear icon in space)
2. Navigate to "Avatars" tab
3. Upload GLB file + PNG thumbnail
4. Enter avatar name and category
5. Click "Upload Avatar"

### For Users: Select Avatar

1. Click profile avatar in top-right corner
2. Browse available avatars in modal
3. Click avatar to select
4. Avatar updates in Unity and profile picture

## API Reference

### avatarsFirestore.js

```javascript
// Fetch all active avatars
const avatars = await getAllAvatars();

// Fetch single avatar
const avatar = await getAvatarById(avatarId);

// Admin: Create avatar
const avatar = await createAvatar({
  name: 'Business Pro',
  glbUrl: 'https://...',
  thumbnailUrl: 'https://...',
  category: 'professional',
});

// Admin: Upload assets and create document
const avatar = await uploadAvatarCollectionAssets(glbFile, pngFile, {
  name: 'New Avatar',
  category: 'casual',
});

// Admin: Update avatar
await updateAvatar(avatarId, { name: 'Updated Name' });

// Admin: Soft delete (hide from users)
await deleteAvatar(avatarId);
```

### userFirestore.js

```javascript
// Update user's selected avatar
await updateUserAvatar(userId, avatarId, glbUrl, thumbnailUrl);
```

## Unity Integration

The avatar system sends GLB URLs to Unity via the existing event system:

```javascript
sendUnityEvent('AvatarUrlFromReact', { url: avatar.glbUrl });
```

Unity receives and loads the GLB model. No changes required on Unity side.

## Backwards Compatibility

- Existing users with `rpmURL` continue to work via fallback logic
- Profile displays check `avatarThumbnailUrl` first, then fall back to RPM URL conversion
- The `rpmURL` field is kept in sync with `avatarUrl` for legacy support

## Thumbnail Fallback Chain

```javascript
// 1. Prefer avatarThumbnailUrl (new system)
if (profile.avatarThumbnailUrl) return profile.avatarThumbnailUrl;

// 2. Fallback to RPM URL conversion (legacy)
if (profile.rpmURL) {
  return profile.rpmURL.replace('.glb', '.png?scene=fullbody-portrait-closeupfront&w=640&q=75');
}

// 3. Return null (show initials)
return null;
```

## Seeding Default Avatars

To migrate existing default avatars to the new collection:

1. Generate PNG thumbnails for each existing GLB
2. Upload to Firebase Storage at `avatars/collection/{id}/`
3. Create Firestore documents with existing Storage URLs

## Deployment

1. Deploy Firestore rules:

   ```bash
   npm run deploy:rules
   ```

2. Upload initial avatars via admin panel

3. Deploy updated frontend:
   ```bash
   npm run deploy
   ```
