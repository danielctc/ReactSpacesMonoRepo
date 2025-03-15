/**
 * Script to check if the background URL is properly set in Firestore for a given space
 * 
 * Usage:
 * 1. Make sure you're logged in to Firebase
 * 2. Run: node scripts/checkBackgroundUrl.js <spaceID>
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
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

async function checkBackgroundUrl(spaceID) {
  console.log(`Checking background URL for space: ${spaceID}`);
  
  try {
    // Get the space document from Firestore
    const spaceRef = doc(db, 'spaces', spaceID);
    const spaceDoc = await getDoc(spaceRef);
    
    if (!spaceDoc.exists()) {
      console.error(`Space document does not exist: ${spaceID}`);
      return;
    }
    
    const spaceData = spaceDoc.data();
    console.log(`Space data retrieved for ${spaceID}:`, spaceData);
    
    // Check if urlLoadingBackground exists
    if (!spaceData.urlLoadingBackground) {
      console.error(`No urlLoadingBackground found for space: ${spaceID}`);
      console.log(`To add a background URL, run the following command:`);
      console.log(`firebase firestore:update spaces/${spaceID} '{"urlLoadingBackground":"gs://disruptive-metaverse.appspot.com/common/images/background.jpg"}'`);
      return;
    }
    
    console.log(`Background URL found: ${spaceData.urlLoadingBackground}`);
    
    // Try to fetch the HTTP URL
    try {
      const httpUrl = await fetchHttpUrlFromGsUrl(spaceData.urlLoadingBackground);
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
      console.log(`To update the background URL, run the following command:`);
      console.log(`firebase firestore:update spaces/${spaceID} '{"urlLoadingBackground":"gs://disruptive-metaverse.appspot.com/common/images/background.jpg"}'`);
    }
    
  } catch (error) {
    console.error(`Error checking background URL: ${error.message}`);
  }
}

// Get spaceID from command line arguments
const spaceID = process.argv[2] || 'default';
checkBackgroundUrl(spaceID); 