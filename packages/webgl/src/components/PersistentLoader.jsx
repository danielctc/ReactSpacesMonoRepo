import React, { useEffect, useState, useRef, useContext } from 'react';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import PropTypes from 'prop-types';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import { useUnity } from '../providers/UnityProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
// Use direct URL instead of importing the image
const SPACES_LOADER_LOGO_URL = 'https://www.spacesmetaverse.com/assets/images/SpacesLogo_Loader.png';

/**
 * PersistentLoader - A component that displays loading progress within the Unity canvas container
 * and stays visible until the player is instantiated.
 */
const PersistentLoader = ({ containerRef }) => {
  const { spaceID } = useUnity();
  const { isUserBannedFromSpace } = useContext(UserContext);
  const [isBanned, setIsBanned] = useState(false);
  const [isFirstSceneLoaded, setIsFirstSceneLoaded] = useState(false);
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Initialising World');
  const [spaceLogo, setSpaceLogo] = useState(null);
  const loaderRef = useRef(null);
  const logoRef = useRef(null);
  const logoContainerRef = useRef(null);
  const loaderLogoRef = useRef(null);
  const loaderLogoMaskRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Debug log when component mounts
  useEffect(() => {
    return () => {};
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
        try {
          const spaceData = await getSpaceItem(spaceID);
          if (spaceData && spaceData.logoUrl) {
            setSpaceLogo(spaceData.logoUrl);
          }
        } catch (error) {
          Logger.error('PersistentLoader: Error fetching space logo:', error);
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

  // Check ban status on mount
  useEffect(() => {
    const checkBan = async () => {
      if (spaceID && isUserBannedFromSpace) {
        try {
          const banned = await isUserBannedFromSpace(spaceID);
          if (banned) {
            Logger.warn(`PersistentLoader: user banned from space ${spaceID}`);
            setIsBanned(true);
          }
        } catch (e) {
          Logger.error('PersistentLoader: error checking ban status', e);
        }
      }
    };
    checkBan();
  }, [spaceID, isUserBannedFromSpace]);

  useEffect(() => {
    // Wait for the container ref to be available
    if (!containerRef || !containerRef.current) {
      Logger.error('PersistentLoader: Container ref missing');
      return;
    }

    // If banned, show static message and stop further processing
    if (isBanned) {
      const bannedEl = document.createElement('div');
      Object.assign(bannedEl.style, {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'red',
        background: 'rgba(0,0,0,0.7)',
        padding: '20px',
        borderRadius: '8px',
        zIndex: '100',
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center',
      });
      bannedEl.textContent = 'Access Denied: You have been banned from this space.';
      containerRef.current.appendChild(bannedEl);

      return () => {
        containerRef.current.removeChild(bannedEl);
      };
    }
    
    // Create a div element for the loader
    const loaderElement = document.createElement('div');
    loaderRef.current = loaderElement;
    
    // Set styles for the loader container - start with opacity 0
    Object.assign(loaderElement.style, {
      position: 'absolute',
      top: '60%', 
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '300px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '50',
      transition: 'opacity 0.3s ease-in-out',
      pointerEvents: 'none',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '12px',
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.3), inset 0 0 1px rgba(255, 255, 255, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      opacity: '1', // Show immediately - Unity starts downloading right away
    });
    
    // Create a separate container for the space logo if available
    if (spaceLogo) {
      const logoContainer = document.createElement('div');
      logoContainerRef.current = logoContainer;
      
      // Set styles for the logo container - start with opacity 0
      Object.assign(logoContainer.style, {
        position: 'absolute',
        top: '37.5%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '50',
        transition: 'opacity 0.3s ease-in-out',
        pointerEvents: 'none',
        padding: '8px',
        width: '280px',
        opacity: '1', // Show immediately - Unity starts downloading right away
      });
      
      // Create logo image
      const logoImage = document.createElement('img');
      logoRef.current = logoImage;
      logoImage.src = spaceLogo;
      logoImage.alt = 'Space Logo';
      logoImage.style.maxHeight = '100px';
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
    
    // Create loader logo container with initial opacity of 0
    const loaderLogoContainer = document.createElement('div');
    loaderLogoContainer.style.width = '240px';
    loaderLogoContainer.style.height = '100px';
    loaderLogoContainer.style.position = 'relative';
    loaderLogoContainer.style.marginBottom = '15px';
    loaderLogoContainer.style.padding = '0px';
    loaderLogoContainer.style.overflow = 'hidden';
    loaderLogoContainer.style.boxSizing = 'border-box';
    loaderLogoContainer.style.transition = 'opacity 0.3s ease-in-out';
    loaderLogoContainer.style.opacity = '1'; // Show immediately - Unity starts downloading right away
    
    // Create a single logo element with gradient
    const logoElement = document.createElement('div');
    logoElement.style.width = '100%';
    logoElement.style.height = '100%';
    logoElement.style.position = 'absolute';
    logoElement.style.top = '0';
    logoElement.style.left = '0';
    logoElement.style.maskImage = `url(${SPACES_LOADER_LOGO_URL})`;
    logoElement.style.maskSize = 'contain';
    logoElement.style.maskPosition = 'center';
    logoElement.style.maskRepeat = 'no-repeat';
    logoElement.style.webkitMaskImage = `url(${SPACES_LOADER_LOGO_URL})`;
    logoElement.style.webkitMaskSize = 'contain';
    logoElement.style.webkitMaskPosition = 'center';
    logoElement.style.webkitMaskRepeat = 'no-repeat';
    logoElement.style.background = 'linear-gradient(to right, #4facfe 0%, #00f2fe 15%, white 15%, white 100%)';
    logoElement.style.backgroundSize = '100% 100%';
    logoElement.style.transition = 'background 0.5s ease-out';
    
    // Store references
    loaderLogoRef.current = logoElement;
    loaderLogoMaskRef.current = null;
    
    // Add the logo to its container
    loaderLogoContainer.appendChild(logoElement);
    
    // Create progress text
    const progressText = document.createElement('div');
    progressText.style.marginTop = '8px';
    progressText.style.fontSize = '14px';
    progressText.style.fontWeight = 'bold';
    progressText.style.color = '#ffffff';
    progressText.textContent = '0%';
    
    // Add elements to the loader
    loaderElement.appendChild(stageText);
    loaderElement.appendChild(loaderLogoContainer);
    loaderElement.appendChild(progressText);
    
    // Add the loader element to the container
    containerRef.current.appendChild(loaderElement);
    
    // Loader is already visible (opacity: 1) - no need to fade in
    // Unity starts downloading immediately, so loader must be visible immediately
    
    // Function to update the progress display
    const updateProgress = (value) => {
      setProgress(value);
      const percentage = Math.round(value * 100);
      
      // Update the gradient to show progress - explicitly update background property
      const gradientValue = `linear-gradient(to right, #4facfe 0%, #00f2fe ${percentage}%, white ${percentage}%, white 100%)`;
      logoElement.style.background = gradientValue;
      
      // Update the progress text
      progressText.textContent = `${percentage}%`;
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
    
    // If there's an error, use different loading stages
    if (errorState) {
      loadingStages[0].stage = 'Connecting to Space';
      loadingStages[1].stage = 'Reconnecting...';
      loadingStages[2].stage = 'Please Wait';
    }
    
    // Set initial stage
    updateLoadingStage(loadingStages[0].stage);
    updateProgress(0.25); // Start at 25% instead of 15%
    
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
      setIsFirstSceneLoaded(true);
      updateLoadingStage(loadingStages[1].stage);
      updateProgress(0.66);
    };
    
    // Function to handle player instantiation
    const handlePlayerInstantiated = () => {
      // Immediately stop all other progress updates
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      setIsPlayerInstantiated(true);
      updateLoadingStage(loadingStages[2].stage);
      updateProgress(1.0);
      
      // If there's an error, don't fade out the loader
      if (errorState) {
        return;
      }
      
      // Apply different transition durations for different elements
      loaderElement.style.transition = 'all 0.5s ease-in-out';
      loaderLogoContainer.style.transition = 'opacity 1.2s ease-in-out';
      stageText.style.transition = 'opacity 0.4s ease-in-out';
      progressText.style.transition = 'opacity 0.4s ease-in-out';
      
      // Also set transition for the space logo container if it exists
      if (logoContainerRef.current) {
        logoContainerRef.current.style.transition = 'opacity 0.5s ease-in-out';
      }
      
      // Fade out the loader background, text elements, and the optional space logo simultaneously
      loaderElement.style.backgroundColor = 'rgba(0, 0, 0, 0)';
      loaderElement.style.backdropFilter = 'blur(0px)';
      loaderElement.style.WebkitBackdropFilter = 'blur(0px)';
      loaderElement.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
      loaderElement.style.border = '1px solid rgba(255, 255, 255, 0)';
      stageText.style.opacity = '0';
      progressText.style.opacity = '0';
      
      // Fade out the space logo at the same time as the background
      if (logoContainerRef.current) {
        logoContainerRef.current.style.opacity = '0';
      }
      
      // After a short delay, begin fading out the loader logo
      setTimeout(() => {
        loaderLogoContainer.style.opacity = '0';
        
        // Remove the elements after the transition
        setTimeout(() => {
          if (containerRef.current && containerRef.current.contains(loaderElement)) {
            containerRef.current.removeChild(loaderElement);
          }
          
          if (logoContainerRef.current && containerRef.current && containerRef.current.contains(logoContainerRef.current)) {
            containerRef.current.removeChild(logoContainerRef.current);
          }
        }, 1300); // Shorter wait time
      }, 400); // Shorter delay
    };
    
    // Check if player is already instantiated
    if (window.isPlayerInstantiated) {
      handlePlayerInstantiated();
    } else {
      // Subscribe to player instantiated event
      eventBus.subscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
      
      // Also listen for the custom event
      const customEventHandler = () => handlePlayerInstantiated();
      window.addEventListener("PlayerInstantiated", customEventHandler);
      
      // Listen for first scene loaded event
      eventBus.subscribe(EventNames.firstSceneLoaded, handleFirstSceneLoaded);
      
      // Listen for progress updates
      window.addEventListener('UnityProgress', handleProgress);
      
      // Simulate progress updates if no events are received
      progressIntervalRef.current = setInterval(() => {
        if (!isPlayerInstantiated) {
          setProgress(prevProgress => {
            const newProgress = Math.min(prevProgress + 0.02, 0.95); // Faster progress increments
            
            // Explicitly call our updateProgress function
            updateProgress(newProgress);
            
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
      }, 300); // Faster progress updates
      
      // Force hide after a timeout (failsafe)
      const timeoutId = setTimeout(() => {
        handlePlayerInstantiated();
      }, 60000); // 60 seconds max
      
      return () => {
        // Clean up event listeners
        eventBus.unsubscribe(EventNames.playerInstantiated, handlePlayerInstantiated);
        window.removeEventListener("PlayerInstantiated", customEventHandler);
        eventBus.unsubscribe(EventNames.firstSceneLoaded, handleFirstSceneLoaded);
        window.removeEventListener('UnityProgress', handleProgress);
        clearInterval(progressIntervalRef.current);
        clearTimeout(timeoutId);
        
        // Remove the elements if they still exist
        if (containerRef.current && containerRef.current.contains(loaderElement)) {
          containerRef.current.removeChild(loaderElement);
        }
        
        if (logoContainerRef.current && containerRef.current && containerRef.current.contains(logoContainerRef.current)) {
          containerRef.current.removeChild(logoContainerRef.current);
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