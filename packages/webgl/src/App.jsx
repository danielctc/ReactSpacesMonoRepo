import React, { useState } from 'react';
import { CanvasMainMenu } from './components/CanvasMainMenu';
import { UnityPlayerList } from './components/UnityPlayerList';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

function App() {
  const [isPlayerListVisible, setIsPlayerListVisible] = useState(true);

  const handleTogglePlayerList = () => {
    Logger.log("App: Toggling player list visibility");
    setIsPlayerListVisible(!isPlayerListVisible);
  };

  return (
    <>
      <CanvasMainMenu onTogglePlayerList={handleTogglePlayerList} />
      <UnityPlayerList 
        isVisible={isPlayerListVisible} 
        onToggleVisibility={handleTogglePlayerList} 
      />
      {/* Other components */}
    </>
  );
}

export default App; 