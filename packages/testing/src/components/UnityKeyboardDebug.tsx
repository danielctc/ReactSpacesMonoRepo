import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    unityInstance?: {
      SendMessage: (objectName: string, methodName: string, message: string | boolean) => void;
    };
  }
}

/**
 * Debug component to test if Unity is properly receiving and processing
 * keyboard capture commands.
 */
const UnityKeyboardDebug: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [unityAvailable, setUnityAvailable] = useState(false);
  const [captureState, setCaptureState] = useState<'unknown' | 'enabled' | 'disabled'>('unknown');

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Check Unity availability on mount
  useEffect(() => {
    addLog('Checking Unity availability...');

    // Mock Unity instance if needed for testing
    if (!window.unityInstance) {
      addLog('Creating mock Unity instance for testing');
      window.unityInstance = {
        SendMessage: (objectName: string, methodName: string, message: string | boolean) => {
          addLog(`MOCK Unity SendMessage: ${objectName}.${methodName}(${message})`);
          if (objectName === 'WebGLInput' && methodName === 'SetCaptureAllKeyboardInput') {
            setCaptureState(message === 'true' || message === true ? 'enabled' : 'disabled');
          }
        }
      };
      setUnityAvailable(true);
      addLog('Mock Unity instance created');
    } else {
      // Inject logging into real Unity instance SendMessage
      const originalSendMessage = window.unityInstance.SendMessage;
      window.unityInstance.SendMessage = function(objectName: string, methodName: string, message: string | boolean) {
        addLog(`Unity SendMessage: ${objectName}.${methodName}(${message})`);
        if (objectName === 'WebGLInput' && methodName === 'SetCaptureAllKeyboardInput') {
          setCaptureState(message === 'true' || message === true ? 'enabled' : 'disabled');
        }
        return originalSendMessage.call(this, objectName, methodName, message);
      };
      setUnityAvailable(true);
      addLog('Real Unity instance detected and intercepted');
    }

    // Listen for modal events
    const handleModalOpened = () => {
      addLog('Event received: modal-opened');
    };

    const handleModalClosed = () => {
      addLog('Event received: modal-closed');
    };

    window.addEventListener('modal-opened', handleModalOpened);
    window.addEventListener('modal-closed', handleModalClosed);

    return () => {
      window.removeEventListener('modal-opened', handleModalOpened);
      window.removeEventListener('modal-closed', handleModalClosed);
    };
  }, []);

  // Directly test keyboard capture commands
  const testDisableCapture = () => {
    addLog('Testing: Disable keyboard capture');
    if (window.unityInstance) {
      try {
        window.unityInstance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', false);
        addLog('Command sent to disable keyboard capture');
      } catch (err: any) {
        addLog(`ERROR: ${err.message}`);
      }
    } else {
      addLog('ERROR: Unity instance not available');
    }
  };

  const testEnableCapture = () => {
    addLog('Testing: Enable keyboard capture');
    if (window.unityInstance) {
      try {
        window.unityInstance.SendMessage('WebGLInput', 'SetCaptureAllKeyboardInput', true);
        addLog('Command sent to enable keyboard capture');
      } catch (err: any) {
        addLog(`ERROR: ${err.message}`);
      }
    } else {
      addLog('ERROR: Unity instance not available');
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-md">
      <h2 className="text-lg font-bold mb-2">Unity Keyboard Capture Debug</h2>

      <p className="text-sm mb-4">
        This tool tests if Unity is properly receiving and processing keyboard capture commands.
      </p>

      <div className="mb-4 p-2 bg-gray-700 rounded-md">
        <p className="font-bold mb-1">Status:</p>
        <p>Unity Available: {unityAvailable ? 'Yes' : 'No'}</p>
        <p>Keyboard Capture: {captureState}</p>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <button className="btn btn-error btn-sm" onClick={testDisableCapture}>
          Disable Keyboard Capture
        </button>
        <button className="btn btn-success btn-sm" onClick={testEnableCapture}>
          Enable Keyboard Capture
        </button>
        <button className="btn btn-ghost btn-sm" onClick={clearLogs}>
          Clear Logs
        </button>
      </div>

      <div className="divider mb-4"></div>

      <div>
        <p className="font-bold mb-2">Event Logs:</p>
        <div className="h-[200px] overflow-y-auto p-2 bg-black rounded-md font-mono text-xs">
          {logs.map((log, index) => (
            <p key={index}>{log}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnityKeyboardDebug;
