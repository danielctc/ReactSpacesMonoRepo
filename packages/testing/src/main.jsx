import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, Box, Flex, VStack, AspectRatio, Text, Container, Button } from "@chakra-ui/react";
import { loadTheme } from "@disruptive-spaces/shared/themes/loadTheme";
import { UserProvider } from "@disruptive-spaces/shared/providers/UserProvider";
import { FullScreenProvider } from "@disruptive-spaces/shared/providers/FullScreenProvider";

import HeaderAuthLinks from "@disruptive-spaces/header-auth-links";
import WebGLLoader from "@disruptive-spaces/webgl";
import Chat from "@disruptive-spaces/chat";

// Error Boundary for WebGL component
class WebGLErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('WebGL Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box p={4} bg="red.100" color="red.900" borderRadius="md">
                    <Text>WebGL component error. Please refresh the page.</Text>
                </Box>
            );
        }

        return this.props.children;
    }
}

const rootElement = document.getElementById("root");

if (rootElement) {
    const spaceID = rootElement.getAttribute("data-space-id");
    const initialThemeName = rootElement.getAttribute("data-theme") || "default";

    const App = () => {
        const [theme, setTheme] = useState(null);
        // Add this state for voice chat debug panel
        const [showDebugPanel, setShowDebugPanel] = useState(false);

        // Combine useEffects and remove console.logs
        useEffect(() => {
            // Load theme
            loadTheme(initialThemeName).then(setTheme);

            // Handle visibility
            const handleVisibilityChange = () => {
                if (!document.hidden) {
                    // Only reload theme when tab becomes visible
                    loadTheme(initialThemeName).then(setTheme);
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            };
        }, []);

        if (!theme) {
            return <div>Loading theme...</div>;
        }

        return (
            <ChakraProvider theme={theme}>
                <UserProvider>
                    <FullScreenProvider>
                        <VStack spacing={4} align="stretch">
                            <Flex 
                                justify="space-between" 
                                align="center" 
                                p={4} 
                                bg="gray.700" 
                                m={0}
                                position="relative"
                                zIndex="100"
                            >
                                <Text fontSize="xl" fontWeight="bold" color="white">LOGO</Text>
                                <Box zIndex="100" position="relative">
                                    <HeaderAuthLinks />
                                </Box>
                            </Flex>

                            <Container maxW="container.xl" p={0} zIndex="1">
                                <AspectRatio ratio={16 / 9} bg="blue.100" m={0}>
                                    <Box id="webgl-root" data-space-id={spaceID} w="100%" m={0}>
                                        <WebGLErrorBoundary>
                                            <WebGLLoader spaceID={spaceID} />
                                        </WebGLErrorBoundary>
                                    </Box>
                                </AspectRatio>
                            </Container>

                            {/* Add Voice Chat Debug Panel Toggle */}
                            <Container maxW="container.xl" p={2}>
                                <Button 
                                    size="sm" 
                                    colorScheme="blue" 
                                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                                >
                                    {showDebugPanel ? "Hide Voice Chat Debug" : "Show Voice Chat Debug"}
                                </Button>
                                
                                {showDebugPanel && (
                                    <Box mt={2} p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
                                        <AgoraProvider appId="a2a7f4eb05284449b1063eb71d8301dc" channel={spaceID || "default-channel"}>
                                            <VoiceChatDebugPanel />
                                        </AgoraProvider>
                                    </Box>
                                )}
                            </Container>

                            <Container maxW="container.xl" p={0}>
                                <Chat spaceID={spaceID} />
                            </Container>
                        </VStack>
                    </FullScreenProvider>
                </UserProvider>
            </ChakraProvider>
        );
    };

    // Remove StrictMode and render directly
    ReactDOM.createRoot(rootElement).render(<App />);
} else {
    console.error("Root element 'root' not found.");
}

export default Chat;