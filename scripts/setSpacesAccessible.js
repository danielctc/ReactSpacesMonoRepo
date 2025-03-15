/**
 * Script to set all spaces to be publicly accessible by default
 * 
 * Usage:
 * 1. Set your email and password below
 * 2. Run the script with: node scripts/setSpacesAccessible.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQPFdMIhw9QvNfEh0z1Lv1_GGFGwJbz-8",
  authDomain: "disruptive-metaverse.firebaseapp.com",
  projectId: "disruptive-metaverse",
  storageBucket: "disruptive-metaverse.appspot.com",
  messagingSenderId: "294433070603",
  appId: "1:294433070603:web:a9c9e0c5f2b6b3a5a9a9a9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Admin credentials - Replace with your admin email and password
const adminEmail = "andrew@disruptive.live";
const adminPassword = "test123"; // This is just a placeholder - replace with your actual password

async function setSpacesAccessible() {
  try {
    // Sign in with admin credentials
    console.log(`Signing in as ${adminEmail}...`);
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('Successfully signed in');
    
    console.log('Starting to update spaces...');
    
    // Get all spaces from Firestore
    const spacesCollection = collection(db, 'spaces');
    const spacesSnapshot = await getDocs(spacesCollection);
    
    console.log(`Found ${spacesSnapshot.size} spaces to process`);
    
    // Track statistics
    let updatedCount = 0;
    let alreadySetCount = 0;
    let errorCount = 0;
    
    // Process each space
    for (const spaceDoc of spacesSnapshot.docs) {
      const spaceId = spaceDoc.id;
      const spaceData = spaceDoc.data();
      
      console.log(`Processing space: ${spaceId}`);
      console.log(`Current accessibleToAllUsers value: ${spaceData.accessibleToAllUsers}`);
      
      try {
        // Check if accessibleToAllUsers is already set to true
        if (spaceData.accessibleToAllUsers === true) {
          console.log(`Space ${spaceId} is already accessible to all users`);
          alreadySetCount++;
          continue;
        }
        
        // Update the space to be accessible to all users
        const spaceRef = doc(db, 'spaces', spaceId);
        await updateDoc(spaceRef, {
          accessibleToAllUsers: true,
          updatedAt: new Date().toISOString()
        });
        
        // Verify the update
        const updatedSpaceSnap = await getDoc(spaceRef);
        const updatedSpaceData = updatedSpaceSnap.data();
        
        if (updatedSpaceData.accessibleToAllUsers === true) {
          console.log(`Successfully updated space ${spaceId} to be accessible to all users`);
          updatedCount++;
        } else {
          console.error(`Failed to update space ${spaceId} - verification failed`);
          errorCount++;
        }
      } catch (spaceError) {
        console.error(`Error updating space ${spaceId}:`, spaceError);
        errorCount++;
      }
    }
    
    // Log summary
    console.log('\nUpdate Summary:');
    console.log(`Total spaces processed: ${spacesSnapshot.size}`);
    console.log(`Spaces already accessible: ${alreadySetCount}`);
    console.log(`Spaces successfully updated: ${updatedCount}`);
    console.log(`Spaces with errors: ${errorCount}`);
    
    console.log('\nAll spaces have been processed.');
  } catch (error) {
    console.error('Error updating spaces:', error);
  }
}

// Run the function
setSpacesAccessible()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 