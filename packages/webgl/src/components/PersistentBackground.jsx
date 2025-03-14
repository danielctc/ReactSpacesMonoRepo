import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';

/**
 * PersistentBackground - A component that ensures the background image stays visible
 * until the player is instantiated, regardless of Unity's loading state.
 * 
 * This component uses direct DOM manipulation to ensure the background stays on top
 * of everything else in the application.
 */
const PersistentBackground = ({ backgroundUrl = null, containerRef }) => {
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [currentBackgroundUrl, setCurrentBackgroundUrl] = useState(backgroundUrl);
  const bgElementRef = useRef(null);
  const overlayElementRef = useRef(null);

  // Listen for background updates
  useEffect(() => {
    const handleBackgroundUpdate = (event) => {
      const { backgroundUrl: newBackgroundUrl } = event.detail;
      setCurrentBackgroundUrl(newBackgroundUrl);
      
      // Update the background element if it exists
      if (bgElementRef.current) {
        if (newBackgroundUrl) {
          bgElementRef.current.style.backgroundImage = `url('${newBackgroundUrl}')`;
          bgElementRef.current.style.display = 'block';
          if (overlayElementRef.current) {
            overlayElementRef.current.style.display = 'block';
          }
        } else {
          bgElementRef.current.style.display = 'none';
          if (overlayElementRef.current) {
            overlayElementRef.current.style.display = 'none';
          }
        }
      }
    };

    window.addEventListener('SpaceBackgroundUpdated', handleBackgroundUpdate);
    
    return () => {
      window.removeEventListener('SpaceBackgroundUpdated', handleBackgroundUpdate);
    };
  }, []);

  // Update background when backgroundUrl prop changes
  useEffect(() => {
    setCurrentBackgroundUrl(backgroundUrl);
    
    if (bgElementRef.current && backgroundUrl !== currentBackgroundUrl) {
      bgElementRef.current.style.backgroundImage = `url('${backgroundUrl}')`;
    }
  }, [backgroundUrl]);

  useEffect(() => {
    // Wait for the container ref to be available
    if (!containerRef || !containerRef.current) return;
    
    // Create a div element for the background
    const bgElement = document.createElement('div');
    bgElementRef.current = bgElement;
    
    // Set styles for the background element
    Object.assign(bgElement.style, {
      position: 'absolute', // absolute position within the container
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundImage: currentBackgroundUrl ? `url('${currentBackgroundUrl}')` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      zIndex: '20', // High enough to be above Unity canvas but below the loader
      transition: 'opacity 1.5s ease-in-out',
      pointerEvents: 'none', // Allow clicking through the background
      display: currentBackgroundUrl ? 'block' : 'none',
    });
    
    // Create a frosted glass overlay
    const overlayElement = document.createElement('div');
    overlayElementRef.current = overlayElement;
    
    // Set styles for the frosted glass overlay
    Object.assign(overlayElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backdropFilter: 'blur(5px)',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      zIndex: '21', // Just above the background image
      transition: 'opacity 1.5s ease-in-out',
      pointerEvents: 'none',
      display: currentBackgroundUrl ? 'block' : 'none',
    });
    
    // Add the background element to the container
    containerRef.current.appendChild(bgElement);
    
    // Add the overlay element to the container
    containerRef.current.appendChild(overlayElement);
    
    // Function to handle player instantiation
    const handlePlayerInstantiated = () => {
      console.log("PersistentBackground: Player instantiated event received");
      setIsPlayerInstantiated(true);
      
      // Fade out the background and overlay
      bgElement.style.opacity = '0';
      overlayElement.style.opacity = '0';
      
      // Remove the elements after the transition
      setTimeout(() => {
        if (containerRef.current && containerRef.current.contains(bgElement)) {
          containerRef.current.removeChild(bgElement);
        }
        if (containerRef.current && containerRef.current.contains(overlayElement)) {
          containerRef.current.removeChild(overlayElement);
        }
      }, 1500); // Match the transition duration
    };
    
    // Check if player is already instantiated
    if (window.isPlayerInstantiated) {
      console.log("PersistentBackground: Player was already instantiated");
      handlePlayerInstantiated();
    } else {
      // Subscribe to player instantiated event
      eventBus.subscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
      
      // Also listen for the custom event
      const customEventHandler = () => handlePlayerInstantiated();
      window.addEventListener("PlayerInstantiated", customEventHandler);
      
      // Force hide after a timeout (failsafe)
      const timeoutId = setTimeout(() => {
        console.log("PersistentBackground: Forcing background removal after timeout");
        handlePlayerInstantiated();
      }, 30000); // 30 seconds max
      
      return () => {
        // Clean up event listeners
        eventBus.unsubscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
        window.removeEventListener("PlayerInstantiated", customEventHandler);
        clearTimeout(timeoutId);
        
        // Remove the elements if they still exist
        if (containerRef.current && containerRef.current.contains(bgElement)) {
          containerRef.current.removeChild(bgElement);
        }
        if (containerRef.current && containerRef.current.contains(overlayElement)) {
          containerRef.current.removeChild(overlayElement);
        }
      };
    }
  }, [currentBackgroundUrl, containerRef]); // Run when the component mounts or backgroundUrl/containerRef changes

  // This component doesn't render anything visible
  return null;
};

PersistentBackground.propTypes = {
  backgroundUrl: PropTypes.string,
  containerRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element)
  })
};

export default PersistentBackground; 