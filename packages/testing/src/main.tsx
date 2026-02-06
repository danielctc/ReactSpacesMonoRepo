// @jsxImportSource react
import React, { Component, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { UserProvider } from "@disruptive-spaces/shared/providers/UserProvider";
import { FullScreenProvider } from "@disruptive-spaces/shared/providers/FullScreenProvider";
import "./index.css";

// Import the raw components instead of the packaged versions to avoid duplicate UserProviders
import HeaderAuthLinks from "@disruptive-spaces/header-auth-links/src/HeaderAuthLinks";
import WebGLLoader from "@disruptive-spaces/webgl/src/WebGLLoader";
import Chat from "@disruptive-spaces/chat/src/Chat";

// Error Boundary for WebGL component
interface ErrorBoundaryState {
    hasError: boolean;
}

class WebGLErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('WebGL Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-100 text-red-900 rounded-md">
                    <p>WebGL component error. Please refresh the page.</p>
                </div>
            );
        }

        return this.props.children;
    }
}

const rootElement = document.getElementById("root");

if (rootElement) {
    const spaceID = rootElement.getAttribute("data-space-id");

    const App = () => (
        <UserProvider>
            <FullScreenProvider>
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center p-4 bg-gray-700 m-0 relative z-[100]">
                        <span className="text-xl font-bold text-white">LOGO</span>
                        <div className="z-[100] relative">
                            <HeaderAuthLinks />
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto w-full p-0 z-[1]">
                        <div className="aspect-video bg-blue-100 m-0">
                            <div id="webgl-root" data-space-id={spaceID} className="w-full m-0">
                                <WebGLErrorBoundary>
                                    <WebGLLoader spaceID={spaceID} />
                                </WebGLErrorBoundary>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto w-full p-0">
                        <Chat spaceID={spaceID} />
                    </div>
                </div>
            </FullScreenProvider>
        </UserProvider>
    );

    // Remove StrictMode and render directly
    ReactDOM.createRoot(rootElement).render(<App />);
} else {
    console.error("Root element 'root' not found.");
}

export default Chat;
