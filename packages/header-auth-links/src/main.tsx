import React from "react";
import ReactDOM from "react-dom/client";
import { UserProvider } from "@disruptive-spaces/shared/providers/UserProvider";
import { FullScreenProvider } from "@disruptive-spaces/shared/providers/FullScreenProvider";
import HeaderAuthLinks from "./HeaderAuthLinks";
import RegistrationOverlay from "@disruptive-spaces/shared/components/auth/RegistrationOverlay";
import "./index.css";

const rootElement = document.getElementById("header-auth-root");

if (rootElement) {
    const App = () => {
        return (
            <UserProvider>
                <FullScreenProvider>
                    <HeaderAuthLinks />
                    <RegistrationOverlay />
                </FullScreenProvider>
            </UserProvider>
        );
    };

    ReactDOM.createRoot(rootElement).render(<App />);
} else {
    console.error("Root element 'header-auth-root' not found.");
}

export default HeaderAuthLinks;
