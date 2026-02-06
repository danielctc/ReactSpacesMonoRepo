import ReactDOM from "react-dom/client";

import { UserProvider } from "@disruptive-spaces/shared/providers/UserProvider";
import Chat from "./Chat";
import "./index.css";

const rootElement = document.getElementById("chat-root");

if (rootElement) {
  const spaceID = rootElement.getAttribute("data-space-id");

  const App = () => {
    return (
      <UserProvider>
        <Chat spaceID={spaceID} />
      </UserProvider>
    );
  };

  ReactDOM.createRoot(rootElement).render(<App />);
} else {
  console.error("Root element 'chat-root' not found.");
}

export default Chat;
