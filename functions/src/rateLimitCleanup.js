const { onSchedule } = require('firebase-functions/v2/scheduler');
const { cleanupRateLimits } = require('./rateLimiter');

/**
 * Scheduled function to clean up old rate limit documents
 * Runs daily at 3 AM UTC to remove rate limits older than 1 hour
 */
exports.cleanupRateLimits = onSchedule('0 3 * * *', async (event) => {
  console.log('Starting rate limit cleanup...');
  
  try {
    const deletedCount = await cleanupRateLimits();
    console.log(`Rate limit cleanup completed. Deleted ${deletedCount} documents.`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error during rate limit cleanup:', error);
    throw error;
  }
});


