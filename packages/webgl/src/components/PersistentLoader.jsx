import React, { useEffect, useState, useRef } from 'react';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import PropTypes from 'prop-types';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { useUnity } from '../providers/UnityProvider';

/**
 * PersistentLoader - A component that displays loading progress within the Unity canvas container
 * and stays visible until the player is instantiated.
 */
const PersistentLoader = ({ containerRef }) => {
  const { spaceID } = useUnity();
  const [isFirstSceneLoaded, setIsFirstSceneLoaded] = useState(false);
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Initialising World');
  const [spaceLogo, setSpaceLogo] = useState(null);
  const loaderRef = useRef(null);
  const logoRef = useRef(null);
  const logoContainerRef = useRef(null);

  // Fetch space logo when component mounts
  useEffect(() => {
    const fetchSpaceLogo = async () => {
      if (spaceID) {
        try {
          const spaceData = await getSpaceItem(spaceID);
          if (spaceData && spaceData.logoUrl) {
            setSpaceLogo(spaceData.logoUrl);
          }
        } catch (error) {
          console.error('Error fetching space logo:', error);
        }
      }
    };

    fetchSpaceLogo();
  }, [spaceID]);

  // Listen for logo updates
  useEffect(() => {
    const handleLogoUpdate = (event) => {
      const { logoUrl } = event.detail;
      setSpaceLogo(logoUrl);
      
      // Update the logo element if it exists
      if (logoRef.current) {
        if (logoUrl) {
          logoRef.current.src = logoUrl;
          logoContainerRef.current.style.display = 'flex';
        } else {
          logoContainerRef.current.style.display = 'none';
        }
      }
    };

    window.addEventListener('SpaceLogoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('SpaceLogoUpdated', handleLogoUpdate);
    };
  }, []);

  useEffect(() => {
    // Wait for the container ref to be available
    if (!containerRef || !containerRef.current) return;

    // Create a div element for the loader
    const loaderElement = document.createElement('div');
    loaderRef.current = loaderElement;
    
    // Set styles for the loader container - position below center
    Object.assign(loaderElement.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, calc(-50% + 50px))', // Position below center
      width: '300px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '50', // High enough to be above Unity canvas but within the container
      transition: 'opacity 1.5s ease-in-out',
      pointerEvents: 'none',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: '8px',
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.7)',
    });
    
    // Create a separate container for the logo
    if (spaceLogo) {
      const logoContainer = document.createElement('div');
      logoContainerRef.current = logoContainer;
      
      // Set styles for the logo container - position above center
      Object.assign(logoContainer.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, calc(-50% - 40px))', // Position closer to the loader
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '50',
        transition: 'opacity 1.5s ease-in-out',
        pointerEvents: 'none',
        padding: '8px',
        width: '280px', // Match loader width more closely
      });
      
      // Create logo image
      const logoImage = document.createElement('img');
      logoRef.current = logoImage;
      logoImage.src = spaceLogo;
      logoImage.alt = 'Space Logo';
      logoImage.style.maxHeight = '100px'; // Slightly reduced height
      logoImage.style.maxWidth = '100%';
      logoImage.style.objectFit = 'contain';
      logoImage.style.filter = 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.7))';
      
      // Add logo to its container
      logoContainer.appendChild(logoImage);
      
      // Add the logo container to the main container
      containerRef.current.appendChild(logoContainer);
    }
    
    // Create the animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes progress-pulse {
        0% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
        50% { box-shadow: 0 0 15px rgba(255, 255, 255, 0.8); }
        100% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
      }
      
      @keyframes progress-glow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
    
    // Create stage text
    const stageText = document.createElement('div');
    stageText.style.fontSize = '16px';
    stageText.style.fontWeight = 'bold';
    stageText.style.textAlign = 'center';
    stageText.style.marginBottom = '16px';
    stageText.style.color = '#ffffff';
    stageText.textContent = 'Initialising World';
    
    // Create progress bar container
    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.width = '100%';
    progressBarContainer.style.height = '12px';
    progressBarContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    progressBarContainer.style.borderRadius = '6px';
    progressBarContainer.style.overflow = 'hidden';
    progressBarContainer.style.position = 'relative';
    progressBarContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5) inset';
    
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.style.height = '100%';
    progressBar.style.width = '0%';
    progressBar.style.background = 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
    progressBar.style.backgroundSize = '200% 200%';
    progressBar.style.animation = 'progress-glow 2s ease infinite';
    progressBar.style.transition = 'width 0.5s ease-out';
    progressBar.style.borderRadius = '6px';
    progressBar.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.5)';
    progressBarContainer.appendChild(progressBar);
    
    // Create progress text
    const progressText = document.createElement('div');
    progressText.style.marginTop = '8px';
    progressText.style.fontSize = '14px';
    progressText.style.fontWeight = 'bold';
    progressText.style.color = '#ffffff';
    progressText.textContent = '0%';
    
    // Add elements to the loader
    loaderElement.appendChild(stageText);
    loaderElement.appendChild(progressBarContainer);
    loaderElement.appendChild(progressText);
    
    // Add the loader element to the container
    containerRef.current.appendChild(loaderElement);
    
    // Function to update the progress display
    const updateProgress = (value) => {
      setProgress(value);
      progressBar.style.width = `${Math.round(value * 100)}%`;
      progressText.textContent = `${Math.round(value * 100)}%`;
    };
    
    // Function to update the loading stage
    const updateLoadingStage = (stage) => {
      setLoadingStage(stage);
      stageText.textContent = stage;
    };
    
    // Define loading stages with corresponding progress values
    const loadingStages = [
      { stage: 'Initialising World', progress: 0.33 },
      { stage: 'Loading Assets', progress: 0.66 },
      { stage: 'Loading User', progress: 1.0 }
    ];
    
    // Set initial stage
    updateLoadingStage(loadingStages[0].stage);
    updateProgress(0.05); // Start at 5%
    
    // Function to handle progress updates
    const handleProgress = (event) => {
      const progressValue = event.detail.progress;
      updateProgress(progressValue);
      
      // Update stage based on progress
      if (progressValue < 0.33) {
        updateLoadingStage(loadingStages[0].stage);
      } else if (progressValue < 0.66) {
        updateLoadingStage(loadingStages[1].stage);
      } else {
        updateLoadingStage(loadingStages[2].stage);
      }
    };
    
    // Function to handle first scene loaded
    const handleFirstSceneLoaded = () => {
      console.log("PersistentLoader: First scene loaded event received");
      setIsFirstSceneLoaded(true);
      updateLoadingStage(loadingStages[1].stage);
      updateProgress(0.66);
    };
    
    // Function to handle player instantiation
    const handlePlayerInstantiated = () => {
      console.log("PersistentLoader: Player instantiated event received");
      
      // Immediately stop all other progress updates
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // Unsubscribe from all events that might update progress
      window.removeEventListener('UnityProgress', handleProgress);
      
      // Set state
      setIsPlayerInstantiated(true);
      updateLoadingStage(loadingStages[2].stage);
      
      // Force to 100% immediately
      progressBar.style.width = '100%';
      progressText.textContent = '100%';
      
      // Keep at 100% for 1 second, then fade out
      setTimeout(() => {
        // Fade out the loader and logo
        loaderElement.style.opacity = '0';
        if (logoContainerRef.current) {
          logoContainerRef.current.style.opacity = '0';
        }
        
        // Remove the loader and logo after the transition
        setTimeout(() => {
          if (containerRef.current) {
            if (containerRef.current.contains(loaderElement)) {
              containerRef.current.removeChild(loaderElement);
            }
            if (logoContainerRef.current && containerRef.current.contains(logoContainerRef.current)) {
              containerRef.current.removeChild(logoContainerRef.current);
            }
          }
        }, 1500); // Match the transition duration
      }, 1000); // Show 100% for 1 second
    };
    
    // Simulate progress updates for better user experience
    let progressInterval = null;
    if (!window.isPlayerInstantiated) {
      let simulatedProgress = 0.05; // Start at 5%
      progressInterval = setInterval(() => {
        if (!isFirstSceneLoaded && !isPlayerInstantiated) {
          simulatedProgress += 0.01;
          if (simulatedProgress > 0.6) {
            simulatedProgress = 0.6; // Cap at 60% until first scene is loaded
            clearInterval(progressInterval);
            progressInterval = null;
          }
          updateProgress(simulatedProgress);
          
          // Update stage based on simulated progress
          if (simulatedProgress < 0.33) {
            updateLoadingStage(loadingStages[0].stage);
          } else if (simulatedProgress < 0.66) {
            updateLoadingStage(loadingStages[1].stage);
          }
        } else {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      }, 200);
    }
    
    // Check if player is already instantiated
    if (window.isPlayerInstantiated) {
      console.log("PersistentLoader: Player was already instantiated");
      handlePlayerInstantiated();
    } else {
      // Subscribe to progress events
      window.addEventListener('UnityProgress', handleProgress);
      
      // Subscribe to first scene loaded event
      eventBus.subscribe(EventNames.firstSceneLoaded, handleFirstSceneLoaded);
      window.addEventListener('FirstSceneLoaded', handleFirstSceneLoaded);
      
      // Subscribe to player instantiated event
      eventBus.subscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
      window.addEventListener('PlayerInstantiated', handlePlayerInstantiated);
      
      // Force progress to 100% after a timeout (failsafe)
      const timeoutId = setTimeout(() => {
        console.log("PersistentLoader: Forcing loader removal after timeout");
        handlePlayerInstantiated();
      }, 30000); // 30 seconds max
      
      return () => {
        // Clean up event listeners
        window.removeEventListener('UnityProgress', handleProgress);
        eventBus.unsubscribe(EventNames.firstSceneLoaded, handleFirstSceneLoaded);
        window.removeEventListener('FirstSceneLoaded', handleFirstSceneLoaded);
        eventBus.unsubscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
        window.removeEventListener('PlayerInstantiated', handlePlayerInstantiated);
        clearTimeout(timeoutId);
        
        // Remove the loader element if it still exists
        if (containerRef.current) {
          if (loaderElement && containerRef.current.contains(loaderElement)) {
            containerRef.current.removeChild(loaderElement);
          }
          if (logoContainerRef.current && containerRef.current.contains(logoContainerRef.current)) {
            containerRef.current.removeChild(logoContainerRef.current);
          }
        }
        
        // Remove the style element
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [containerRef, spaceLogo]); // Run when containerRef or spaceLogo changes

  // This component doesn't render anything visible through React
  return null;
};

PersistentLoader.propTypes = {
  containerRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element)
  })
};

export default PersistentLoader; 