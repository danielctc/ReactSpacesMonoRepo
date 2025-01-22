import React from "react";
import { Button } from "@chakra-ui/react";
import { useSendUnityEvent } from "../../hooks/unityEvents";

function RaiseHelloFromReactEvent() {
  // Call the hook at the top level of the component
  const sendUnityEvent = useSendUnityEvent();

  // Function to raise the event with data
  const handleButtonClick = () => {
    const helloFromReactData = {
      name: "Neil woz ere",
      reactAge: 21,
    };
    sendUnityEvent("HelloFromReact", helloFromReactData);
  };

  return (
    <Button onClick={handleButtonClick}>Raise HelloFromReact Event</Button>
  );
}

export default RaiseHelloFromReactEvent;
