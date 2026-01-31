// Chakra test - progressively add to isolate failure point
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

console.log('Starting Chakra test...');
console.log('React version:', React.version);

// Step 1: Test basic React
const BasicTest = () => {
  const [count, setCount] = useState(0);
  return (
    <div style={{ padding: '20px', background: '#d4edda', marginBottom: '20px', borderRadius: '8px' }}>
      <h2>Step 1: Basic React - PASSED</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
};

// Step 2: Dynamic Chakra loader
const ChakraTest = () => {
  const [chakraLoaded, setChakraLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [ChakraComponents, setChakraComponents] = useState(null);

  useEffect(() => {
    console.log('Attempting to import Chakra...');
    import("@chakra-ui/react")
      .then((module) => {
        console.log('Chakra imported successfully', module);
        setChakraComponents(module);
        setChakraLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to import Chakra:', err);
        setError(err);
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#f8d7da', borderRadius: '8px' }}>
        <h2>Step 2: Chakra Import - FAILED</h2>
        <pre style={{ overflow: 'auto', fontSize: '12px' }}>{error.message}</pre>
        <pre style={{ overflow: 'auto', fontSize: '10px', maxHeight: '200px' }}>{error.stack}</pre>
      </div>
    );
  }

  if (!chakraLoaded || !ChakraComponents) {
    return (
      <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h2>Step 2: Loading Chakra...</h2>
      </div>
    );
  }

  // If we get here, try to render Chakra
  const { ChakraProvider, Box, Button, Text } = ChakraComponents;

  return (
    <ChakraProvider>
      <Box p={4} bg="blue.100" borderRadius="md">
        <Text fontSize="xl" fontWeight="bold">Step 2: Chakra UI - PASSED</Text>
        <Text>Chakra components rendered successfully!</Text>
        <Button colorScheme="blue" mt={2}>
          Chakra Button
        </Button>
      </Box>
    </ChakraProvider>
  );
};

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Progressive Chakra UI Test</h1>
      <BasicTest />
      <ChakraTest />
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log('Mounting app...');
  ReactDOM.createRoot(rootElement).render(<App />);
} else {
  console.error("Root element not found");
}
