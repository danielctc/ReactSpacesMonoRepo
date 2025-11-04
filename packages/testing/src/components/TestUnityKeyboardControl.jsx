import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Heading,
  Text,
  Input,
  VStack,
  HStack,
  Textarea,
  Code,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  Switch,
  FormControl,
  FormLabel,
  Flex,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Select,
  Tooltip
} from '@chakra-ui/react';

/**
 * TestUnityKeyboardControl - A component to test keyboard control between React and Unity
 * 
 * This component helps debug keyboard focus issues by:
 * 1. Providing UI controls to test different keyboard capture methods
 * 2. Displaying debug info about the current state
 * 3. Including a test modal with input fields
 */
const TestUnityKeyboardControl = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [logs, setLogs] = useState([]);
  const [keyboardCaptured, setKeyboardCaptured] = useState(false);
  const [unityDetected, setUnityDetected] = useState(false);
  const [unityBridgeDetected, setUnityBridgeDetected] = useState(false);
  const [testCounter, setTestCounter] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState('all');
  const testInputRef = useRef(null);
  const textareaRef = useRef(null);
  const modalInputRef = useRef(null);
  const toast = useToast();

  const addLog = (message) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 29)]);
    
  };

  // Check for Unity availability and setup debugging
  useEffect(() => {
    addLog('Component mounted, checking Unity environment');
    let unityFound = false;
    let bridgeFound = false;
    
    // Check for unity instance
    if (window.unityInstance) {
      addLog('✓ window.unityInstance available');
      unityFound = true;
      
      // Add debug hook to track WebGLInput
      const origSendMessage = window.unityInstance.SendMessage;
      if (origSendMessage) {
        window.unityInstance.SendMessage = function(objectName, methodName, message) {
          addLog(`Unity SendMessage: ${objectName}.${methodName}(${message})`);
          return origSendMessage.call(this, objectName, methodName, message);
        };
        addLog('✓ Hooked SendMessage for debugging');
      }
    } else {
      addLog('✗ window.unityInstance not available');
    }
    
    // Check for dispatch method
    if (window.dispatchReactUnityEvent) {
      addLog('✓ window.dispatchReactUnityEvent available');
      bridgeFound = true;
      
      // Hook the dispatch method
      const origDispatch = window.dispatchReactUnityEvent;
      window.dispatchReactUnityEvent = function(eventName, eventData) {
        addLog(`dispatchReactUnityEvent: ${eventName}(${eventData})`);
        return origDispatch.call(this, eventName, eventData);
      };
      addLog('✓ Hooked dispatchReactUnityEvent for debugging');
    } else {
      addLog('✗ window.dispatchReactUnityEvent not available');
    }
    
    if (window.ReactUnity) {
      addLog('✓ window.ReactUnity available');
      bridgeFound = true;
    } else {
      addLog('✗ window.ReactUnity not available');
    }
    
    // Try to locate Unity canvas to confirm connection
    const unityCanvas = document.querySelector('#unity-canvas');
    if (unityCanvas) {
      addLog('✓ #unity-canvas element found in DOM');
      unityFound = true;
    } else {
      addLog('✗ #unity-canvas element not found in DOM');
    }
    
    // Create a mock if Unity instance isn't available (for testing)
    if (!window.unityInstance && !window.dispatchReactUnityEvent) {
      addLog('💡 Creating mock Unity environment for testing');
      window.unityInstance = {
        SendMessage: (objectName, methodName, message) => {
          addLog(`Mock SendMessage: ${objectName}.${methodName}(${message})`);
        }
      };
      
      window.dispatchReactUnityEvent = (eventName, eventData) => {
        addLog(`Mock dispatchReactUnityEvent: ${eventName}(${eventData})`);
      };
      
      addLog('✓ Mock Unity environment created');
    }
    
    // Check WebGL parameter access
    try {
      // Create a proxy for WebGLInput to track changes
      if (!window.WebGLInput) {
        window.WebGLInput = {
          captureAllKeyboardInput: true
        };
        addLog('✓ Created WebGLInput proxy for debugging');
      }
      
      // Monitor WebGLInput.captureAllKeyboardInput
      const origValue = window.WebGLInput.captureAllKeyboardInput;
      Object.defineProperty(window.WebGLInput, 'captureAllKeyboardInput', {
        get: function() { return origValue; },
        set: function(newValue) {
          addLog(`WebGLInput.captureAllKeyboardInput changed to: ${newValue}`);
          origValue = newValue;
        },
        configurable: true
      });
      
      addLog('✓ WebGLInput property monitoring added');
    } catch (err) {
      addLog(`Error setting up WebGLInput monitoring: ${err.message}`);
    }
    
    // Send a test message to Unity to verify connection
    setTimeout(() => {
      testUnityConnection();
    }, 1000);
    
    setUnityDetected(unityFound);
    setUnityBridgeDetected(bridgeFound);
  }, []);

  // Test the connection to Unity
  const testUnityConnection = () => {
    setTestCounter(prev => prev + 1);
    const pingId = Date.now();
    addLog(`Testing Unity connection (test #${testCounter+1}, id: ${pingId})...`);
    
    // Try both direct message and bridge
    let messageSent = false;
    
    try {
      // Method 1: Unity bridge
      if (window.dispatchReactUnityEvent) {
        window.dispatchReactUnityEvent('ReactPing', JSON.stringify({
          pingId: pingId,
          message: 'Testing connection to Unity'
        }));
        addLog(`Sent ping via dispatchReactUnityEvent (id: ${pingId})`);
        messageSent = true;
      }
      
      // Method 2: Direct SendMessage to ReactBridge
      if (window.unityInstance && window.unityInstance.SendMessage) {
        window.unityInstance.SendMessage("ReactBridge", "HandleEvent", JSON.stringify({
          type: "ReactPing",
          data: JSON.stringify({
            pingId: pingId,
            message: 'Testing direct SendMessage connection to Unity'
          })
        }));
        addLog(`Sent ping via SendMessage to ReactBridge (id: ${pingId})`);
        messageSent = true;
      }
      
      // Method 3: WebGLInput status check
      if (window.unityInstance && window.unityInstance.SendMessage) {
        window.unityInstance.SendMessage("WebGLInput", "GetCaptureStatus", "");
        addLog(`Requested WebGLInput capture status`);
        messageSent = true;
      }
      
      if (!messageSent) {
        addLog('❌ No methods available to send messages to Unity');
        toast({
          title: 'Unity Connection Failed',
          description: 'No communication methods available',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        addLog(`✓ Test messages sent to Unity, waiting for response...`);
        // Unity should respond with a ReactPong event, but we have no way to know if it did
        // instead we'll just assume that the successful sending means we're connected
        setTimeout(() => {
          toast({
            title: 'Test Messages Sent',
            description: 'Check Unity console for responses',
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
        }, 1000);
      }
    } catch (error) {
      addLog(`❌ Error testing Unity connection: ${error.message}`);
      toast({
        title: 'Unity Connection Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle keyboard state change
  const handleKeyboardCaptureToggle = () => {
    const newState = !keyboardCaptured;
    setKeyboardCaptured(newState);
    
    try {
      if (selectedMethod === 'all' || selectedMethod === 'dispatchEvent') {
        // Method 1: window.dispatchReactUnityEvent
        if (window.dispatchReactUnityEvent) {
          addLog(`Dispatching KeyboardCaptureRequest with captureKeyboard: ${newState}`);
          window.dispatchReactUnityEvent('KeyboardCaptureRequest', JSON.stringify({ captureKeyboard: newState }));
        }
      }
      
      if (selectedMethod === 'all' || selectedMethod === 'webGLInput') {
        // Method 2: Direct WebGLInput
        if (window.unityInstance && window.unityInstance.SendMessage) {
          addLog(`Sending WebGLInput.SetCaptureAllKeyboardInput: ${newState}`);
          window.unityInstance.SendMessage("WebGLInput", "SetCaptureAllKeyboardInput", newState ? "true" : "false");
        }
      }
      
      if (selectedMethod === 'all' || selectedMethod === 'reactBridge') {
        // Method 3: ReactBridge.HandleEvent
        if (window.unityInstance && window.unityInstance.SendMessage) {
          addLog(`Sending via ReactBridge.HandleEvent: KeyboardCaptureRequest with captureKeyboard: ${newState}`);
          window.unityInstance.SendMessage("ReactBridge", "HandleEvent", JSON.stringify({
            type: "KeyboardCaptureRequest",
            data: JSON.stringify({ captureKeyboard: newState })
          }));
        }
      }
      
      if (selectedMethod === 'all' || selectedMethod === 'reactUnity') {
        // Method 4: ReactUnity helpers
        if (window.ReactUnity) {
          if (newState) {
            if (window.ReactUnity.enableKeyboardCapture) {
              addLog('Calling ReactUnity.enableKeyboardCapture()');
              window.ReactUnity.enableKeyboardCapture();
            }
          } else {
            if (window.ReactUnity.disableKeyboardCapture) {
              addLog('Calling ReactUnity.disableKeyboardCapture()');
              window.ReactUnity.disableKeyboardCapture();
            }
          }
        }
      }
      
      if (selectedMethod === 'all' || selectedMethod === 'globalFlag') {
        // Method 5: Global flag
        window.unityKeyboardCaptureShouldBeDisabled = !newState;
        addLog(`Set window.unityKeyboardCaptureShouldBeDisabled to ${!newState}`);
      }
      
      // Verify the current state in WebGLInput if possible
      setTimeout(() => {
        if (window.WebGLInput && typeof window.WebGLInput.captureAllKeyboardInput !== 'undefined') {
          addLog(`Current WebGLInput.captureAllKeyboardInput = ${window.WebGLInput.captureAllKeyboardInput}`);
        }
      }, 500);
      
    } catch (error) {
      addLog(`Error toggling keyboard capture: ${error.message}`);
      toast({
        title: 'Error',
        description: `Failed to toggle keyboard capture: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Try most aggressive approach to disable Unity keyboard capture
  const forceDisableKeyboardCapture = () => {
    addLog('Attempting force disable of Unity keyboard capture');
    
    try {
      // Try all known methods
      if (window.dispatchReactUnityEvent) {
        window.dispatchReactUnityEvent('KeyboardCaptureRequest', JSON.stringify({ captureKeyboard: false }));
      }
      
      if (window.unityInstance) {
        if (window.unityInstance.SendMessage) {
          window.unityInstance.SendMessage("WebGLInput", "SetCaptureAllKeyboardInput", "false");
          window.unityInstance.SendMessage("ReactBridge", "HandleEvent", JSON.stringify({
            type: "KeyboardCaptureRequest",
            data: JSON.stringify({ captureKeyboard: false })
          }));
        }
        
        if (window.unityInstance.Module) {
          window.unityInstance.Module.WebGLInputHandler = null;
          addLog('Set window.unityInstance.Module.WebGLInputHandler = null');
        }
      }
      
      if (window.ReactUnity && window.ReactUnity.disableKeyboardCapture) {
        window.ReactUnity.disableKeyboardCapture();
      }
      
      // Set global flag
      window.unityKeyboardCaptureShouldBeDisabled = true;
      
      // Direct WebGL input access if available
      if (window.WebGLInput && typeof window.WebGLInput.captureAllKeyboardInput !== 'undefined') {
        window.WebGLInput.captureAllKeyboardInput = false;
        addLog('Direct set WebGLInput.captureAllKeyboardInput = false');
      }
      
      setKeyboardCaptured(false);
      addLog('Force disable completed');
      
      // Focus the test input
      if (testInputRef.current) {
        testInputRef.current.focus();
        addLog('Focused test input');
      }
      
      // Try adding event listeners to capture all keyboard events
      const preventKeyboardEvents = (e) => {
        // Only prevent if not targeting an input
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          addLog(`Prevented keyboard event: ${e.type} ${e.key}`);
          e.stopPropagation();
        }
      };
      
      // Add capturing event listeners to steal keyboard events
      document.addEventListener('keydown', preventKeyboardEvents, true);
      document.addEventListener('keyup', preventKeyboardEvents, true);
      
      setTimeout(() => {
        // Remove event listeners after a few seconds
        document.removeEventListener('keydown', preventKeyboardEvents, true);
        document.removeEventListener('keyup', preventKeyboardEvents, true);
        addLog('Removed temporary keyboard event prevention');
      }, 5000);
      
    } catch (error) {
      addLog(`Error during force disable: ${error.message}`);
      toast({
        title: 'Error',
        description: `Failed to disable keyboard capture: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Try most aggressive approach to enable Unity keyboard capture
  const forceEnableKeyboardCapture = () => {
    addLog('Attempting force enable of Unity keyboard capture');
    
    try {
      // Try all known methods
      if (window.dispatchReactUnityEvent) {
        window.dispatchReactUnityEvent('KeyboardCaptureRequest', JSON.stringify({ captureKeyboard: true }));
      }
      
      if (window.unityInstance) {
        if (window.unityInstance.SendMessage) {
          window.unityInstance.SendMessage("WebGLInput", "SetCaptureAllKeyboardInput", "true");
          window.unityInstance.SendMessage("ReactBridge", "HandleEvent", JSON.stringify({
            type: "KeyboardCaptureRequest",
            data: JSON.stringify({ captureKeyboard: true })
          }));
        }
      }
      
      if (window.ReactUnity && window.ReactUnity.enableKeyboardCapture) {
        window.ReactUnity.enableKeyboardCapture();
      }
      
      // Set global flag
      window.unityKeyboardCaptureShouldBeDisabled = false;
      
      // Direct WebGL input access if available
      if (window.WebGLInput && typeof window.WebGLInput.captureAllKeyboardInput !== 'undefined') {
        window.WebGLInput.captureAllKeyboardInput = true;
        addLog('Direct set WebGLInput.captureAllKeyboardInput = true');
      }
      
      setKeyboardCaptured(true);
      addLog('Force enable completed');
    } catch (error) {
      addLog(`Error during force enable: ${error.message}`);
      toast({
        title: 'Error',
        description: `Failed to enable keyboard capture: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Test modal handlers
  const handleOpenModal = () => {
    addLog('Opening test modal');
    onOpen();
    
    // When modal opens, disable Unity keyboard capture
    forceDisableKeyboardCapture();
    
    // Focus the modal input after a short delay
    setTimeout(() => {
      if (modalInputRef.current) {
        modalInputRef.current.focus();
        addLog('Focused modal input');
      }
    }, 200);
  };

  const handleCloseModal = () => {
    addLog('Closing test modal');
    onClose();
    
    // Re-enable Unity keyboard capture when modal closes
    if (keyboardCaptured) {
      forceEnableKeyboardCapture();
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  return (
    <Box p={4} bg="gray.800" color="white" borderRadius="md" maxW="800px" mx="auto" my={4}>
      <Heading size="md" mb={2}>Unity Keyboard Control Tester</Heading>
      
      {/* Unity Status */}
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={4}>
          <Badge colorScheme={unityDetected ? "green" : "red"}>
            Unity: {unityDetected ? "Detected" : "Not Detected"}
          </Badge>
          <Badge colorScheme={unityBridgeDetected ? "green" : "red"}>
            Bridge: {unityBridgeDetected ? "Detected" : "Not Detected"}
          </Badge>
        </HStack>
        
        <Button 
          colorScheme="blue" 
          size="xs" 
          onClick={testUnityConnection}
          leftIcon={<span>🔄</span>}
        >
          Test Connection
        </Button>
      </Flex>
      
      {/* Method Selector */}
      <FormControl mb={4}>
        <FormLabel htmlFor="method-select" fontSize="sm">Communication Method:</FormLabel>
        <Select 
          id="method-select"
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          size="sm"
          bg="gray.700"
        >
          <option value="all">All Methods (recommended)</option>
          <option value="dispatchEvent">dispatchReactUnityEvent</option>
          <option value="webGLInput">WebGLInput.SetCaptureAllKeyboardInput</option>
          <option value="reactBridge">ReactBridge.HandleEvent</option>
          <option value="reactUnity">ReactUnity helpers</option>
          <option value="globalFlag">Global Flag</option>
        </Select>
      </FormControl>
      
      {/* Control Panel */}
      <HStack spacing={4} mb={4}>
        <FormControl display="flex" alignItems="center" width="auto">
          <FormLabel htmlFor="keyboard-capture" mb="0" fontSize="sm">
            Unity Keyboard Capture
          </FormLabel>
          <Switch 
            id="keyboard-capture"
            isChecked={keyboardCaptured}
            onChange={handleKeyboardCaptureToggle}
            colorScheme="blue"
          />
        </FormControl>
        
        <Tooltip label="Try all available methods to disable Unity keyboard capture">
          <Button colorScheme="red" onClick={forceDisableKeyboardCapture} size="sm">
            Force Disable
          </Button>
        </Tooltip>
        
        <Tooltip label="Try all available methods to enable Unity keyboard capture">
          <Button colorScheme="green" onClick={forceEnableKeyboardCapture} size="sm">
            Force Enable
          </Button>
        </Tooltip>
        
        <Button colorScheme="purple" onClick={handleOpenModal} size="sm">
          Test Modal
        </Button>
      </HStack>
      
      {/* Test Alert */}
      <Alert status="info" mb={4} fontSize="sm" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle fontSize="sm">Test Instructions</AlertTitle>
          <AlertDescription fontSize="xs">
            1. Click "Force Disable" then try typing in the inputs below<br />
            2. Click "Force Enable" then try typing in the inputs (text should go to Unity)<br />
            3. Click "Test Modal" to check modal focus behavior
          </AlertDescription>
        </Box>
      </Alert>
      
      {/* Test Inputs */}
      <VStack spacing={4} align="stretch" mb={4}>
        <Text fontWeight="bold" fontSize="sm">Test Inputs:</Text>
        
        <Input 
          placeholder="Type here to test keyboard input"
          ref={testInputRef}
          bg="gray.700"
          _focus={{ bg: "gray.600", borderColor: "blue.300" }}
          onClick={() => {
            addLog('Test input clicked, attempting to focus');
            forceDisableKeyboardCapture();
          }}
        />
        
        <Textarea 
          placeholder="Try typing in this textarea"
          ref={textareaRef}
          bg="gray.700"
          _focus={{ bg: "gray.600", borderColor: "blue.300" }}
          size="sm"
          onClick={() => {
            addLog('Textarea clicked, attempting to focus');
            forceDisableKeyboardCapture();
          }}
        />
      </VStack>
      
      {/* Debug Logs */}
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold" fontSize="sm">Debug Logs:</Text>
          <Button size="xs" onClick={clearLogs}>Clear</Button>
        </HStack>
        
        <Box 
          bg="black" 
          p={2} 
          borderRadius="md" 
          maxH="200px" 
          overflowY="auto"
          fontSize="xs"
          fontFamily="monospace"
        >
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <Text key={index} py={0.5}>{log}</Text>
            ))
          ) : (
            <Text color="gray.500">No logs yet</Text>
          )}
        </Box>
      </Box>
      
      {/* Test Modal */}
      <Modal isOpen={isOpen} onClose={handleCloseModal}>
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Test Modal</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>This modal helps test keyboard focus handling when dialogs are open.</Text>
              
              <Input 
                placeholder="Type here in the modal"
                ref={modalInputRef}
                bg="gray.700"
                _focus={{ bg: "gray.600", borderColor: "blue.300" }}
              />
              
              <Textarea 
                placeholder="Modal textarea for testing"
                bg="gray.700"
                _focus={{ bg: "gray.600", borderColor: "blue.300" }}
                size="sm"
              />
              
              <Box bg="gray.900" p={2} borderRadius="md">
                <Text fontSize="sm" fontWeight="bold" mb={1}>
                  Current State:
                </Text>
                <HStack spacing={2}>
                  <Badge colorScheme={keyboardCaptured ? "green" : "red"}>
                    {keyboardCaptured ? "Unity Capturing" : "React Capturing"}
                  </Badge>
                  <Badge colorScheme="blue">Modal Open</Badge>
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleCloseModal}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TestUnityKeyboardControl; 