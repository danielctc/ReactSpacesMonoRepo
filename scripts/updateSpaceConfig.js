/**
 * Script to update space configuration in Firestore with Unity build URLs
 * 
 * Usage:
 * 1. Add your Firebase config below
 * 2. Update the unityBuildUrls object with your actual Unity build URLs
 * 3. Run: node scripts/updateSpaceConfig.js <spaceID>
 */

// Add your Firebase configuration here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Update these URLs with your actual Unity build URLs
const unityBuildUrls = {
  loaderUrl: "https://example.com/Build/WebGL.loader.js",
  dataUrl: "https://example.com/Build/WebGL.data",
  frameworkUrl: "https://example.com/Build/WebGL.framework.js",
  codeUrl: "https://example.com/Build/WebGL.wasm"
};

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc } = require('firebase/firestore');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateSpaceConfig(spaceID) {
  try {
    console.log(`Updating configuration for space: ${spaceID}`);
    
    // Get the space document from Firestore
    const spaceRef = doc(db, "spaces", spaceID);
    const spaceDoc = await getDoc(spaceRef);
    
    if (!spaceDoc.exists()) {
      console.error(`Space with ID ${spaceID} does not exist in Firestore.`);
      return;
    }
    
    const spaceData = spaceDoc.data();
    console.log("Current space data:", spaceData);
    
    // Update the space document with Unity build URLs
    await updateDoc(spaceRef, unityBuildUrls);
    
    console.log(`\nSpace ${spaceID} updated successfully with Unity build URLs.`);
    console.log("Updated URLs:", unityBuildUrls);
    
    // Verify the update
    const updatedDoc = await getDoc(spaceRef);
    const updatedData = updatedDoc.data();
    
    // Check if all URLs are now present
    const requiredUrls = ['loaderUrl', 'dataUrl', 'frameworkUrl', 'codeUrl'];
    const missingUrls = [];
    
    requiredUrls.forEach(url => {
      if (!updatedData[url]) {
        missingUrls.push(url);
      }
    });
    
    if (missingUrls.length > 0) {
      console.error(`\nWarning: Some URLs are still missing: ${missingUrls.join(', ')}`);
    } else {
      console.log("\nAll required Unity build URLs are now present in the space document.");
    }
    
  } catch (error) {
    console.error("Error updating space configuration:", error);
  }
}

// Get spaceID from command line arguments
const spaceID = process.argv[2] || 'default';
updateSpaceConfig(spaceID); 