/**
 * Script to test that permission overrides are working correctly
 * 
 * Usage:
 * 1. Make sure you're logged in to Firebase
 * 2. Run: node scripts/testPermissions.js <spaceID>
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Firebase configuration - replace with your own
const firebaseConfig = {
  apiKey: "AIzaSyDXYLnJ-Ihkd-z2JIgqJcEp2Kre9OLg5uc",
  authDomain: "disruptive-metaverse.firebaseapp.com",
  projectId: "disruptive-metaverse",
  storageBucket: "disruptive-metaverse.appspot.com",
  messagingSenderId: "1045488207955",
  appId: "1:1045488207955:web:c7e9c9c6c7e8e8c8c8c8c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Import permission functions
const userPermissions = require('../packages/shared/firebase/userPermissions');
const userPermissionsOverride = require('../packages/shared/firebase/userPermissionsOverride');

async function testPermissions(spaceID) {
  console.log(`Testing permissions for space: ${spaceID}`);
  
  try {
    // Sign in anonymously
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log(`Signed in anonymously as: ${user.uid}`);
    
    // Test space access
    console.log('\nTesting space access:');
    const hasAccess = await userPermissions.hasSpaceAccess(user, spaceID);
    console.log(`- hasSpaceAccess: ${hasAccess}`);
    
    // Test space owner
    console.log('\nTesting space owner:');
    const isOwner = await userPermissions.isSpaceOwner(user, spaceID);
    console.log(`- isSpaceOwner: ${isOwner}`);
    
    // Test space host
    console.log('\nTesting space host:');
    const isHost = await userPermissions.isSpaceHost(user, spaceID);
    console.log(`- isSpaceHost: ${isHost}`);
    
    // Test group membership
    console.log('\nTesting group membership:');
    const inGroup = await userPermissions.userBelongsToGroup(user.uid, 'users');
    console.log(`- userBelongsToGroup (users): ${inGroup}`);
    
    // Test space group membership
    console.log('\nTesting space group membership:');
    const inSpaceGroup = await userPermissions.userBelongsToSpaceGroup(user.uid, spaceID);
    console.log(`- userBelongsToSpaceGroup: ${inSpaceGroup}`);
    
    // Test Firestore access
    console.log('\nTesting Firestore access:');
    try {
      const spaceRef = doc(db, 'spaces', spaceID);
      const spaceDoc = await getDoc(spaceRef);
      
      if (spaceDoc.exists()) {
        console.log(`- Successfully read space document: ${spaceID}`);
        console.log(`- Space name: ${spaceDoc.data().name || 'No name'}`);
      } else {
        console.log(`- Space document does not exist: ${spaceID}`);
      }
    } catch (error) {
      console.error(`- Error accessing Firestore: ${error.message}`);
    }
    
  } catch (error) {
    console.error(`Error in test: ${error.message}`);
  }
}

// Get spaceID from command line arguments
const spaceID = process.argv[2] || 'default';
testPermissions(spaceID); 