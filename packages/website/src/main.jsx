import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { HelmetProvider } from 'react-helmet-async';
import { UserProvider } from '@disruptive-spaces/shared/providers/UserProvider';
import { FullScreenProvider } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { WebsiteContentProvider } from './contexts/WebsiteContentContext';
import RegistrationOverlay from '@disruptive-spaces/shared/components/auth/RegistrationOverlay';
import theme from './theme';
import App from './App';
import './index.css';

// Initialize Firebase if needed
import '@disruptive-spaces/shared/firebase/firebase';

// Override WebGL console error - we only need webgl-root on specific pages
const originalConsoleError = console.error;
console.error = function(msg, ...args) {
  // Suppress the specific error about webgl-root not being found
  if (typeof msg === 'string' && msg.includes("Root element 'webgl-root' not found")) {
    // This error is expected on non-SpacePage routes, so we'll ignore it
    return;
  }
  // Call the original console.error for all other messages
  originalConsoleError.apply(console, [msg, ...args]);
};

// Initialize Webflow script if it exists
window.Webflow && window.Webflow.destroy();
window.Webflow && window.Webflow.ready();
window.Webflow && window.Webflow.require('ix2').init();
document.dispatchEvent(new Event('readystatechange'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <HelmetProvider>
        <BrowserRouter>
          <UserProvider>
            <FullScreenProvider>
              <WebsiteContentProvider>
                <App />
                <RegistrationOverlay />
              </WebsiteContentProvider>
            </FullScreenProvider>
          </UserProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ChakraProvider>
  </React.StrictMode>
);