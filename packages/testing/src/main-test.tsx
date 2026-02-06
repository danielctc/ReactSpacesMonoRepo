// Minimal React test - no Chakra or framer-motion
import React, { useState } from "react";
import ReactDOM from "react-dom/client";

console.log('React version:', React.version);

function TestApp() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>React Test</h1>
      <p>If you see this, React is working!</p>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log('Mounting React app...');
  ReactDOM.createRoot(rootElement).render(<TestApp />);
} else {
  console.error("Root element not found");
}
