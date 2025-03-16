# Firebase Email Verification

This document explains how to reinstate the Firebase email verification that has been temporarily disabled.

## Current Status

Email verification has been temporarily disabled in the codebase to allow for easier testing and development. This means:

1. New users will not receive verification emails when they register
2. Users can sign in without verifying their email addresses
3. The `emailVerified` field is automatically set to `true` for all new users

## How to Reinstate Email Verification

To reinstate the email verification functionality, follow these steps:

### Step 1: Update UserProvider.jsx

In the file `packages/shared/providers/UserProvider.jsx`, find the `signIn` function and uncomment the email verification check:

```javascript
const signIn = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // TEMPORARILY DISABLED: Email verification check
        /*
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
            // Send another verification email if needed
            await sendEmailVerification(userCredential.user);
            Logger.log('UserProvider: Verification email sent again to:', email);
            throw new Error('Please verify your email before signing in. A new verification email has been sent.');
        }
        */
        
        // Remove the comment markers above to reinstate email verification
```

Remove the comment markers (`/*` and `*/`) to reinstate the email verification check.

### Step 2: Update userFirestore.js

In the file `packages/shared/firebase/userFirestore.js`, find the `registerUser` function and uncomment the email verification sending:

```javascript
// Function to register a new user and store additional profile data
const registerUser = async (email, password, additionalData) => {
    try {
        Logger.log('userFirestore: Registering new user with email:', email);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // TEMPORARILY DISABLED: Email verification
        /*
        // Send email verification
        await sendEmailVerification(user);
        Logger.log('userFirestore: Verification email sent to:', email);
        */

        // Add default groups array with 'users' group
        const userData = { 
            email: user.email, 
            createdAt: new Date(), 
            groups: ['users'], // Add default 'users' group
            emailVerified: true, // TEMPORARILY SET TO TRUE to bypass verification
            ...additionalData 
        };
```

1. Remove the comment markers (`/*` and `*/`) to reinstate sending verification emails
2. Change `emailVerified: true` to `emailVerified: false` to properly track verification status

### Step 3: Test the Verification Flow

After making these changes:

1. Register a new user to ensure they receive a verification email
2. Try to sign in with an unverified email to ensure the verification check works
3. Verify the email by clicking the link in the verification email
4. Sign in with the verified email to ensure the flow works end-to-end

## Customizing Verification Emails

Firebase allows you to customize the verification email template through the Firebase Console:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Authentication → Templates (in the sidebar)
4. Select "Email verification" from the template dropdown
5. Customize the email subject, sender name, email body, and redirect URL

## Additional Notes

- The `resendVerificationEmail` function in `UserProvider.jsx` can be used to resend verification emails if needed
- The `emailVerified` property on the user object reflects the verification status from Firebase
- You can check a user's verification status with `user.emailVerified` in your components

## Troubleshooting

If verification emails are not being received:

1. Check spam/junk folders
2. Verify that the Firebase project has email sending enabled
3. Ensure the Firebase project is on the Blaze plan if sending a large volume of emails
4. Check Firebase Authentication logs for any errors 