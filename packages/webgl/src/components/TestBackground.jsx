import React, { useEffect, useRef } from 'react';
import { Box } from "@chakra-ui/react";
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

/**
 * TestBackground - A simple component to test background rendering
 */
const TestBackground = () => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    Logger.log("TestBackground: Component mounted");
    
    if (containerRef.current) {
      Logger.log("TestBackground: Container ref is available");
      
      // Create a div element for the background
      const bgElement = document.createElement('div');
      
      // Set styles for the background element
      Object.assign(bgElement.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'red', // Use a bright color to make it obvious
        zIndex: '999', // Very high to ensure it's visible
        opacity: '0.5', // Semi-transparent
      });
      
      // Add the background element to the container
      containerRef.current.appendChild(bgElement);
      Logger.log("TestBackground: Background element added to container");
      
      return () => {
        // Clean up
        if (containerRef.current && containerRef.current.contains(bgElement)) {
          containerRef.current.removeChild(bgElement);
          Logger.log("TestBackground: Background element removed during cleanup");
        }
      };
    }
  }, []);
  
  return (
    <Box 
      ref={containerRef}
      position="absolute"
      top="0"
      left="0"
      width="100%"
      height="100%"
      zIndex="998"
    />
  );
};

export default TestBackground; 