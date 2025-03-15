/**
 * Utility script to check the accessibleToAllUsers field for all spaces
 * 
 * Usage:
 * node scripts/checkSpacesAccessibility.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase configuration - replace with your own config
const firebaseConfig = {
  // Your Firebase config here
  // This will be replaced with the actual config when running the script
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Checks the accessibleToAllUsers field for all spaces
 */
async function checkSpacesAccessibility() {
  try {
    console.log('Checking accessibleToAllUsers field for all spaces...');
    
    // Get all spaces
    const spacesCollection = collection(db, 'spaces');
    const spacesSnapshot = await getDocs(spacesCollection);
    
    if (spacesSnapshot.empty) {
      console.log('No spaces found in the database.');
      return;
    }
    
    console.log(`Found ${spacesSnapshot.size} spaces.`);
    
    // Count spaces with accessibleToAllUsers field
    let spacesWithField = 0;
    let spacesWithoutField = 0;
    let spacesWithFieldTrue = 0;
    let spacesWithFieldFalse = 0;
    
    // Check each space
    spacesSnapshot.forEach((spaceDoc) => {
      const spaceId = spaceDoc.id;
      const spaceData = spaceDoc.data();
      
      if (spaceData.accessibleToAllUsers !== undefined) {
        spacesWithField++;
        if (spaceData.accessibleToAllUsers === true) {
          spacesWithFieldTrue++;
          console.log(`Space ${spaceId}: accessibleToAllUsers = true`);
        } else {
          spacesWithFieldFalse++;
          console.log(`Space ${spaceId}: accessibleToAllUsers = false`);
        }
      } else {
        spacesWithoutField++;
        console.log(`Space ${spaceId}: accessibleToAllUsers field not set`);
      }
    });
    
    // Print summary
    console.log('\nSummary:');
    console.log(`Total spaces: ${spacesSnapshot.size}`);
    console.log(`Spaces with accessibleToAllUsers field: ${spacesWithField} (${(spacesWithField / spacesSnapshot.size * 100).toFixed(2)}%)`);
    console.log(`Spaces without accessibleToAllUsers field: ${spacesWithoutField} (${(spacesWithoutField / spacesSnapshot.size * 100).toFixed(2)}%)`);
    console.log(`Spaces with accessibleToAllUsers = true: ${spacesWithFieldTrue} (${(spacesWithFieldTrue / spacesSnapshot.size * 100).toFixed(2)}%)`);
    console.log(`Spaces with accessibleToAllUsers = false: ${spacesWithFieldFalse} (${(spacesWithFieldFalse / spacesSnapshot.size * 100).toFixed(2)}%)`);
    
  } catch (error) {
    console.error('Error checking spaces:', error);
  }
}

// Run the script
checkSpacesAccessibility()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 