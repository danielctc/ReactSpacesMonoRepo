import { useState, useEffect } from 'react';
import { useListenForUnityEvent } from './core/useListenForUnityEvent';

export const useUnityOnPortalClick = () => {
  const [clickedPortal, setClickedPortal] = useState(null);
  const listenToUnityMessage = useListenForUnityEvent();

  useEffect(() => {
    console.log('Setting up portal click listener...');
    
    const handlePortalClick = (data) => {
      console.log('Portal click event received:', data);
      try {
        // Parse the data if it's a string
        const portalData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('Parsed portal data:', portalData);
        setClickedPortal(portalData);
      } catch (error) {
        console.error('Error parsing portal click data:', error, 'Data:', data);
      }
    };

    // Listen for Unity messages using the core event system
    const unsubscribe = listenToUnityMessage("PortalClicked", handlePortalClick);
    
    return () => {
      console.log('Cleaning up portal click listener');
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [listenToUnityMessage]);

  const clearClickedPortal = () => {
    console.log('Clearing clicked portal state');
    setClickedPortal(null);
  };

  return { clickedPortal, clearClickedPortal };
}; 