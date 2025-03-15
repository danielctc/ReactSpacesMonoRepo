/**
 * Script to update the background URL in Firestore for a given space
 * 
 * Usage:
 * 1. Make sure you're logged in to Firebase
 * 2. Run: node scripts/updateBackgroundUrl.js <spaceID> <backgroundUrl>
 * 
 * Example:
 * node scripts/updateBackgroundUrl.js default gs://disruptive-metaverse.appspot.com/common/images/background.jpg
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');
const { getStorage, ref, getDownloadURL } = require('firebase/storage');

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
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Fetches the HTTP URL for a given gs:// URL from Firebase Storage.
 * 
 * @param {string} gsUrl The gs:// URL to the file in Firebase Storage.
 * @returns {Promise<string>} A promise that resolves with the HTTP URL to the file.
 */
async function fetchHttpUrlFromGsUrl(gsUrl) {
  // Convert the gs:// URL to a Storage reference
  const storageRef = ref(storage, gsUrl);

  // Use getDownloadURL to fetch the HTTP URL
  try {
    const httpUrl = await getDownloadURL(storageRef);
    return httpUrl;
  } catch (error) {
    console.error('Failed to fetch HTTP URL from gs:// URL:', error);
    throw error;
  }
}

async function updateBackgroundUrl(spaceID, backgroundUrl) {
  console.log(`Updating background URL for space: ${spaceID}`);
  console.log(`New background URL: ${backgroundUrl}`);
  
  try {
    // Get the space document from Firestore
    const spaceRef = doc(db, 'spaces', spaceID);
    const spaceDoc = await getDoc(spaceRef);
    
    if (!spaceDoc.exists()) {
      console.error(`Space document does not exist: ${spaceID}`);
      return;
    }
    
    const spaceData = spaceDoc.data();
    console.log(`Current space data for ${spaceID}:`, spaceData);
    
    // Update the urlLoadingBackground field
    await updateDoc(spaceRef, {
      urlLoadingBackground: backgroundUrl
    });
    
    console.log(`Successfully updated background URL for space: ${spaceID}`);
    
    // Verify the update
    const updatedDoc = await getDoc(spaceRef);
    const updatedData = updatedDoc.data();
    console.log(`Updated space data:`, updatedData);
    
    // Try to fetch the HTTP URL to verify it works
    try {
      const httpUrl = await fetchHttpUrlFromGsUrl(backgroundUrl);
      console.log(`Successfully fetched HTTP URL: ${httpUrl}`);
      
      // Test if the URL is accessible
      console.log(`Testing if the URL is accessible...`);
      const response = await fetch(httpUrl, { method: 'HEAD' });
      if (response.ok) {
        console.log(`URL is accessible (status ${response.status})`);
      } else {
        console.error(`URL is not accessible (status ${response.status})`);
      }
    } catch (error) {
      console.error(`Error fetching HTTP URL: ${error.message}`);
      console.log(`The background URL might be invalid or inaccessible.`);
    }
    
  } catch (error) {
    console.error(`Error updating background URL: ${error.message}`);
  }
}

// Get spaceID and backgroundUrl from command line arguments
const spaceID = process.argv[2];
const backgroundUrl = process.argv[3];

if (!spaceID || !backgroundUrl) {
  console.error('Usage: node scripts/updateBackgroundUrl.js <spaceID> <backgroundUrl>');
  console.error('Example: node scripts/updateBackgroundUrl.js default gs://disruptive-metaverse.appspot.com/common/images/background.jpg');
  process.exit(1);
}

updateBackgroundUrl(spaceID, backgroundUrl); 