/**
 * Firebase initialization and configuration.
 * @module firebase
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * Firebase configuration interface.
 */
interface FirebaseConfig {
  apiKey: string | null;
  authDomain: string | null;
  projectId: string | null;
  storageBucket: string | null;
  messagingSenderId: string | null;
  appId: string | null;
}

/**
 * Environment variable check structure.
 */
interface EnvVarCheck {
  key: string;
  value: string | undefined;
}

// Check if required environment variables are available
const requiredEnvVars: EnvVarCheck[] = [
  { key: 'VITE_FIREBASE_API_KEY', value: import.meta.env.VITE_FIREBASE_API_KEY },
  { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN },
  { key: 'VITE_FIREBASE_PROJECT_ID', value: import.meta.env.VITE_FIREBASE_PROJECT_ID },
  { key: 'VITE_FIREBASE_STORAGE_BUCKET', value: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET },
  { key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', value: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID },
  { key: 'VITE_FIREBASE_APP_ID', value: import.meta.env.VITE_FIREBASE_APP_ID },
];

// Check for missing environment variables
const missingEnvVars = requiredEnvVars.filter((env) => !env.value);

// Firebase configuration
// SECURITY: Fallback values only used in PRODUCTION builds where env vars aren't available
const firebaseConfig: FirebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    (!import.meta.env.DEV ? 'AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU' : null),
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (!import.meta.env.DEV ? 'disruptive-metaverse.firebaseapp.com' : null),
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    (!import.meta.env.DEV ? 'disruptive-metaverse' : null),
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (!import.meta.env.DEV ? 'disruptive-metaverse.appspot.com' : null),
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    (!import.meta.env.DEV ? '294433070603' : null),
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    (!import.meta.env.DEV ? '1:294433070603:web:136cddd196eea9614fb10e' : null),
};

// Validate required config values
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  const errorMessage =
    'CRITICAL: Missing required Firebase configuration. In development, set environment variables.';
  Logger.error(errorMessage);
  console.error(errorMessage);
  throw new Error('Missing required Firebase configuration');
}

// Log configuration status
if (missingEnvVars.length > 0 && !import.meta.env.DEV) {
  Logger.log('Firebase: Using fallback configuration for production build');
} else if (missingEnvVars.length > 0 && import.meta.env.DEV) {
  Logger.error('Firebase: Missing environment variables in development mode');
  throw new Error(
    `Missing required environment variables in development: ${missingEnvVars.map((e) => e.key).join(', ')}`
  );
} else {
  Logger.log('Firebase: Initializing with environment configuration');
}

// Initialize Firebase instances
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

try {
  app = initializeApp(firebaseConfig as { [key: string]: string });
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
  Logger.log('Firebase initialized successfully');
} catch (error) {
  Logger.error('Failed to initialize Firebase:', error);
  console.error('Failed to initialize Firebase:', error);

  if (import.meta.env.DEV) {
    throw error;
  }

  // Fallback for production - create with defaults
  app = initializeApp(firebaseConfig as { [key: string]: string });
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
}

export default app;
export { auth, db, functions };
export type { FirebaseConfig };
