const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { checkRateLimit } = require('./rateLimiter');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Helper function to check if user is a disruptive admin
 * Matches the pattern used in Firestore security rules
 * 
 * @param {object} auth - The request.auth object from Cloud Function
 * @returns {boolean} - True if user has disruptiveAdmin group
 */
function isDisruptiveAdmin(auth) {
  if (!auth || !auth.token) {
    return false;
  }
  const groups = auth.token.groups || [];
  return groups.includes('disruptiveAdmin');
}

/**
 * Cloud Function to clean up chat messages older than 24 hours
 * Runs daily at 2 AM UTC
 */
const cleanupOldChatMessages = onSchedule('0 2 * * *', async (event) => {
    console.log('Starting chat message cleanup...');
    
    try {
      // Calculate 24 hours ago
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      console.log(`Deleting messages older than: ${twentyFourHoursAgo.toISOString()}`);
      
      // Get all spaces
      const spacesSnapshot = await db.collection('spaces').get();
      
      let totalDeleted = 0;
      let spacesProcessed = 0;
      
      // Process each space
      for (const spaceDoc of spacesSnapshot.docs) {
        const spaceId = spaceDoc.id;
        console.log(`Processing space: ${spaceId}`);
        
        try {
          // Query old messages in this space
          const oldMessagesQuery = db
            .collection(`spaces/${spaceId}/chatMessages`)
            .where('timestamp', '<', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo));
          
          const oldMessagesSnapshot = await oldMessagesQuery.get();
          
          if (oldMessagesSnapshot.empty) {
            console.log(`No old messages found in space: ${spaceId}`);
            continue;
          }
          
          console.log(`Found ${oldMessagesSnapshot.size} old messages in space: ${spaceId}`);
          
          // Delete messages in batches (Firestore batch limit is 500)
          const batchSize = 500;
          const batches = [];
          
          for (let i = 0; i < oldMessagesSnapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = oldMessagesSnapshot.docs.slice(i, i + batchSize);
            
            batchDocs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            batches.push(batch);
          }
          
          // Execute all batches
          for (const batch of batches) {
            await batch.commit();
          }
          
          totalDeleted += oldMessagesSnapshot.size;
          spacesProcessed++;
          
          console.log(`Deleted ${oldMessagesSnapshot.size} messages from space: ${spaceId}`);
          
        } catch (spaceError) {
          console.error(`Error processing space ${spaceId}:`, spaceError);
          // Continue with other spaces even if one fails
        }
      }
      
      console.log(`Chat cleanup completed successfully!`);
      console.log(`- Spaces processed: ${spacesProcessed}`);
      console.log(`- Total messages deleted: ${totalDeleted}`);
      
      return {
        success: true,
        spacesProcessed,
        totalDeleted,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error during chat cleanup:', error);
      throw error;
    }
  });

/**
 * Manual trigger function for testing or emergency cleanup
 * Can be called via HTTP request
 */
const manualChatCleanup = onCall(async (request) => {
  // Only allow authenticated admin users to trigger manual cleanup
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Verify user has admin privileges (matches Firestore rules pattern)
  if (!isDisruptiveAdmin(request.auth)) {
    console.warn(`Unauthorized manual cleanup attempt by user: ${request.auth.uid}`);
    throw new HttpsError(
      'permission-denied', 
      'Only administrators can trigger manual chat cleanup. This incident has been logged.'
    );
  }

  // Rate limiting: Even admins are rate limited (5 requests per hour)
  await checkRateLimit(request.auth.uid, 'chatCleanup');
  
  console.log(`Manual chat cleanup triggered by admin: ${request.auth.uid}`);
  
  try {
    // Use the same cleanup logic as the scheduled function
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const spacesSnapshot = await db.collection('spaces').get();
    
    let totalDeleted = 0;
    let spacesProcessed = 0;
    
    for (const spaceDoc of spacesSnapshot.docs) {
      const spaceId = spaceDoc.id;
      
      const oldMessagesQuery = db
        .collection(`spaces/${spaceId}/chatMessages`)
        .where('timestamp', '<', admin.firestore.Timestamp.fromDate(twentyFourHoursAgo));
      
      const oldMessagesSnapshot = await oldMessagesQuery.get();
      
      if (!oldMessagesSnapshot.empty) {
        const batchSize = 500;
        for (let i = 0; i < oldMessagesSnapshot.docs.length; i += batchSize) {
          const batch = db.batch();
          const batchDocs = oldMessagesSnapshot.docs.slice(i, i + batchSize);
          
          batchDocs.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
        }
        
        totalDeleted += oldMessagesSnapshot.size;
      }
      
      spacesProcessed++;
    }
    
    return {
      success: true,
      spacesProcessed,
      totalDeleted,
      timestamp: new Date().toISOString(),
      triggeredBy: request.auth.uid
    };
    
  } catch (error) {
    console.error('Manual chat cleanup error:', error);
    throw new HttpsError('internal', 'Manual cleanup failed', error.message);
  }
});

module.exports = {
  cleanupOldChatMessages,
  manualChatCleanup
};

