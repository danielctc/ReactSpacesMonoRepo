import { useState, useEffect } from 'react';
import { useListenForUnityEvent } from './core/useListenForUnityEvent';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useUnityOnCatalogueItemClick = () => {
  const [clickedItem, setClickedItem] = useState(null);
  const listenToUnityMessage = useListenForUnityEvent();

  useEffect(() => {
    Logger.log('Setting up seating hotspot click listener...');
    
    const handleItemClick = async (data) => {
      Logger.log('🔵 Seating hotspot click event received from Unity:', data);
      try {
        // Parse the data if it's a string
        const itemData = typeof data === 'string' ? JSON.parse(data) : data;
        Logger.log('🔵 Parsed Unity click data:', itemData);

        // Get the space ID from the hotspot ID (format: item_SpacesMetaverse_SDK_1748373421253)
        const parts = itemData.hotspotId.split('_');
        if (parts.length >= 3) {
          // Get the full space ID (e.g., "SpacesMetaverse_SDK")
          const spaceId = parts.slice(1, -1).join('_');
          Logger.log('🔵 Extracted spaceId:', spaceId);
          
          // Fetch the current item data from Firebase
          const itemRef = doc(db, 'spaces', spaceId, 'catalogue', itemData.hotspotId);
          Logger.log('🔵 Fetching from Firebase path:', `spaces/${spaceId}/catalogue/${itemData.hotspotId}`);
          
          const itemDoc = await getDoc(itemRef);
          
          if (itemDoc.exists()) {
            const firebaseData = itemDoc.data();
            Logger.log('🔵 Fetched Firebase data:', firebaseData);
            
            // Log the position data specifically
            Logger.log('🔵 Firebase position:', firebaseData.position);
            Logger.log('🔵 Unity position:', itemData.position);
            
            // Combine the Unity click data with Firebase data
            const combinedData = {
              ...itemData,
              position: firebaseData.position || itemData.position,
              rotation: firebaseData.rotation || itemData.rotation,
              scale: firebaseData.scale || itemData.scale
            };
            
            Logger.log('🔵 Combined data being set:', combinedData);
            setClickedItem(combinedData);
          } else {
            Logger.warn('❌ Item not found in Firebase:', itemData.hotspotId);
            setClickedItem(itemData);
          }
        } else {
          Logger.error('❌ Invalid hotspot ID format:', itemData.hotspotId);
          setClickedItem(itemData);
        }
      } catch (error) {
        Logger.error('❌ Error handling seating hotspot click:', error, 'Data:', data);
      }
    };

    // Listen for Unity messages using the core event system
    const unsubscribe = listenToUnityMessage("SeatingHotspotClicked", handleItemClick);
    
    return () => {
      Logger.log('Cleaning up seating hotspot click listener');
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [listenToUnityMessage]);

  const clearClickedItem = () => {
    Logger.log('Clearing clicked item state');
    setClickedItem(null);
  };

  return { clickedItem, clearClickedItem };
}; 