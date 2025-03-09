import React, { useState, useEffect } from 'react';
import { CanvasMainMenu } from './components/CanvasMainMenu';
import { UnityPlayerList } from './components/UnityPlayerList';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

function App() {
  const [isPlayerListVisible, setIsPlayerListVisible] = useState(true);
  const [spaceID, setSpaceID] = useState(null);

  // Get spaceID from the root element
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (rootElement && rootElement.getAttribute('data-space-id')) {
      setSpaceID(rootElement.getAttribute('data-space-id'));
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
      {/* Other components */}
    </>
  );
}

export default App; 