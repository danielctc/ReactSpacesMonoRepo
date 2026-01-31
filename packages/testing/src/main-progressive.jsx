// Progressive test - add imports one by one to find the breaking point
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, Box, Text, VStack, Button } from "@chakra-ui/react";

console.log('Progressive test starting...');
console.log('React version:', React.version);

// Track which imports succeed
const importResults = {
  loadTheme: { status: 'pending', error: null },
  UserProvider: { status: 'pending', error: null },
  FullScreenProvider: { status: 'pending', error: null },
  HeaderAuthLinks: { status: 'pending', error: null },
  WebGLLoader: { status: 'pending', error: null },
  Chat: { status: 'pending', error: null },
};

function ImportStatus({ name, result }) {
  const colors = {
    pending: 'yellow.100',
    success: 'green.100',
    error: 'red.100',
  };

  return (
    <Box p={2} bg={colors[result.status]} borderRadius="md" mb={2}>
      <Text fontWeight="bold">{name}: {result.status.toUpperCase()}</Text>
      {result.error && (
        <Text fontSize="xs" color="red.600" mt={1}>
          {result.error.message}
        </Text>
      )}
    </Box>
  );
}

function App() {
  const [results, setResults] = useState(importResults);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const newResults = { ...results };

    // Test 1: loadTheme
    try {
      console.log('Testing loadTheme...');
      const { loadTheme } = await import("@disruptive-spaces/shared/themes/loadTheme");
      newResults.loadTheme = { status: 'success', error: null };
      console.log('loadTheme imported successfully');
    } catch (err) {
      console.error('loadTheme failed:', err);
      newResults.loadTheme = { status: 'error', error: err };
    }
    setResults({ ...newResults });

    // Test 2: UserProvider
    try {
      console.log('Testing UserProvider...');
      const { UserProvider } = await import("@disruptive-spaces/shared/providers/UserProvider");
      newResults.UserProvider = { status: 'success', error: null };
      console.log('UserProvider imported successfully');
    } catch (err) {
      console.error('UserProvider failed:', err);
      newResults.UserProvider = { status: 'error', error: err };
    }
    setResults({ ...newResults });

    // Test 3: FullScreenProvider
    try {
      console.log('Testing FullScreenProvider...');
      const { FullScreenProvider } = await import("@disruptive-spaces/shared/providers/FullScreenProvider");
      newResults.FullScreenProvider = { status: 'success', error: null };
      console.log('FullScreenProvider imported successfully');
    } catch (err) {
      console.error('FullScreenProvider failed:', err);
      newResults.FullScreenProvider = { status: 'error', error: err };
    }
    setResults({ ...newResults });

    // Test 4: HeaderAuthLinks
    try {
      console.log('Testing HeaderAuthLinks...');
      const HeaderAuthLinks = await import("@disruptive-spaces/header-auth-links/src/HeaderAuthLinks.jsx");
      newResults.HeaderAuthLinks = { status: 'success', error: null };
      console.log('HeaderAuthLinks imported successfully');
    } catch (err) {
      console.error('HeaderAuthLinks failed:', err);
      newResults.HeaderAuthLinks = { status: 'error', error: err };
    }
    setResults({ ...newResults });

    // Test 5: WebGLLoader
    try {
      console.log('Testing WebGLLoader...');
      const WebGLLoader = await import("@disruptive-spaces/webgl/src/WebGLLoader.jsx");
      newResults.WebGLLoader = { status: 'success', error: null };
      console.log('WebGLLoader imported successfully');
    } catch (err) {
      console.error('WebGLLoader failed:', err);
      newResults.WebGLLoader = { status: 'error', error: err };
    }
    setResults({ ...newResults });

    // Test 6: Chat
    try {
      console.log('Testing Chat...');
      const Chat = await import("@disruptive-spaces/chat/src/Chat.jsx");
      newResults.Chat = { status: 'success', error: null };
      console.log('Chat imported successfully');
    } catch (err) {
      console.error('Chat failed:', err);
      newResults.Chat = { status: 'error', error: err };
    }
    setResults({ ...newResults });

    setTesting(false);
  };

  return (
    <ChakraProvider>
      <Box p={4} maxW="800px" mx="auto">
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Progressive Import Test
        </Text>
        <Text mb={4}>Click the button to test each workspace import:</Text>

        <Button
          colorScheme="blue"
          onClick={runTests}
          isLoading={testing}
          mb={4}
        >
          Run Import Tests
        </Button>

        <VStack align="stretch" spacing={2}>
          {Object.entries(results).map(([name, result]) => (
            <ImportStatus key={name} name={name} result={result} />
          ))}
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
