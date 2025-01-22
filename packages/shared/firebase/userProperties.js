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

export const userProperties = [
    // Firebase Auth fields
    //---------------------
    // "uid",
    // "accessToken",
    "email",
    // "displayName",
    // "photoURL",

    // Firestore User collection Fields
    //-----------------------------------
    "name",
    "rpmURL",
    "Nickname",
    "created_on",
    "height_cm",
    // Add more fields as needed.

    "companyName",
    "firstName",
    "lastName",
    // "accessCode",
    "linkedInProfile",


];