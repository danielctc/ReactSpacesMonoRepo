/**
 * Firebase Admin Initialization for Scripts
 * 
 * This script provides Firebase initialization for Node.js scripts.
 * It uses the same Firebase configuration as the main app but in CommonJS format.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU",
  authDomain: "disruptive-metaverse.firebaseapp.com",
  projectId: "disruptive-metaverse",
  storageBucket: "disruptive-metaverse.appspot.com",
  messagingSenderId: "294433070603",
  appId: "1:294433070603:web:136cddd196eea9614fb10e"
};

// Initialize Firebase
const initializeFirebase = () => {
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('Firebase initialized successfully.');
  return { app, db };
};

// Export the initialized Firebase services
const { app, db } = initializeFirebase();

module.exports = {
  app,
  db
}; 