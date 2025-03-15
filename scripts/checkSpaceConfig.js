/**
 * Script to check space configuration in Firestore
 * 
 * Usage:
 * 1. Add your Firebase config below
 * 2. Run: node scripts/checkSpaceConfig.js <spaceID>
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

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSpaceConfig(spaceID) {
  try {
    console.log(`Checking configuration for space: ${spaceID}`);
    
    // Get the space document from Firestore
    const spaceRef = doc(db, "spaces", spaceID);
    const spaceDoc = await getDoc(spaceRef);
    
    if (!spaceDoc.exists()) {
      console.error(`Space with ID ${spaceID} does not exist in Firestore.`);
      return;
    }
    
    const spaceData = spaceDoc.data();
    console.log("Space data:", spaceData);
    
    // Check for required Unity build URLs
    const requiredUrls = ['loaderUrl', 'dataUrl', 'frameworkUrl', 'codeUrl'];
    const missingUrls = [];
    
    requiredUrls.forEach(url => {
      if (!spaceData[url]) {
        missingUrls.push(url);
      }
    });
    
    if (missingUrls.length > 0) {
      console.error(`Missing required Unity build URLs: ${missingUrls.join(', ')}`);
      console.log("\nTo fix this issue, update the space document with the missing URLs:");
      console.log(`
Example Unity build URLs:
{
  "loaderUrl": "https://example.com/Build/WebGL.loader.js",
  "dataUrl": "https://example.com/Build/WebGL.data",
  "frameworkUrl": "https://example.com/Build/WebGL.framework.js",
  "codeUrl": "https://example.com/Build/WebGL.wasm"
}
      `);
    } else {
      console.log("All required Unity build URLs are present.");
    }
    
    // Check for other important fields
    const otherFields = ['accessibleToAllUsers', 'urlLoadingBackground'];
    const missingFields = [];
    
    otherFields.forEach(field => {
      if (spaceData[field] === undefined) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      console.log(`\nMissing recommended fields: ${missingFields.join(', ')}`);
    } else {
      console.log("\nAll recommended fields are present.");
    }
    
  } catch (error) {
    console.error("Error checking space configuration:", error);
  }
}

// Get spaceID from command line arguments
const spaceID = process.argv[2] || 'default';
checkSpaceConfig(spaceID); 