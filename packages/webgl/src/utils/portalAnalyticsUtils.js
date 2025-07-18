import { doc, getDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

/**
 * Fetches portal data from Firestore for analytics purposes
 * @param {string} spaceId - The current space ID
 * @param {string} portalId - The portal ID to fetch
 * @returns {Promise<{targetSpaceId: string|null, targetSpaceName: string|null}>}
 */
export const fetchPortalAnalyticsData = async (spaceId, portalId) => {
  console.log('🔍 fetchPortalAnalyticsData called with:', { spaceId, portalId });
  
  let targetSpaceId = null;
  let targetSpaceName = null;
  
  try {
    if (!spaceId || !portalId) {
      throw new Error(`Invalid parameters: spaceId=${spaceId}, portalId=${portalId}`);
    }
    
    const portalRef = doc(db, 'spaces', spaceId, 'portals', portalId);
    console.log('🔍 Querying Firestore path:', `spaces/${spaceId}/portals/${portalId}`);
    
    const portalDoc = await getDoc(portalRef);
    
    if (portalDoc.exists()) {
      const portalData = portalDoc.data();
      targetSpaceId = portalData.targetSpaceId;
      targetSpaceName = portalData.targetSpaceName;
      console.log('✅ Portal data fetched from Firestore:', { targetSpaceId, targetSpaceName });
    } else {
      console.warn('❌ Portal document not found in Firestore for:', portalId);
      // Fallback to parsing portal ID
      const parts = portalId.split('_');
      if (parts.length >= 3) {
        targetSpaceId = parts[2];
        console.log('🔄 Fallback: Parsed targetSpaceId from portalId:', targetSpaceId);
      }
    }
  } catch (firestoreError) {
    console.error('❌ Error fetching portal data from Firestore:', firestoreError);
    // Fallback to parsing portal ID
    const parts = portalId.split('_');
    if (parts.length >= 3) {
      targetSpaceId = parts[2];
      console.log('🔄 Fallback: Parsed targetSpaceId from portalId:', targetSpaceId);
    }
  }
  
  const result = { targetSpaceId, targetSpaceName };
  console.log('🔍 fetchPortalAnalyticsData returning:', result);
  return result;
}; 