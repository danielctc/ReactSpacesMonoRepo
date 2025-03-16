import React, { useEffect, useState, useRef } from 'react';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import PropTypes from 'prop-types';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { useUnity } from '../providers/UnityProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

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
  const progressIntervalRef = useRef(null);

  // Debug log when component mounts
  useEffect(() => {
    Logger.log("PersistentLoader: Component mounted with spaceID:", spaceID);
    Logger.log("PersistentLoader: Container ref:", containerRef);
    
    return () => {
      Logger.log("PersistentLoader: Component unmounting");
    };
  }, []);

  // Check for Unity errors
  const { error } = useUnity();
  const [errorState, setErrorState] = useState(false);
  
  useEffect(() => {
    if (error) {
      Logger.error("PersistentLoader: Unity error detected:", error);
      setErrorState(true);
      
      // After a delay, force the loader to show "Reconnecting..." instead of an error
      setTimeout(() => {
        if (loaderRef.current) {
          const stageText = loaderRef.current.querySelector('div:first-child');
          if (stageText) {
            stageText.textContent = "Reconnecting...";
          }
        }
      }, 3000);
    }
  }, [error]);

  // Fetch space logo when component mounts
  useEffect(() => {
    const fetchSpaceLogo = async () => {
      if (spaceID) {
        Logger.log(`PersistentLoader: Fetching logo for space ${spaceID}`);
        try {
          const spaceData = await getSpaceItem(spaceID);
          if (spaceData && spaceData.logoUrl) {
            Logger.log(`PersistentLoader: Found logo URL: ${spaceData.logoUrl}`);
            setSpaceLogo(spaceData.logoUrl);
          } else {
            Logger.log(`PersistentLoader: No logo URL found for space ${spaceID}`);
          }
        } catch (error) {
          Logger.error('PersistentLoader: Error fetching space logo:', error);
        }
      } else {
        Logger.warn('PersistentLoader: No spaceID provided, cannot fetch logo');
      }
    };

    fetchSpaceLogo();
  }, [spaceID]);

  // Listen for logo updates
  useEffect(() => {
    const handleLogoUpdate = (event) => {
      const { logoUrl } = event.detail;
      Logger.log(`PersistentLoader: Logo update event received with URL: ${logoUrl}`);
      setSpaceLogo(logoUrl);
      
      // Update the logo element if it exists
      if (logoRef.current) {
        if (logoUrl) {
          Logger.log('PersistentLoader: Updating logo element with new URL');
          logoRef.current.src = logoUrl;
          logoContainerRef.current.style.display = 'flex';
        } else {
          Logger.log('PersistentLoader: Hiding logo element (no URL)');
          logoContainerRef.current.style.display = 'none';
        }
      } else {
        Logger.warn('PersistentLoader: Logo ref is null during update');
      }
    };

    Logger.log('PersistentLoader: Adding SpaceLogoUpdated event listener');
    window.addEventListener('SpaceLogoUpdated', handleLogoUpdate);
    
    return () => {
      Logger.log('PersistentLoader: Removing SpaceLogoUpdated event listener');
      window.removeEventListener('SpaceLogoUpdated', handleLogoUpdate);
    };
  }, []);

  useEffect(() => {
    // Wait for the container ref to be available
    if (!containerRef || !containerRef.current) {
      Logger.error('PersistentLoader: Container ref is null or has no current property');
      return;
    }

    Logger.log('PersistentLoader: Creating loader elements');
    
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
      Logger.log(`PersistentLoader: Creating logo element with URL: ${spaceLogo}`);
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
      Logger.log('PersistentLoader: Logo container added to main container');
    } else {
      Logger.log('PersistentLoader: No logo URL available, skipping logo creation');
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
    Logger.log('PersistentLoader: Animation styles added to document head');
    
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
    Logger.log('PersistentLoader: Loader element added to container');
    
    // Function to update the progress display
    const updateProgress = (value) => {
      setProgress(value);
      progressBar.style.width = `${Math.round(value * 100)}%`;
      progressText.textContent = `${Math.round(value * 100)}%`;
      Logger.log(`PersistentLoader: Progress updated to ${Math.round(value * 100)}%`);
    };
    
    // Function to update the loading stage
    const updateLoadingStage = (stage) => {
      setLoadingStage(stage);
      stageText.textContent = stage;
      Logger.log(`PersistentLoader: Loading stage updated to "${stage}"`);
    };
    
    // Define loading stages with corresponding progress values
    const loadingStages = [
      { stage: 'Initialising World', progress: 0.33 },
      { stage: 'Loading Assets', progress: 0.66 },
      { stage: 'Loading User', progress: 1.0 }
    ];
    
    // If there's an error, use different loading stages
    if (errorState) {
      loadingStages[0].stage = 'Connecting to Space';
      loadingStages[1].stage = 'Reconnecting...';
      loadingStages[2].stage = 'Please Wait';
    }
    
    // Set initial stage
    updateLoadingStage(loadingStages[0].stage);
    updateProgress(0.05); // Start at 5%
    
    // Function to handle progress updates
    const handleProgress = (event) => {
      const progressValue = event.detail.progress;
      Logger.log(`PersistentLoader: Progress event received with value: ${progressValue}`);
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
      Logger.log("PersistentLoader: First scene loaded event received");
      setIsFirstSceneLoaded(true);
      updateLoadingStage(loadingStages[1].stage);
      updateProgress(0.66);
    };
    
    // Function to handle player instantiation
    const handlePlayerInstantiated = () => {
      Logger.log("PersistentLoader: Player instantiated event received");
      
      // Immediately stop all other progress updates
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        Logger.log("PersistentLoader: Progress interval cleared");
      }
      
      setIsPlayerInstantiated(true);
      updateLoadingStage(loadingStages[2].stage);
      updateProgress(1.0);
      
      // If there's an error, don't fade out the loader
      if (errorState) {
        Logger.log("PersistentLoader: Keeping loader visible due to Unity error");
        return;
      }
      
      // Fade out the loader and logo
      loaderElement.style.opacity = '0';
      if (logoContainerRef.current) {
        logoContainerRef.current.style.opacity = '0';
      }
      
      // Remove the elements after the transition
      setTimeout(() => {
        if (containerRef.current && containerRef.current.contains(loaderElement)) {
          containerRef.current.removeChild(loaderElement);
          Logger.log("PersistentLoader: Loader element removed after fade");
        } else {
          Logger.warn("PersistentLoader: Could not remove loader element (not found in container)");
        }
        
        if (logoContainerRef.current && containerRef.current && containerRef.current.contains(logoContainerRef.current)) {
          containerRef.current.removeChild(logoContainerRef.current);
          Logger.log("PersistentLoader: Logo container removed after fade");
        } else if (logoContainerRef.current) {
          Logger.warn("PersistentLoader: Could not remove logo container (not found in container)");
        }
      }, 1500); // Match the transition duration
    };
    
    // Check if player is already instantiated
    if (window.isPlayerInstantiated) {
      Logger.log("PersistentLoader: Player was already instantiated");
      handlePlayerInstantiated();
    } else {
      // Subscribe to player instantiated event
      Logger.log("PersistentLoader: Subscribing to playerInstantiated event");
      eventBus.subscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
      
      // Also listen for the custom event
      const customEventHandler = () => handlePlayerInstantiated();
      Logger.log("PersistentLoader: Adding PlayerInstantiated event listener");
      window.addEventListener("PlayerInstantiated", customEventHandler);
      
      // Listen for first scene loaded event
      Logger.log("PersistentLoader: Adding firstSceneLoaded event listener");
      eventBus.subscribe(EventNames.firstSceneLoaded, handleFirstSceneLoaded);
      
      // Listen for progress updates
      Logger.log("PersistentLoader: Adding UnityProgress event listener");
      window.addEventListener('UnityProgress', handleProgress);
      
      // Simulate progress updates if no events are received
      progressIntervalRef.current = setInterval(() => {
        if (!isPlayerInstantiated) {
          setProgress(prevProgress => {
            const newProgress = Math.min(prevProgress + 0.01, 0.95);
            progressBar.style.width = `${Math.round(newProgress * 100)}%`;
            progressText.textContent = `${Math.round(newProgress * 100)}%`;
            
            // Update stage based on progress
            if (newProgress < 0.33 && loadingStage !== loadingStages[0].stage) {
              updateLoadingStage(loadingStages[0].stage);
            } else if (newProgress >= 0.33 && newProgress < 0.66 && loadingStage !== loadingStages[1].stage) {
              updateLoadingStage(loadingStages[1].stage);
            } else if (newProgress >= 0.66 && loadingStage !== loadingStages[2].stage) {
              updateLoadingStage(loadingStages[2].stage);
            }
            
            return newProgress;
          });
        }
      }, 500);
      
      // Force hide after a timeout (failsafe)
      const timeoutId = setTimeout(() => {
        Logger.log("PersistentLoader: Forcing loader removal after timeout");
        handlePlayerInstantiated();
      }, 60000); // 60 seconds max
      
      return () => {
        // Clean up event listeners
        Logger.log("PersistentLoader: Cleaning up event listeners");
        eventBus.unsubscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
        window.removeEventListener("PlayerInstantiated", customEventHandler);
        eventBus.unsubscribe(EventNames.firstSceneLoaded, handleFirstSceneLoaded);
        window.removeEventListener('UnityProgress', handleProgress);
        clearInterval(progressIntervalRef.current);
        clearTimeout(timeoutId);
        
        // Remove the elements if they still exist
        if (containerRef.current && containerRef.current.contains(loaderElement)) {
          containerRef.current.removeChild(loaderElement);
          Logger.log("PersistentLoader: Loader element removed during cleanup");
        }
        
        if (logoContainerRef.current && containerRef.current && containerRef.current.contains(logoContainerRef.current)) {
          containerRef.current.removeChild(logoContainerRef.current);
          Logger.log("PersistentLoader: Logo container removed during cleanup");
        }
      };
    }
  }, [spaceLogo, containerRef]); // Run when the component mounts or spaceLogo/containerRef changes

  // This component doesn't render anything visible
  return null;
};

PersistentLoader.propTypes = {
  containerRef: PropTypes.shape({
    current: PropTypes.instanceOf(Element)
  })
};

export default PersistentLoader; 