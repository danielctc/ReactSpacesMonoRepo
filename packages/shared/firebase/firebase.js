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

// Check for missing environment variables and log warnings
const missingEnvVars = requiredEnvVars.filter(env => !env.value);
if (missingEnvVars.length > 0) {
  const missingKeys = missingEnvVars.map(env => env.key).join(', ');
  const warningMessage = `Missing environment variables: ${missingKeys}. Using fallback values. For production, it's recommended to set up your .env file.`;
  Logger.warn(warningMessage);
  console.warn(warningMessage);
}

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "disruptive-metaverse.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "disruptive-metaverse",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "disruptive-metaverse.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "294433070603",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:294433070603:web:136cddd196eea9614fb10e"
};

// Log which config we're using (but don't log the actual keys)
const isUsingFallback = missingEnvVars.length > 0;
Logger.log(`Firebase initializing with ${isUsingFallback ? 'fallback' : 'environment'} configuration`);

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