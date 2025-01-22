import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";

import { loadTheme } from '@disruptive-spaces/shared/themes/loadTheme';
import { UserProvider } from "@disruptive-spaces/shared/providers/UserProvider";
import { FullScreenProvider } from "@disruptive-spaces/shared/providers/FullScreenProvider";
import WebGLLoader from "./WebGLLoader"; // Adjust the import path as necessary

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

  ReactDOM.createRoot(rootElement).render(<App />);
} else {
  console.error("Root element 'webgl-root' not found.");
}

export default WebGLLoader;