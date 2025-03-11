//src/firebase/firebase.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import { getFirestore } from "firebase/firestore"; // Import Firestore

// Debug environment variables
console.log('Environment variables check:');
console.log('VITE_FIREBASE_API_KEY exists:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log('import.meta.env:', import.meta.env);

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration with fallbacks
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "disruptive-metaverse.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "disruptive-metaverse",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "disruptive-metaverse.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "294433070603",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:294433070603:web:136cddd196eea9614fb10e"
};

// Log the configuration being used
console.log('Firebase config being used:', {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : 'missing',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId ? 'present' : 'missing',
    appId: firebaseConfig.appId ? 'present' : 'missing'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export default app;
export { auth, db };