import ReactDOM from "react-dom/client";
import { UserProvider } from "@disruptive-spaces/shared/providers/UserProvider";
import { FullScreenProvider } from "@disruptive-spaces/shared/providers/FullScreenProvider";
import WebGLLoader from "./WebGLLoader";
import "./index.css";
import "./styles/portal-transitions.css";
import { saveTransition } from '@disruptive-spaces/shared/utils/portal-transition';

// Intercept Unity's Application.OpenURL calls to enable same-tab navigation
// Unity WebGL has a _JS_Eval_OpenURL function that we need to patch
// This must run after Unity's framework loads but before portals are clicked

function patchUnityOpenURL() {
  // Check if Unity's Module exists and has the openURL function
  if (typeof window.unityInstance !== 'undefined' && window.unityInstance.Module) {
    const module = window.unityInstance.Module;

    // Store original function
    if (module._JS_Eval_OpenURL && !module._JS_Eval_OpenURL_original) {
      module._JS_Eval_OpenURL_original = module._JS_Eval_OpenURL;

      // Replace with our intercepting version
      module._JS_Eval_OpenURL = function(ptr) {
        const url = module.UTF8ToString(ptr);

        // Check if this is an internal space URL
        if (url && url.includes('/w/')) {
          const currentSpaceId = window.currentSpaceId || 'unknown';
          const match = url.match(/\/w\/([^/?#]+)/);
          const targetSpaceId = match ? match[1] : null;

          if (targetSpaceId) {
            console.log('[Portal Intercept] Redirecting to same tab:', url);

            saveTransition({
              fromSpaceId: currentSpaceId,
              toSpaceId: targetSpaceId,
              portalId: 'unity-openurl',
              fromUrl: window.location.href
            });

            document.body.classList.add('portal-transitioning');

            setTimeout(() => {
              window.location.href = url;
            }, 400);

            return; // Don't open new window
          }
        }

        // For other URLs, use original function
        module._JS_Eval_OpenURL_original(ptr);
      };

      console.log('[Portal Intercept] Unity OpenURL patched successfully');
      return true;
    }
  }
  return false;
}

// Also override window.open as a fallback
const originalWindowOpen = window.open;
window.open = function(url, target, features) {
  if (url && typeof url === 'string' && url.includes('/w/')) {
    const currentSpaceId = window.currentSpaceId || 'unknown';
    const match = url.match(/\/w\/([^/?#]+)/);
    const targetSpaceId = match ? match[1] : null;

    if (targetSpaceId) {
      console.log('[Portal Intercept] window.open redirecting to same tab:', url);

      saveTransition({
        fromSpaceId: currentSpaceId,
        toSpaceId: targetSpaceId,
        portalId: 'unity-openurl',
        fromUrl: window.location.href
      });

      document.body.classList.add('portal-transitioning');

      setTimeout(() => {
        window.location.href = url;
      }, 400);

      return null;
    }
  }
  return originalWindowOpen.call(window, url, target, features);
};

// Try to patch Unity immediately and also set up a retry
if (!patchUnityOpenURL()) {
  // Retry after Unity might have loaded
  const patchInterval = setInterval(() => {
    if (patchUnityOpenURL()) {
      clearInterval(patchInterval);
    }
  }, 1000);

  // Stop trying after 30 seconds
  setTimeout(() => clearInterval(patchInterval), 30000);
}

// Export everything from exports.js
export * from './exports';

// Only initialize if we're in a context where webgl-root exists
// This allows the package to be imported without errors on pages that don't use WebGL
function initializeWebGL() {
  const rootElement = document.getElementById("webgl-root");

  if (rootElement) {
    const spaceID = rootElement.getAttribute("data-space-id");

    const App = () => (
      <UserProvider>
        <FullScreenProvider>
          <WebGLLoader spaceID={spaceID} />
        </FullScreenProvider>
      </UserProvider>
    );

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

// Export both as default and named export
export { WebGLLoader };
export default WebGLLoader;
