import React, { useState, useEffect } from 'react';
import { CanvasMainMenu } from './components/CanvasMainMenu';
import { UnityPlayerList } from './components/UnityPlayerList';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import HLSStreamTest from './components/EventTests/HLSStreamTest';

function App() {
  const [isPlayerListVisible, setIsPlayerListVisible] = useState(true);
  const [spaceID, setSpaceID] = useState(null);
  const [showHLSTest, setShowHLSTest] = useState(false);

  // Get spaceID from the root element
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (rootElement && rootElement.getAttribute('data-space-id')) {
      setSpaceID(rootElement.getAttribute('data-space-id'));
    }
    
    // For development/testing purposes, check for HLS test flag
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('hlstest') === 'true') {
      setShowHLSTest(true);
    }
  }, []);

  const handleTogglePlayerList = () => {
    Logger.log("App: Toggling player list visibility");
    setIsPlayerListVisible(!isPlayerListVisible);
  };

  return (
    <>
      <CanvasMainMenu 
        onTogglePlayerList={handleTogglePlayerList} 
        spaceID={spaceID}
      />
      <UnityPlayerList 
        isVisible={isPlayerListVisible} 
        onToggleVisibility={handleTogglePlayerList} 
      />
      
      {/* HLS Stream Test Component - only shown if URL has ?hlstest=true */}
      {showHLSTest && (
        <div style={{ 
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '400px',
          zIndex: 1000
        }}>
          <HLSStreamTest />
        </div>
      )}
    </>
  );
}

export default App; 