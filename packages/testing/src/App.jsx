import React from 'react';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Unity Input Manager Test</h1>
        <p>
          This demonstrates the keyboard input management between React and Unity WebGL.
          Click the button below to open a modal and test keyboard input capture.
        </p>
      </header>
      
      <main className="app-main">
        <div className="unity-container">
          <div className="mock-unity-canvas">
            <div className="mock-unity-ui">
              <h2>Mock Unity WebGL</h2>
              <p>This simulates a Unity WebGL canvas</p>
            </div>
          </div>
          <MockUnityKeyboardManager />
        </div>
        
        <div className="test-container">
          <InputTestModal />
          <UnityKeyboardDebug />
        </div>
      </main>
      
      <footer className="app-footer">
        <p>
          When the modal is open, keyboard input should be captured by React and not pass through to Unity.
          The console logs show the input management process and state changes.
        </p>
      </footer>
    </div>
  );
}

export default App; 