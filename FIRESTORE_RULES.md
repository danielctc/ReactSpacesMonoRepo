# Firestore Rules Configuration

## Current Setup

The Firestore rules configuration has been **removed** from this project's deployment process to prevent overwriting the rules set by the uploader application.

## Why This Change Was Made

When multiple applications use the same Firebase project, deploying from any application will overwrite the Firestore rules for the entire project. Since the uploader application has specific rules that need to be maintained, we've disabled Firestore rules deployment from this application.

## Original Uploader Firestore Rules

For reference, here are the Firestore rules from the uploader application:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin access to everything
    match /{document=**} {
      allow read, write: if isDisruptiveAdmin();
    }
    
    // Allow users to read and write their own profile records
    match /users/{userId} {
      // Allow users to read and write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // Allow any authenticated user to read any user document
      allow read: if request.auth != null;
      // Allow updates to user documents when updating group memberships
      allow update: if isUpdatingGroups(userId) || isDisruptiveAdmin();
    }
    
    // Allow access to groups based on membership
    match /groups/{groupId} {
      allow read: if isGroupMember(groupId) || isDisruptiveAdmin();
      allow write: if isDisruptiveAdmin();
    }
    
    // Allow access to spaces - more permissive for reading
    match /spaces/{spaceId} {
      // Allow any authenticated user to read spaces
      allow read: if request.auth != null || isSpacePublic(spaceId) || isSpaceAccessibleToAll(spaceId) || isSpaceOwnerOrHost(spaceId) || isDisruptiveAdmin();
      allow write: if isSpaceOwner(spaceId) || isDisruptiveAdmin();
      
      // Allow access to media screens within spaces
      match /mediaScreens/{screenId} {
        allow read: if request.auth != null;
        allow write: if isSpaceOwnerOrHost(spaceId) || isDisruptiveAdmin();
      }
      
      // Allow access to media screen images
      match /mediaScreenImages/{imageId} {
        allow read: if request.auth != null;
        allow write: if isSpaceOwnerOrHost(spaceId) || isDisruptiveAdmin();
      }
      
      // Allow access to media screen thumbnails
      match /mediaScreenThumbnails/{thumbnailId} {
        allow read: if request.auth != null;
        allow write: if isSpaceOwnerOrHost(spaceId) || isDisruptiveAdmin();
      }
    }
    
    // Allow all authenticated users to read WebGL builds
    match /webglBuilds/{buildId} {
      allow read: if request.auth != null;
      allow write: if isDisruptiveAdmin();
    }
    
    // Allow access to chat messages for spaces
    match /chatMessages/{messageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Allow access to media screens collection at root level
    match /mediaScreens/{screenId} {
      allow read: if request.auth != null;
      allow write: if isDisruptiveAdmin();
    }
    
    // Allow access to media screen images collection at root level
    match /mediaScreenImages/{imageId} {
      allow read: if request.auth != null;
      allow write: if isDisruptiveAdmin();
    }
    
    // Allow access to media screen thumbnails collection at root level
    match /mediaScreenThumbnails/{thumbnailId} {
      allow read: if request.auth != null;
      allow write: if isDisruptiveAdmin();
    }
    
    // Helper functions
    function isDisruptiveAdmin() {
      return request.auth != null 
             && request.auth.token.groups != null 
             && request.auth.token.groups.hasAny(['disruptiveAdmin']);
    }
    
    function isGroupMember(groupId) {
      return request.auth != null 
             && request.auth.token.groups != null 
             && request.auth.token.groups.hasAny([groupId]);
    }
    
    function isSpaceOwner(spaceId) {
      return request.auth != null 
             && request.auth.token.groups != null 
             && request.auth.token.groups.hasAny(['space_' + spaceId + '_owners']);
    }
    
    function isSpaceHost(spaceId) {
      return request.auth != null 
             && request.auth.token.groups != null 
             && request.auth.token.groups.hasAny(['space_' + spaceId + '_hosts']);
    }
    
    function isSpaceOwnerOrHost(spaceId) {
      return isSpaceOwner(spaceId) || isSpaceHost(spaceId);
    }
    
    function isSpacePublic(spaceId) {
      return get(/databases/$(database)/documents/spaces/$(spaceId)).data.isPublic == true;
    }
    
    function isSpaceAccessibleToAll(spaceId) {
      return request.auth != null && get(/databases/$(database)/documents/spaces/$(spaceId)).data.accessibleToAllUsers == true;
    }
    
    function isUpdatingGroups(userId) {
      // Allow updates to user documents when only the groups field is being modified
      // This is needed for group membership changes
      return request.auth != null 
             && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['groups']);
    }
  }
}
```

## How to Deploy Firestore Rules

If you need to update the Firestore rules in the future, you should:

1. Make the changes in the uploader application
2. Deploy only the Firestore rules from the uploader application using:
   ```
   firebase deploy --only firestore:rules
   ```

## Restoring Firestore Rules Deployment in This Project

If you want to restore Firestore rules deployment from this project:

1. Edit `firebase.json` to add back the Firestore section:
   ```json
   {
     "firestore": {
       "rules": "firestore.rules",
       "indexes": "firestore.indexes.json"
     },
     "hosting": {
       // existing hosting configuration...
     }
   }
   ```

2. Create or update the `firestore.rules` file with the appropriate rules
3. Deploy with `firebase deploy` or `npm run deploy` 