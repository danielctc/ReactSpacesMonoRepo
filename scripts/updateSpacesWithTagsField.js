/**
 * Add tags field to existing spaces in Firestore
 * 
 * This script adds a 'tags' array field to all existing space documents
 * that don't already have one. Run this once to migrate existing spaces
 * to support the tagging system.
 */

// Import Firebase
require('./firebaseAdmin');

// Make a custom simplified version of the Logger
const Logger = {
  log: (...args) => console.log('[LOG]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// Import the Firestore functions
const { collection, getDocs, updateDoc, doc } = require('firebase/firestore');
const { db } = require('./firebaseAdmin');

/**
 * Update spaces to add the tags field
 */
const updateSpacesWithTagsField = async () => {
  Logger.log('Starting to update spaces with tags field...');
  
  try {
    // Get all spaces
    const spacesRef = collection(db, 'spaces');
    const spacesSnapshot = await getDocs(spacesRef);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each space
    for (const spaceDoc of spacesSnapshot.docs) {
      const spaceData = spaceDoc.data();
      
      // Check if the space already has a tags field
      if ('tags' in spaceData) {
        Logger.log(`Space ${spaceDoc.id} already has a tags field, skipping.`);
        skippedCount++;
        continue;
      }
      
      // Add an empty tags array
      const spaceRef = doc(db, 'spaces', spaceDoc.id);
      await updateDoc(spaceRef, {
        tags: []
      });
      
      Logger.log(`Updated space ${spaceDoc.id} with empty tags array.`);
      updatedCount++;
    }
    
    Logger.log(`Finished updating spaces. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
    return { updatedCount, skippedCount };
  } catch (error) {
    Logger.error('Error updating spaces with tags field:', error);
    throw error;
  }
};

// Run the update
updateSpacesWithTagsField()
  .then(({ updatedCount, skippedCount }) => {
    console.log(`Space update complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Space update failed:', error);
    process.exit(1);
  }); 