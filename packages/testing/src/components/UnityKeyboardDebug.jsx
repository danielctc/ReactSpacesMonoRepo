import React, { useState, useEffect } from 'react';
import { Box, Button, VStack, Text, Code, Heading, Divider } from '@chakra-ui/react';

/**
 * Debug component to test if Unity is properly receiving and processing
 * keyboard capture commands.
 */
const UnityKeyboardDebug = () => {
  const [logs, setLogs] = useState([]);
  const [unityAvailable, setUnityAvailable] = useState(false);
  const [captureState, setCaptureState] = useState('unknown');
  
  const addLog = (message) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    
  };
  
  // Check Unity availability on mount
  useEffect(() => {
    addLog('Checking Unity availability...');
    
    // Mock Unity instance if needed for testing
    if (!window.unityInstance) {
      addLog('Creating mock Unity instance for testing');
      window.unityInstance = {
        SendMessage: (objectName, methodName, message) => {
          addLog(`MOCK Unity SendMessage: ${objectName}.${methodName}(${message})`);
          if (objectName === 'WebGLInput' && methodName === 'SetCaptureAllKeyboardInput') {
            setCaptureState(message === 'true' || message === true ? 'enabled' : 'disabled');
          }
        }
      };
      setUnityAvailable(true);
      addLog('Mock Unity instance created');
    } else {
      // Inject logging into real Unity instance SendMessage
      const originalSendMessage = window.unityInstance.SendMessage;
      window.unityInstance.SendMessage = function(objectName, methodName, message) {
        addLog(`Unity SendMessage: ${objectName}.${methodName}(${message})`);
        if (objectName === 'WebGLInput' && methodName === 'SetCaptureAllKeyboardInput') {
          setCaptureState(message === 'true' || message === true ? 'enabled' : 'disabled');
        }
        return originalSendMessage.call(this, objectName, methodName, message);
      };
      setUnityAvailable(true);
      addLog('Real Unity instance detected and intercepted');
    }
    
    // Listen for modal events
    const handleModalOpened = () => {
      addLog('Event received: modal-opened');
    };
    
    const handleModalClosed = () => {
      addLog('Event received: modal-closed');
    };
    
    window.addEventListener('modal-opened', handleModalOpened);
    window.addEventListener('modal-closed', handleModalClosed);
    
    return () => {
      window.removeEventListener('modal-opened', handleModalOpened);
      window.removeEventListener('modal-closed', handleModalClosed);
    };
  }, []);
  
  // Directly test keyboard capture commands
  const testDisableCapture = () => {
    addLog('Testing: Disable keyboard capture');
    if (window.unityInstance) {
      try {
        window.unityInstance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', false);
        addLog('Command sent to disable keyboard capture');
      } catch (err) {
        addLog(`ERROR: ${err.message}`);
      }
    } else {
      addLog('ERROR: Unity instance not available');
    }
  };
  
  const testEnableCapture = () => {
    addLog('Testing: Enable keyboard capture');
    if (window.unityInstance) {
      try {
        window.unityInstance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', true);
        addLog('Command sent to enable keyboard capture');
      } catch (err) {
        addLog(`ERROR: ${err.message}`);
      }
    } else {
      addLog('ERROR: Unity instance not available');
    }
  };
  
  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };
  
  return (
    <Box p={4} bg="gray.800" color="white" borderRadius="md">
      <Heading size="md" mb={2}>Unity Keyboard Capture Debug</Heading>
      
      <Text fontSize="sm" mb={4}>
        This tool tests if Unity is properly receiving and processing keyboard capture commands.
      </Text>
      
      <Box mb={4} p={2} bg="gray.700" borderRadius="md">
        <Text fontWeight="bold" mb={1}>Status:</Text>
        <Text>Unity Available: {unityAvailable ? 'Yes' : 'No'}</Text>
        <Text>Keyboard Capture: {captureState}</Text>
      </Box>
      
      <VStack spacing={2} align="stretch" mb={4}>
        <Button colorScheme="red" onClick={testDisableCapture} size="sm">
          Disable Keyboard Capture
        </Button>
        <Button colorScheme="green" onClick={testEnableCapture} size="sm">
          Enable Keyboard Capture
        </Button>
        <Button colorScheme="gray" onClick={clearLogs} size="sm">
          Clear Logs
        </Button>
      </VStack>
      
      <Divider mb={4} />
      
      <Box>
        <Text fontWeight="bold" mb={2}>Event Logs:</Text>
        <Box
          height="200px"
          overflowY="auto"
          p={2}
          bg="black"
          borderRadius="md"
          fontFamily="monospace"
          fontSize="xs"
        >
          {logs.map((log, index) => (
            <Text key={index}>{log}</Text>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default UnityKeyboardDebug; 