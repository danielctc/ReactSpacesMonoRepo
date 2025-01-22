//src/firebase/firebase.js

// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth'; // Import Firebase Auth
import { getFirestore } from "firebase/firestore"; // Import Firestore

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU",
    authDomain: "disruptive-metaverse.firebaseapp.com",
    projectId: "disruptive-metaverse",
    storageBucket: "disruptive-metaverse.appspot.com",
    messagingSenderId: "294433070603",
    appId: "1:294433070603:web:136cddd196eea9614fb10e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

export default app;
export { auth, db };