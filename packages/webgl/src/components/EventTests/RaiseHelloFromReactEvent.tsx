import React from "react";
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
    <button onClick={handleButtonClick} className="btn btn-primary">
      Raise HelloFromReact Event
    </button>
  );
}

export default RaiseHelloFromReactEvent;
