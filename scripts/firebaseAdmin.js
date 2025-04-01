/**
 * Firebase Admin Initialization for Scripts
 * 
 * This script provides Firebase initialization for Node.js scripts.
 * It uses environment variables with fallback to hardcoded values.
 */

// Load environment variables from .env file
require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Check for environment variables
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredVars.filter(key => !process.env[key]);
if (missingVars.length > 0) {
  console.warn(`Missing environment variables: ${missingVars.join(', ')}. Using fallback values.`);
}

// Firebase configuration with fallbacks
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "disruptive-metaverse.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "disruptive-metaverse",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "disruptive-metaverse.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "294433070603",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:294433070603:web:136cddd196eea9614fb10e"
};

// Initialize Firebase
const initializeFirebase = () => {
  const isUsingFallback = missingVars.length > 0;
  console.log(`Initializing Firebase with ${isUsingFallback ? 'fallback' : 'environment'} configuration...`);
  
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Firebase initialized successfully.');
    return { app, db };
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
};

// Export the initialized Firebase services
let app, db;
try {
  const result = initializeFirebase();
  app = result.app;
  db = result.db;
} catch (error) {
  console.error('Could not initialize Firebase. Scripts may not work properly:', error);
}

module.exports = {
  app,
  db
}; 