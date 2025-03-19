import { useEffect, useState, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Spinner, 
  Alert, 
  AlertIcon, 
  AlertTitle, 
  AlertDescription,
  VStack,
  HStack,
  Badge,
  Divider,
  Flex,
  Input,
  Textarea,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { Helmet } from 'react-helmet-async';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import WebGLLoader from '@disruptive-spaces/webgl/src/WebGLLoader';
import { UserProvider, UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { FullScreenProvider } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import { EventNames, eventBus } from '@disruptive-spaces/shared/events/EventBus';
import Header from '../components/Header';
import Footer from '../components/Footer';

// For development only - use the actual space ID for the potato website
const POTATO_SPACE_ID = 'thepotato';

// For development only - use SpacesMetaverse_SDK as the space ID for WebGL
// This is to avoid CORS issues with Firebase Storage in development
const DEV_WEBGL_SPACE_ID = 'SpacesMetaverse_SDK';

// Sample space data for development when Firebase permissions are not available
const getSampleSpace = (id) => ({
  id,
  name: id === 'sample1' ? 'Conference Room' : id === 'sample2' ? 'Art Gallery' : 'Social Lounge',
  description: id === 'sample1' 
    ? 'Professional virtual meeting space for team collaboration.' 
    : id === 'sample2' 
      ? 'Immersive gallery for showcasing digital art and exhibitions.' 
      : 'Casual environment for social gatherings and networking events.',
  visibility: 'public',
  createdAt: { toDate: () => new Date() },
  createdBy: { displayName: 'Demo User' }
});

// Hardcoded data for the potato website - always available regardless of auth status
const potatoSpaceData = {
  id: 'thepotato',
  name: 'Spaces Metaverse',
  description: 'Welcome to the Spaces Metaverse! This is our first test space where you can explore and interact with the virtual environment. We plan to add more functionality as we go. Please check back soon for updates.',
  visibility: 'public',
  createdAt: { toDate: () => new Date('2025-03-15') },
  createdBy: { displayName: 'Disruptive Live' },
  category: 'development'
};

// Create a new collection for SEO content
const SEO_COLLECTION = 'seoContent';

// Function to intercept and modify Firebase Storage URLs to use our proxy
function setupFirebaseStorageProxy() {
  // Save the original fetch function
  const originalFetch = window.fetch;
  
  // Override the fetch function
  window.fetch = function(url, options) {
    // Check if this is a Firebase Storage URL
    if (typeof url === 'string' && url.includes('firebasestorage.googleapis.com')) {
      console.log('Intercepting Firebase Storage URL:', url);
      
      // Replace the Firebase Storage URL with our proxy URL
      const proxyUrl = url.replace('https://firebasestorage.googleapis.com', '/firebase-proxy');
      console.log('Using proxy URL:', proxyUrl);
      
      // Call the original fetch with the proxy URL
      return originalFetch(proxyUrl, options);
    }
    
    // For all other URLs, use the original fetch
    return originalFetch(url, options);
  };
  
  // Return a cleanup function
  return () => {
    window.fetch = originalFetch;
  };
}

function SpacePage() {
  console.log("SpacePage component rendering");
  const { spaceSlug } = useParams();
  console.log("Space slug from URL:", spaceSlug);
  
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actualSpaceId, setActualSpaceId] = useState(null);
  const webglContainerRef = useRef(null);
  const [seoData, setSeoData] = useState(null);
  
  // Keyboard testing state
  const [showKeyboardTest, setShowKeyboardTest] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [keyEvents, setKeyEvents] = useState([]);
  const [unityDisabled, setUnityDisabled] = useState(false);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Modal state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalInputValue, setModalInputValue] = useState('');
  
  useEffect(() => {
    async function fetchSpace() {
      try {
        setLoading(true);
        console.log("Fetching space with slug:", spaceSlug);
        
        // Special case for the potato website - always use hardcoded data
        if (spaceSlug === 'the-potato-website') {
          console.log("Using hardcoded potato space data");
          setSpace(potatoSpaceData);
          setActualSpaceId(POTATO_SPACE_ID);
          setLoading(false);
          return;
        }
        
        // First try to find by ID (if the slug is actually an ID)
        const spaceRef = doc(db, 'spaces', spaceSlug);
        const spaceDoc = await getDoc(spaceRef);
        
        if (spaceDoc.exists()) {
          console.log("Found space by ID:", spaceDoc.id);
          const spaceData = { id: spaceDoc.id, ...spaceDoc.data() };
          setSpace(spaceData);
          setActualSpaceId(spaceDoc.id);
        } else {
          console.log("Space not found by ID, checking by slug...");
          
          // Try to find by slug
          try {
            const spacesQuery = query(
              collection(db, 'spaces'),
              where('slug', '==', spaceSlug)
            );
            
            const querySnapshot = await getDocs(spacesQuery);
            
            if (!querySnapshot.empty) {
              const spaceDoc = querySnapshot.docs[0];
              console.log("Found space by slug:", spaceDoc.id);
              const spaceData = { id: spaceDoc.id, ...spaceDoc.data() };
              setSpace(spaceData);
              setActualSpaceId(spaceDoc.id);
            } else {
              // Check if it's a sample space ID
              if (spaceSlug.startsWith('sample')) {
                console.log('Using sample space data');
                const sampleSpace = getSampleSpace(spaceSlug);
                setSpace(sampleSpace);
                setActualSpaceId(spaceSlug);
              } else {
                console.log("Space not found by slug either");
                setError('Space not found');
              }
            }
          } catch (err) {
            console.error("Error querying by slug:", err);
            setError('Failed to load space');
          }
        }
      } catch (err) {
        console.error('Error fetching space:', err);
        
        // If there's a permissions error, use sample data if it's a sample ID
        if (err.code === 'permission-denied') {
          if (spaceSlug.startsWith('sample')) {
            console.log('Using sample space data due to Firebase permissions issue');
            const sampleSpace = getSampleSpace(spaceSlug);
            setSpace(sampleSpace);
            setActualSpaceId(spaceSlug);
          } else if (spaceSlug === 'the-potato-website') {
            console.log("Using special potato space data due to permissions issue");
            setSpace(potatoSpaceData);
            setActualSpaceId(POTATO_SPACE_ID);
          } else {
            setError('Failed to load space - Permission denied');
          }
        } else {
          setError('Failed to load space');
        }
      } finally {
        setLoading(false);
      }
    }
    
    if (spaceSlug) {
      fetchSpace();
    } else {
      setError('Invalid space URL');
      setLoading(false);
    }
  }, [spaceSlug]);
  
  // Set up the webgl-root element when the component mounts
  useEffect(() => {
    // Check if webgl-root exists, create it if it doesn't
    let webglRoot = document.getElementById('webgl-root');
    
    if (!webglRoot) {
      console.log('Creating webgl-root element as it does not exist');
      webglRoot = document.createElement('div');
      webglRoot.id = 'webgl-root';
      webglRoot.style.display = 'block';
      webglRoot.style.width = '100%';
      webglRoot.style.height = '100%';
      webglRoot.style.position = 'relative';
      document.body.appendChild(webglRoot);
    }
    
    const webglContainer = webglContainerRef.current;
    
    if (webglRoot && webglContainer) {
      // Store the original parent to restore later
      const originalParent = webglRoot.parentElement;
      const originalStyle = {
        display: webglRoot.style.display,
        width: webglRoot.style.width,
        height: webglRoot.style.height,
        position: webglRoot.style.position
      };
      
      // Move the webgl-root element into our container
      webglContainer.appendChild(webglRoot);
      
      // Set the data-space-id attribute based on the space slug
      const spaceId = spaceSlug === 'the-potato-website' ? POTATO_SPACE_ID : actualSpaceId || spaceSlug;
      console.log("Setting data-space-id to:", spaceId);
      webglRoot.setAttribute('data-space-id', spaceId);
      
      // Clean up when component unmounts
      return () => {
        // Move the webgl-root element back to its original parent
        if (webglRoot.parentElement === webglContainer) {
          if (originalParent) {
            originalParent.appendChild(webglRoot);
          } else {
            document.body.appendChild(webglRoot);
          }
          
          // Restore original styles
          webglRoot.style.display = originalStyle.display;
          webglRoot.style.width = originalStyle.width;
          webglRoot.style.height = originalStyle.height;
          webglRoot.style.position = originalStyle.position;
        }
      };
    }
  }, [actualSpaceId, spaceSlug]);
  
  // Set up the Firebase Storage proxy
  useEffect(() => {
    console.log('Setting up Firebase Storage proxy');
    return setupFirebaseStorageProxy();
  }, []);
  
  // Fetch SEO data from Firebase
  useEffect(() => {
    async function fetchSeoData() {
      if (!spaceSlug) return;
      
      try {
        console.log("Fetching SEO data for:", spaceSlug);
        
        // For the potato website, always use hardcoded data first
        if (spaceSlug === 'the-potato-website') {
          console.log("Using hardcoded data for SEO (potato website)");
          setSeoData({
            title: potatoSpaceData.name,
            description: potatoSpaceData.description,
            image: ''
          });
          
          // Try to get additional data from Firebase, but don't wait for it
          try {
            const seoRef = doc(db, SEO_COLLECTION, spaceSlug);
            const seoDoc = await getDoc(seoRef);
            
            if (seoDoc.exists()) {
              console.log("Found SEO data from collection:", seoDoc.data());
              // Update with Firebase data but keep hardcoded as fallback
              setSeoData(prevData => ({
                title: seoDoc.data().title || prevData.title,
                description: seoDoc.data().description || prevData.description,
                image: seoDoc.data().image || prevData.image
              }));
            } else {
              // Try to get from spaces collection as backup
              const spaceRef = doc(db, 'spaces', POTATO_SPACE_ID);
              const spaceDoc = await getDoc(spaceRef);
              
              if (spaceDoc.exists()) {
                const data = spaceDoc.data();
                console.log("Found space data for SEO:", data);
                // Update with Firebase data but keep hardcoded as fallback
                setSeoData(prevData => ({
                  title: data.name || prevData.title,
                  description: data.description || prevData.description,
                  image: data.imageUrl || prevData.image
                }));
              }
            }
          } catch (err) {
            console.error("Error fetching additional SEO data:", err);
            // Already using hardcoded data, so no need to set it again
          }
          
          return; // Exit early since we've already set the data
        }
        
        // For non-potato spaces, try to get SEO data from the seoContent collection
        const seoRef = doc(db, SEO_COLLECTION, spaceSlug);
        const seoDoc = await getDoc(seoRef);
        
        if (seoDoc.exists()) {
          console.log("Found SEO data:", seoDoc.data());
          setSeoData(seoDoc.data());
        }
      } catch (err) {
        console.error("Error fetching SEO data:", err);
      }
    }
    
    fetchSeoData();
  }, [spaceSlug]);
  
  // Set up global key event listener for testing
  useEffect(() => {
    if (!showKeyboardTest) return;
    
    const handleKeyDown = (e) => {
      // Log the event
      const newEvent = {
        type: e.type,
        key: e.key,
        target: e.target.tagName,
        timestamp: new Date().toISOString().split('T')[1].split('.')[0]
      };
      
      console.log('Key event:', newEvent);
      setKeyEvents(prev => [...prev.slice(-9), newEvent]);
      
      // If the target is not an input or textarea, prevent the event
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.stopPropagation();
        e.preventDefault();
        
        // If we have an input field focused, simulate typing into it
        if (inputRef.current === document.activeElement) {
          if (e.key.length === 1) { // Only for printable characters
            setInputValue(prev => prev + e.key);
          } else if (e.key === 'Backspace') {
            setInputValue(prev => prev.slice(0, -1));
          }
        } else if (textareaRef.current === document.activeElement) {
          if (e.key.length === 1) { // Only for printable characters
            setTextareaValue(prev => prev + e.key);
          } else if (e.key === 'Backspace') {
            setTextareaValue(prev => prev.slice(0, -1));
          }
        }
        
        return false;
      }
    };
    
    // Add capture phase event listeners to catch events before Unity
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    }, true);
    document.addEventListener('keypress', (e) => {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    }, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.stopPropagation();
          e.preventDefault();
          return false;
        }
      }, true);
      document.removeEventListener('keypress', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.stopPropagation();
          e.preventDefault();
          return false;
        }
      }, true);
    };
  }, [showKeyboardTest]);
  
  // Handle input change
  const handleInputChange = (e) => {
    e.stopPropagation();
    console.log('Input changed:', e.target.value);
    setInputValue(e.target.value);
  };
  
  // Handle textarea change
  const handleTextareaChange = (e) => {
    e.stopPropagation();
    console.log('Textarea changed:', e.target.value);
    setTextareaValue(e.target.value);
  };
  
  // Focus input
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  // Focus textarea
  const focusTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  
  // Disable Unity input
  const disableUnityInput = () => {
    console.log('Disabling Unity input handlers - NUCLEAR OPTION');
    setUnityDisabled(true);
    
    try {
      // NUCLEAR OPTION: Completely remove the Unity canvas from the DOM
      const unityCanvas = document.getElementById('unity-canvas');
      const webglRoot = document.getElementById('webgl-root');
      
      if (unityCanvas) {
        // Store the original parent and position in the DOM
        const originalParent = unityCanvas.parentElement;
        const nextSibling = unityCanvas.nextSibling;
        
        // Store this information for later restoration
        window._removedUnityCanvas = {
          element: unityCanvas,
          parent: originalParent,
          nextSibling: nextSibling
        };
        
        // Remove the canvas from the DOM
        if (originalParent) {
          originalParent.removeChild(unityCanvas);
          console.log('Removed Unity canvas from the DOM');
        }
      }
      
      // Also try to hide the webgl-root
      if (webglRoot) {
        window._originalWebglRootStyle = {
          display: webglRoot.style.display,
          visibility: webglRoot.style.visibility,
          opacity: webglRoot.style.opacity
        };
        
        webglRoot.style.display = 'none';
        webglRoot.style.visibility = 'hidden';
        webglRoot.style.opacity = '0';
        console.log('Hidden webgl-root element');
      }
      
      // Add a style to ensure all Unity elements are hidden
      const style = document.createElement('style');
      style.id = 'unity-nuclear-style';
      style.textContent = `
        #unity-container, #unity-canvas, #webgl-root, #unity-loading-bar, 
        #unity-logo, #unity-progress-bar, #unity-footer, iframe {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      window._unityNuclearStyle = style;
      
      console.log('Unity completely disabled (nuclear option)');
    } catch (error) {
      console.error('Error disabling Unity (nuclear option):', error);
    }
  };
  
  // Enable Unity input
  const enableUnityInput = () => {
    console.log('Restoring Unity input handlers - NUCLEAR OPTION');
    setUnityDisabled(false);
    
    try {
      // NUCLEAR OPTION: Restore the Unity canvas to the DOM
      if (window._removedUnityCanvas) {
        const { element, parent, nextSibling } = window._removedUnityCanvas;
        
        if (parent) {
          if (nextSibling) {
            parent.insertBefore(element, nextSibling);
          } else {
            parent.appendChild(element);
          }
          console.log('Restored Unity canvas to the DOM');
        }
        
        delete window._removedUnityCanvas;
      }
      
      // Restore the webgl-root
      const webglRoot = document.getElementById('webgl-root');
      if (webglRoot && window._originalWebglRootStyle) {
        webglRoot.style.display = window._originalWebglRootStyle.display;
        webglRoot.style.visibility = window._originalWebglRootStyle.visibility;
        webglRoot.style.opacity = window._originalWebglRootStyle.opacity;
        console.log('Restored webgl-root element');
        
        delete window._originalWebglRootStyle;
      }
      
      // Remove the nuclear style
      const style = document.getElementById('unity-nuclear-style');
      if (style) {
        document.head.removeChild(style);
        delete window._unityNuclearStyle;
      }
      
      console.log('Unity completely restored (nuclear option)');
    } catch (error) {
      console.error('Error enabling Unity (nuclear option):', error);
    }
  };
  
  // Toggle keyboard test panel
  const toggleKeyboardTest = () => {
    setShowKeyboardTest(prev => !prev);
  };
  
  // Inject script to disable Unity keyboard capture
  useEffect(() => {
    // Create a script element to inject into the page
    const script = document.createElement('script');
    script.textContent = `
      // Function to disable Unity keyboard capture
      function disableUnityKeyboardCapture() {
        console.log('Injected script: Attempting to disable Unity keyboard capture');
        
        // Try different methods to access and disable Unity keyboard capture
        if (window.unityInstance) {
          try {
            // Method 1: Try to set the property directly on the Unity instance
            if (window.unityInstance.Module && window.unityInstance.Module.WebGLInput) {
              window.unityInstance.Module.WebGLInput.captureAllKeyboardInput = false;
              console.log('Injected script: Set WebGLInput.captureAllKeyboardInput = false directly');
            }
            
            // Method 2: Try to send a message to Unity
            if (window.unityInstance.SendMessage) {
              window.unityInstance.SendMessage('WebGLInput', 'captureAllKeyboardInput', 'false');
              console.log('Injected script: Sent captureAllKeyboardInput message to Unity');
            }
            
            // Method 3: Try to override the keyboard functions
            if (window.unityInstance.Module) {
              const originalKeyboardListenerFunc = window.unityInstance.Module.keyboardListenerFunc;
              window.unityInstance.Module.keyboardListenerFunc = function(target, eventTypeId, ctrlKey, altKey, shiftKey, keyCode, charCode) {
                // Only allow keyboard events for input elements
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                  return originalKeyboardListenerFunc(target, eventTypeId, ctrlKey, altKey, shiftKey, keyCode, charCode);
                }
                // Block other keyboard events
                return false;
              };
              console.log('Injected script: Overrode keyboardListenerFunc');
            }
          } catch (error) {
            console.error('Injected script: Error disabling Unity keyboard capture:', error);
          }
        }
      }
      
      // Run immediately if Unity is already loaded
      if (window.unityInstance) {
        disableUnityKeyboardCapture();
      }
      
      // Set up a MutationObserver to watch for Unity canvas being added to the DOM
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              if (node.id === 'unity-canvas' || (node.querySelector && node.querySelector('#unity-canvas'))) {
                console.log('Injected script: Unity canvas detected in DOM');
                
                // Wait a bit for Unity to initialize
                setTimeout(disableUnityKeyboardCapture, 1000);
                
                // Also set tabIndex on the canvas
                const canvas = node.id === 'unity-canvas' ? node : node.querySelector('#unity-canvas');
                if (canvas) {
                  canvas.tabIndex = -1;
                  console.log('Injected script: Set Unity canvas tabIndex to -1');
                }
              }
            }
          }
        });
      });
      
      // Start observing the document body for changes
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Also check periodically
      const checkInterval = setInterval(function() {
        if (window.unityInstance) {
          disableUnityKeyboardCapture();
          
          // Also check for the canvas
          const canvas = document.getElementById('unity-canvas');
          if (canvas) {
            canvas.tabIndex = -1;
            console.log('Injected script: Set Unity canvas tabIndex to -1 (interval check)');
          }
        }
      }, 2000);
      
      // Clean up after 30 seconds
      setTimeout(function() {
        clearInterval(checkInterval);
      }, 30000);
    `;
    
    // Add the script to the document
    document.head.appendChild(script);
    
    // Clean up
    return () => {
      document.head.removeChild(script);
    };
  }, []);
  
  if (loading) {
    return (
      <Box height="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="brand.500" thickness="4px" />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxW="container.xl" py={10}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }
  
  // For the potato website, use the hardcoded WebGL space ID
  const webglSpaceId = spaceSlug === 'the-potato-website' ? POTATO_SPACE_ID : actualSpaceId;
  
  return (
    <Box bg="#1a1a1a" color="white" minH="100vh">
      <Helmet>
        <title>{seoData?.title || space?.name || "Space"} | Disruptive Spaces</title>
        <meta name="description" content={seoData?.description || space?.description || 'Explore this virtual space'} />
        {seoData?.image && <meta property="og:image" content={seoData.image} />}
      </Helmet>
      
      <Header />
      
      <Container maxW="container.xl" py={8} mt="60px">
        {/* Keyboard Test Toggle Button */}
        <Box position="absolute" top="70px" right="20px" zIndex="1000">
          <Button 
            colorScheme="blue" 
            onClick={toggleKeyboardTest}
            size="sm"
            mr={2}
          >
            {showKeyboardTest ? 'Hide Keyboard Test' : 'Show Keyboard Test'}
          </Button>
          <Button
            colorScheme="purple"
            onClick={onOpen}
            size="sm"
          >
            Open Test Modal
          </Button>
        </Box>
        
        {/* WebGL Container */}
        <Box 
          borderRadius="md" 
          overflow="hidden" 
          mb={8}
          height="70vh"
          position="relative"
          border="1px solid rgba(255, 255, 255, 0.1)"
          ref={webglContainerRef}
          opacity={unityDisabled ? 0.7 : 1}
          pointerEvents={unityDisabled ? 'none' : 'auto'}
        >
          {/* Use the WebGLLoader component instead of directly manipulating the DOM */}
          {webglSpaceId && (
            <UserProvider>
              <FullScreenProvider>
                <WebGLLoader spaceID={webglSpaceId} />
              </FullScreenProvider>
            </UserProvider>
          )}
        </Box>
        
        {/* Keyboard Test Panel */}
        {showKeyboardTest && (
          <Box 
            position="fixed" 
            bottom="20px" 
            right="20px" 
            width="400px" 
            bg="#2D2D2D" 
            p={4} 
            borderRadius="md" 
            boxShadow="lg"
            zIndex="1000"
            border="1px solid rgba(255, 255, 255, 0.1)"
          >
            <Heading size="md" mb={4}>Keyboard Input Test</Heading>
            
            <VStack spacing={4} align="stretch">
              {/* Unity controls */}
              <Button 
                colorScheme={unityDisabled ? 'red' : 'green'} 
                onClick={unityDisabled ? enableUnityInput : disableUnityInput}
              >
                {unityDisabled ? 'Enable Unity Input' : 'Disable Unity Input'}
              </Button>
              
              {/* Input field */}
              <Box>
                <Text mb={1} fontSize="sm">Test Input:</Text>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Type here to test"
                  size="sm"
                  bg="gray.700"
                  className="test-input"
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    console.log('Input keydown captured:', e.key);
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                  onKeyPress={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.focus();
                  }}
                  autoFocus
                />
                <Text mt={1} fontSize="xs">Value: "{inputValue}"</Text>
              </Box>
              
              {/* Textarea */}
              <Box>
                <Text mb={1} fontSize="sm">Test Textarea:</Text>
                <Textarea
                  ref={textareaRef}
                  value={textareaValue}
                  onChange={handleTextareaChange}
                  placeholder="Type here to test"
                  size="sm"
                  bg="gray.700"
                  rows={3}
                  className="test-input"
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    console.log('Textarea keydown captured:', e.key);
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                  onKeyPress={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.currentTarget.focus();
                  }}
                />
                <Text mt={1} fontSize="xs">Value: "{textareaValue}"</Text>
              </Box>
              
              {/* Control buttons */}
              <HStack spacing={2}>
                <Button onClick={focusInput} size="xs">Focus Input</Button>
                <Button onClick={focusTextarea} size="xs">Focus Textarea</Button>
                <Button onClick={() => setInputValue('')} size="xs">Clear</Button>
              </HStack>
              
              {/* Key event log */}
              <Box p={2} bg="gray.800" borderRadius="md" maxHeight="150px" overflowY="auto">
                <Text fontSize="xs" fontWeight="bold" mb={1}>Key Event Log:</Text>
                {keyEvents.length === 0 ? (
                  <Text fontSize="xs">No key events recorded yet.</Text>
                ) : (
                  keyEvents.map((event, index) => (
                    <Text key={index} fontSize="xs">
                      {event.timestamp} - {event.type}: {event.key} (Target: {event.target})
                    </Text>
                  ))
                )}
              </Box>
            </VStack>
          </Box>
        )}
        
        {/* Title Section - Moved below canvas */}
        <Box mb={6}>
          <Heading as="h1" size="2xl" mb={2}>{seoData?.title || space?.name || "Space"}</Heading>
          <HStack spacing={2}>
            <Text color="#4fd1c5">{space?.createdBy?.displayName}</Text>
            <Text color="gray.500">|</Text>
            <Text color="gray.500">Public Space</Text>
          </HStack>
        </Box>
        
        {/* Content Section */}
        <Flex gap={8} direction={{ base: 'column', lg: 'row' }}>
          {/* Description */}
          <Box flex="2">
            <Text fontSize="lg" mb={6}>
              {seoData?.description || space?.description || "No description available."}
            </Text>
            <Divider borderColor="gray.700" mb={6} />
          </Box>
          
          {/* Information Box */}
          <Box 
            flex="1" 
            bg="#2D2D2D" 
            p={6} 
            borderRadius="md"
            border="1px solid rgba(255, 255, 255, 0.1)"
          >
            <Heading as="h2" size="lg" mb={6}>Information</Heading>
            
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text color="gray.400">Released:</Text>
                <Text>{space?.createdAt ? new Date(space.createdAt.toDate()).toLocaleDateString() : '15/3/2025'}</Text>
              </Box>
              
              <Box>
                <Text color="gray.400">Category:</Text>
                <Box mt={2}>
                  <Badge 
                    bg="#2D2D2D" 
                    color="white" 
                    px={3} 
                    py={1} 
                    borderRadius="full"
                    border="1px solid rgba(255, 255, 255, 0.2)"
                  >
                    {space?.category || 'development'}
                  </Badge>
                </Box>
              </Box>
              
              <Box>
                <Text color="gray.400">Creators:</Text>
                <Box mt={2}>
                  <Text>{space?.createdBy?.displayName || 'Disruptive Live'}</Text>
                </Box>
              </Box>
            </VStack>
          </Box>
        </Flex>
      </Container>
      
      {/* Modal for testing keyboard input */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="#2D2D2D" color="white">
          <ModalHeader>Keyboard Input Test Modal</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text mb={4}>
              This modal tests keyboard input over Unity. Type in the input field below:
            </Text>
            <Input
              value={modalInputValue}
              onChange={(e) => setModalInputValue(e.target.value)}
              placeholder="Type here to test modal input"
              bg="gray.700"
              mb={4}
              autoFocus
            />
            <Text fontSize="sm">
              Current value: "{modalInputValue}"
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => setModalInputValue('')}>
              Clear
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      <Footer />
    </Box>
  );
}

export default SpacePage; 