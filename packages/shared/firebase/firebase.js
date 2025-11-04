//src/firebase/firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import { getFirestore } from "firebase/firestore"; // Import Firestore
import { getFunctions } from 'firebase/functions'; // Import Firebase Functions
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Check if required environment variables are available
const requiredEnvVars = [
  { key: 'VITE_FIREBASE_API_KEY', value: import.meta.env.VITE_FIREBASE_API_KEY },
  { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN },
  { key: 'VITE_FIREBASE_PROJECT_ID', value: import.meta.env.VITE_FIREBASE_PROJECT_ID },
  { key: 'VITE_FIREBASE_STORAGE_BUCKET', value: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET },
  { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', value: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID },
  { key: 'VITE_FIREBASE_APP_ID', value: import.meta.env.VITE_FIREBASE_APP_ID },
];

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter(env => !env.value);

// Your web app's Firebase configuration
// SECURITY: Fallback values only used in PRODUCTION builds where env vars aren't available
// Development always requires env vars for security
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 
            (!import.meta.env.DEV ? "AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU" : null),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 
                (!import.meta.env.DEV ? "disruptive-metaverse.firebaseapp.com" : null),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 
               (!import.meta.env.DEV ? "disruptive-metaverse" : null),
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 
                   (!import.meta.env.DEV ? "disruptive-metaverse.appspot.com" : null),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 
                       (!import.meta.env.DEV ? "294433070603" : null),
    appId: import.meta.env.VITE_FIREBASE_APP_ID || 
           (!import.meta.env.DEV ? "1:294433070603:web:136cddd196eea9614fb10e" : null)
};

// Validate that we have all required config values
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  const errorMessage = `CRITICAL: Missing required Firebase configuration. In development, set environment variables. In production builds, config should be available.`;
  Logger.error(errorMessage);
  console.error(errorMessage);
  throw new Error('Missing required Firebase configuration');
}

// Log which config we're using
if (missingEnvVars.length > 0 && !import.meta.env.DEV) {
  // Info level - this is expected for static production builds
  Logger.log('Firebase: Using fallback configuration for production build (this is normal)');
} else if (missingEnvVars.length > 0 && import.meta.env.DEV) {
  Logger.error('Firebase: Missing environment variables in development mode');
  throw new Error(`Missing required environment variables in development: ${missingEnvVars.map(e => e.key).join(', ')}`);
} else {
  Logger.log('Firebase: Initializing with environment configuration');
}

// Initialize Firebase
let app, auth, db, functions;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase Auth
  auth = getAuth(app);
  
  // Initialize Firestore
  db = getFirestore(app);
  
  // Initialize Firebase Functions
  functions = getFunctions(app);
  
  Logger.log('Firebase initialized successfully');
} catch (error) {
  Logger.error("Failed to initialize Firebase:", error);
  console.error("Failed to initialize Firebase:", error);
  
  // Re-throw in development but not in production
  if (import.meta.env.DEV) {
    throw error;
  }
}

export default app;
export { auth, db, functions };