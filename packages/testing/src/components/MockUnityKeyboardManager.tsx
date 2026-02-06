import React, { useEffect, useState } from 'react';
import './MockUnityKeyboardManager.css';

export const MockUnityKeyboardManager = () => {
  const [keyboardStatus, setKeyboardStatus] = useState('active');
  const [logs, setLogs] = useState([]);
  
  const addLog = (message) => {
    setLogs(prev => [
      { id: Date.now(), text: `[${new Date().toISOString().substr(11, 8)}] ${message}` },
      ...prev.slice(0, 19) // Keep only the 20 most recent logs
    ]);
  };

  useEffect(() => {
    // Mock window.unityInstance for testing
    if (!window.unityInstance) {
      window.unityInstance = {
        SendMessage: (obj, method, value) => {
          addLog(`Unity SendMessage: ${obj}.${method}(${value})`);
          
          if (obj === 'WebGLInput' && method === 'SetCaptureAllKeyboardInput') {
            if (value === false || value === 'false') {
              setKeyboardStatus('disabled');
              addLog('Unity keyboard input disabled');
            } else {
              setKeyboardStatus('active');
              addLog('Unity keyboard input enabled');
            }
          }
        }
      };
      
      addLog('Mock Unity instance created');
    }
    
    // Listen for modal events
    const handleModalOpened = () => {
      addLog('Modal opened event detected');
    };
    
    const handleModalClosed = () => {
      addLog('Modal closed event detected');
    };
    
    window.addEventListener('modal-opened', handleModalOpened);
    window.addEventListener('modal-closed', handleModalClosed);
    
    // Handle document keydown events for Unity
    const handleKeyDown = (e) => {
      // Only log if we're not in an input or textarea
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (keyboardStatus === 'active' && !window.unityInputDisabled) {
          addLog(`Unity received key: ${e.key}`);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('modal-opened', handleModalOpened);
      window.removeEventListener('modal-closed', handleModalClosed);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [keyboardStatus]);
  
  return (
    <div className="mock-unity-manager">
      <div className="mock-unity-status">
        <h3>Unity WebGL Keyboard Status</h3>
        <div className={`status-indicator ${keyboardStatus}`}>
          Keyboard Capture: {keyboardStatus}
        </div>
        <div className="global-flags">
          <div>unityInputDisabled: {window.unityInputDisabled ? 'true' : 'false'}</div>
          <div>unityInputDisabledBy: {window.unityInputDisabledBy || 'none'}</div>
        </div>
      </div>
      
      <div className="unity-console">
        <h3>Unity Console</h3>
        <div className="console-logs">
          {logs.length === 0 ? (
            <div className="empty-log">No logs yet</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="log-entry">{log.text}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}; 