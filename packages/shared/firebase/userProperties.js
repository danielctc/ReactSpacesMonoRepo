/**
 * User Fields Configuration
 * 
 * This script defines an array of user properties representing various user information fields.
 * This defines a subset of properties that will be available via the user context.
 * We filter out a lot of properties from firebase auth that we don't want/need.
 * It also allows us to match this with Unity c# data class so we can use this data as a Type in Unity.
 * 
 * This should match with FirebaseUSerData in Unity
 * /Assets/Spaces SDK/Scripts/React/EventsManagement/DataClasses/FirebaseUserData.cs
 * 
 * @module userFields
 * @exports userProperties
 */

/**
 * PUBLIC user properties - safe to expose in social metaverse
 * These fields are visible to all users (including guests) for social features
 * 
 * ⚠️ NEVER add sensitive data here (email, phone, address, etc.)
 * ⚠️ Sensitive data should ONLY go in users/{userId}/private collection
 */
export const userProperties = [
    // Firebase Auth fields (PUBLIC ONLY)
    //---------------------
    // "uid",  // Available via auth.uid, not needed here
    // "accessToken",  // Never expose
    // "email",  // ❌ REMOVED - Now in private subcollection only
    // "displayName",
    // "photoURL",

    // Firestore User collection Fields (PUBLIC - Social Profile)
    //-----------------------------------
    "name",
    "rpmURL",  // Avatar URL
    "Nickname",  // Display name
    "username",  // @username for mentions/searches
    "created_on",
    "height_cm",  // Avatar customization
    // Add more PUBLIC fields as needed.

    "companyName",  // Professional info (optional)
    "firstName",  // Public name
    "lastName",  // Public name
    // "accessCode",  // Don't expose
    "linkedInProfile",  // Public professional link
    
    // User groups for permissions
    "groups",
    
    // Guest user fields
    "isGuest",
    "guestSpaceId",
    "guestSessionStart",
];

/**
 * PRIVATE user properties - stored in users/{userId}/private/data
 * Only accessible by the user themselves and admins
 */
export const privateUserProperties = [
    "email",  // ✅ Private
    "emailVerified",  // ✅ Private
    "phoneNumber",  // ✅ Private (if you add this)
    "dateOfBirth",  // ✅ Private (if you add this)
    // Add other sensitive fields here
];