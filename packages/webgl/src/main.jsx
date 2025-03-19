import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";

import { loadTheme } from '@disruptive-spaces/shared/themes/loadTheme';
import { UserProvider } from "@disruptive-spaces/shared/providers/UserProvider";
import { FullScreenProvider } from "@disruptive-spaces/shared/providers/FullScreenProvider";
import WebGLLoader from "./WebGLLoader"; // Adjust the import path as necessary

// Only initialize if we're in a context where webgl-root exists
// This allows the package to be imported without errors on pages that don't use WebGL
function initializeWebGL() {
  const rootElement = document.getElementById("webgl-root");
  
  if (rootElement) {
    const spaceID = rootElement.getAttribute("data-space-id");
    const initialThemeName = rootElement.getAttribute("data-theme") || "default";
    
    const App = () => {
      const [theme, setTheme] = useState(null);
      
      useEffect(() => {
        loadTheme(initialThemeName).then(setTheme);
      }, []);
      
      if (!theme) {
        return <div>Loading theme...</div>; // or some loading spinner
      }
      
      return (
        <ChakraProvider theme={theme}>
          <UserProvider>
            <FullScreenProvider>
              <WebGLLoader spaceID={spaceID} />
            </FullScreenProvider>
          </UserProvider>
        </ChakraProvider>
      );
    };
    
    try {
      ReactDOM.createRoot(rootElement).render(<App />);
    } catch (error) {
      console.warn("Error initializing WebGL:", error);
    }
  } 
  // No else clause - silently do nothing if the element doesn't exist
}

// Initialize WebGL when the DOM is fully loaded
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWebGL);
  } else {
    initializeWebGL();
  }
}

export default WebGLLoader;