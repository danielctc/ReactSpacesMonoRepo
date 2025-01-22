import React, { useState, useEffect, Component } from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider, Box, Flex, VStack, AspectRatio, Text, Container } from "@chakra-ui/react";
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
    const initialThemeName = rootElement ? rootElement.getAttribute("data-theme") || "default" : "default";

    const App = () => {
        const [theme, setTheme] = useState(null);

        useEffect(() => {
            loadTheme(initialThemeName).then(setTheme);
        }, []);

        useEffect(() => {
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    console.log('Tab is hidden');
                } else {
                    console.log('Tab is visible');
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
            <>
                {theme && (
                    <ChakraProvider theme={theme}>
                        <UserProvider>
                            <FullScreenProvider>
                                <VStack spacing={4} align="stretch">
                                    <Flex justify="space-between" align="center" p={4} bg="gray.700" m={0}>
                                        <Text fontSize="xl" fontWeight="bold" color="white">LOGO</Text>
                                        <HeaderAuthLinks />
                                    </Flex>

                                    <Container maxW="container.xl" p={0}>
                                        <AspectRatio ratio={16 / 9} bg="blue.100" m={0}>
                                            <Box id="webgl-root" data-space-id={spaceID} w="100%" m={0}>
                                                <WebGLErrorBoundary>
                                                    <WebGLLoader spaceID={spaceID} />
                                                </WebGLErrorBoundary>
                                            </Box>
                                        </AspectRatio>
                                    </Container>

                                    <Container maxW="container.xl" p={0}>
                                        <Chat spaceID={spaceID} />
                                    </Container>
                                </VStack>
                            </FullScreenProvider>
                        </UserProvider>
                    </ChakraProvider>
                )}
            </>
        );
    };

    ReactDOM.createRoot(rootElement).render(<App />);
} else {
    console.error("Root element 'root' not found.");
}

export default Chat;