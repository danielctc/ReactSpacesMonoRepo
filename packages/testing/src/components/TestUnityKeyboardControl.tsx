import React, { useState, useRef, useEffect } from 'react';

declare global {
  interface Window {
    unityInstance?: {
      SendMessage: (objectName: string, methodName: string, message: string | boolean) => void;
      Module?: any;
    };
    dispatchReactUnityEvent?: (eventName: string, eventData: string) => void;
    ReactUnity?: {
      enableKeyboardCapture?: () => void;
      disableKeyboardCapture?: () => void;
    };
    unityKeyboardCaptureShouldBeDisabled?: boolean;
    WebGLInput?: {
      captureAllKeyboardInput: boolean;
    };
  }
}

/**
 * TestUnityKeyboardControl - A component to test keyboard control between React and Unity
 *
 * This component helps debug keyboard focus issues by:
 * 1. Providing UI controls to test different keyboard capture methods
 * 2. Displaying debug info about the current state
 * 3. Including a test modal with input fields
 */
const TestUnityKeyboardControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [keyboardCaptured, setKeyboardCaptured] = useState(false);
  const [unityDetected, setUnityDetected] = useState(false);
  const [unityBridgeDetected, setUnityBridgeDetected] = useState(false);
  const [testCounter, setTestCounter] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState('all');
  const testInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 29)]);
  };

  // Check for Unity availability and setup debugging
  useEffect(() => {
    addLog('Component mounted, checking Unity environment');
    let unityFound = false;
    let bridgeFound = false;

    // Check for unity instance
    if (window.unityInstance) {
      addLog('✓ window.unityInstance available');
      unityFound = true;

      // Add debug hook to track WebGLInput
      const origSendMessage = window.unityInstance.SendMessage;
      if (origSendMessage) {
        window.unityInstance.SendMessage = function(objectName: string, methodName: string, message: string | boolean) {
          addLog(`Unity SendMessage: ${objectName}.${methodName}(${message})`);
          return origSendMessage.call(this, objectName, methodName, message);
        };
        addLog('✓ Hooked SendMessage for debugging');
      }
    } else {
      addLog('✗ window.unityInstance not available');
    }

    // Check for dispatch method
    if (window.dispatchReactUnityEvent) {
      addLog('✓ window.dispatchReactUnityEvent available');
      bridgeFound = true;

      // Hook the dispatch method
      const origDispatch = window.dispatchReactUnityEvent;
      window.dispatchReactUnityEvent = function(eventName: string, eventData: string) {
        addLog(`dispatchReactUnityEvent: ${eventName}(${eventData})`);
        return origDispatch.call(this, eventName, eventData);
      };
      addLog('✓ Hooked dispatchReactUnityEvent for debugging');
    } else {
      addLog('✗ window.dispatchReactUnityEvent not available');
    }

    if (window.ReactUnity) {
      addLog('✓ window.ReactUnity available');
      bridgeFound = true;
    } else {
      addLog('✗ window.ReactUnity not available');
    }

    // Try to locate Unity canvas to confirm connection
    const unityCanvas = document.querySelector('#unity-canvas');
    if (unityCanvas) {
      addLog('✓ #unity-canvas element found in DOM');
      unityFound = true;
    } else {
      addLog('✗ #unity-canvas element not found in DOM');
    }

    // Create a mock if Unity instance isn't available (for testing)
    if (!window.unityInstance && !window.dispatchReactUnityEvent) {
      addLog('💡 Creating mock Unity environment for testing');
      window.unityInstance = {
        SendMessage: (objectName: string, methodName: string, message: string | boolean) => {
          addLog(`Mock SendMessage: ${objectName}.${methodName}(${message})`);
        }
      };

      window.dispatchReactUnityEvent = (eventName: string, eventData: string) => {
        addLog(`Mock dispatchReactUnityEvent: ${eventName}(${eventData})`);
      };

      addLog('✓ Mock Unity environment created');
    }

    // Check WebGL parameter access
    try {
      // Create a proxy for WebGLInput to track changes
      if (!window.WebGLInput) {
        window.WebGLInput = {
          captureAllKeyboardInput: true
        };
        addLog('✓ Created WebGLInput proxy for debugging');
      }

      addLog('✓ WebGLInput property monitoring added');
    } catch (err: any) {
      addLog(`Error setting up WebGLInput monitoring: ${err.message}`);
    }

    // Send a test message to Unity to verify connection
    setTimeout(() => {
      testUnityConnection();
    }, 1000);

    setUnityDetected(unityFound);
    setUnityBridgeDetected(bridgeFound);
  }, []);

  // Test the connection to Unity
  const testUnityConnection = () => {
    setTestCounter(prev => prev + 1);
    const pingId = Date.now();
    addLog(`Testing Unity connection (test #${testCounter+1}, id: ${pingId})...`);

    let messageSent = false;

    try {
      // Method 1: Unity bridge
      if (window.dispatchReactUnityEvent) {
        window.dispatchReactUnityEvent('ReactPing', JSON.stringify({
          pingId: pingId,
          message: 'Testing connection to Unity'
        }));
        addLog(`Sent ping via dispatchReactUnityEvent (id: ${pingId})`);
        messageSent = true;
      }

      // Method 2: Direct SendMessage to ReactBridge
      if (window.unityInstance?.SendMessage) {
        window.unityInstance.SendMessage("ReactBridge", "HandleEvent", JSON.stringify({
          type: "ReactPing",
          data: JSON.stringify({
            pingId: pingId,
            message: 'Testing direct SendMessage connection to Unity'
          })
        }));
        addLog(`Sent ping via SendMessage to ReactBridge (id: ${pingId})`);
        messageSent = true;
      }

      // Method 3: WebGLInput status check
      if (window.unityInstance?.SendMessage) {
        window.unityInstance.SendMessage("WebGLInput", "GetCaptureStatus", "");
        addLog(`Requested WebGLInput capture status`);
        messageSent = true;
      }

      if (!messageSent) {
        addLog('❌ No methods available to send messages to Unity');
        console.log('Unity Connection Failed: No communication methods available');
      } else {
        addLog(`✓ Test messages sent to Unity, waiting for response...`);
        setTimeout(() => {
          console.log('Test Messages Sent: Check Unity console for responses');
        }, 1000);
      }
    } catch (error: any) {
      addLog(`❌ Error testing Unity connection: ${error.message}`);
      console.error('Unity Connection Error:', error.message);
    }
  };

  // Handle keyboard state change
  const handleKeyboardCaptureToggle = () => {
    const newState = !keyboardCaptured;
    setKeyboardCaptured(newState);

    try {
      if (selectedMethod === 'all' || selectedMethod === 'dispatchEvent') {
        // Method 1: window.dispatchReactUnityEvent
        if (window.dispatchReactUnityEvent) {
          addLog(`Dispatching KeyboardCaptureRequest with captureKeyboard: ${newState}`);
          window.dispatchReactUnityEvent('KeyboardCaptureRequest', JSON.stringify({ captureKeyboard: newState }));
        }
      }

      if (selectedMethod === 'all' || selectedMethod === 'webGLInput') {
        // Method 2: Direct WebGLInput
        if (window.unityInstance?.SendMessage) {
          addLog(`Sending WebGLInput.SetCaptureAllKeyboardInput: ${newState}`);
          window.unityInstance.SendMessage("WebGLInput", "SetCaptureAllKeyboardInput", newState ? "true" : "false");
        }
      }

      if (selectedMethod === 'all' || selectedMethod === 'reactBridge') {
        // Method 3: ReactBridge.HandleEvent
        if (window.unityInstance?.SendMessage) {
          addLog(`Sending via ReactBridge.HandleEvent: KeyboardCaptureRequest with captureKeyboard: ${newState}`);
          window.unityInstance.SendMessage("ReactBridge", "HandleEvent", JSON.stringify({
            type: "KeyboardCaptureRequest",
            data: JSON.stringify({ captureKeyboard: newState })
          }));
        }
      }

      if (selectedMethod === 'all' || selectedMethod === 'reactUnity') {
        // Method 4: ReactUnity helpers
        if (window.ReactUnity) {
          if (newState) {
            if (window.ReactUnity.enableKeyboardCapture) {
              addLog('Calling ReactUnity.enableKeyboardCapture()');
              window.ReactUnity.enableKeyboardCapture();
            }
          } else {
            if (window.ReactUnity.disableKeyboardCapture) {
              addLog('Calling ReactUnity.disableKeyboardCapture()');
              window.ReactUnity.disableKeyboardCapture();
            }
          }
        }
      }

      if (selectedMethod === 'all' || selectedMethod === 'globalFlag') {
        // Method 5: Global flag
        window.unityKeyboardCaptureShouldBeDisabled = !newState;
        addLog(`Set window.unityKeyboardCaptureShouldBeDisabled to ${!newState}`);
      }

      // Verify the current state in WebGLInput if possible
      setTimeout(() => {
        if (window.WebGLInput && typeof window.WebGLInput.captureAllKeyboardInput !== 'undefined') {
          addLog(`Current WebGLInput.captureAllKeyboardInput = ${window.WebGLInput.captureAllKeyboardInput}`);
        }
      }, 500);

    } catch (error: any) {
      addLog(`Error toggling keyboard capture: ${error.message}`);
      console.error('Failed to toggle keyboard capture:', error.message);
    }
  };

  // Try most aggressive approach to disable Unity keyboard capture
  const forceDisableKeyboardCapture = () => {
    addLog('Attempting force disable of Unity keyboard capture');

    try {
      // Try all known methods
      if (window.dispatchReactUnityEvent) {
        window.dispatchReactUnityEvent('KeyboardCaptureRequest', JSON.stringify({ captureKeyboard: false }));
      }

      if (window.unityInstance) {
        if (window.unityInstance.SendMessage) {
          window.unityInstance.SendMessage("WebGLInput", "SetCaptureAllKeyboardInput", "false");
          window.unityInstance.SendMessage("ReactBridge", "HandleEvent", JSON.stringify({
            type: "KeyboardCaptureRequest",
            data: JSON.stringify({ captureKeyboard: false })
          }));
        }

        if (window.unityInstance.Module) {
          window.unityInstance.Module.WebGLInputHandler = null;
          addLog('Set window.unityInstance.Module.WebGLInputHandler = null');
        }
      }

      if (window.ReactUnity?.disableKeyboardCapture) {
        window.ReactUnity.disableKeyboardCapture();
      }

      // Set global flag
      window.unityKeyboardCaptureShouldBeDisabled = true;

      // Direct WebGL input access if available
      if (window.WebGLInput && typeof window.WebGLInput.captureAllKeyboardInput !== 'undefined') {
        window.WebGLInput.captureAllKeyboardInput = false;
        addLog('Direct set WebGLInput.captureAllKeyboardInput = false');
      }

      setKeyboardCaptured(false);
      addLog('Force disable completed');

      // Focus the test input
      if (testInputRef.current) {
        testInputRef.current.focus();
        addLog('Focused test input');
      }

      // Try adding event listeners to capture all keyboard events
      const preventKeyboardEvents = (e: Event) => {
        const target = e.target as HTMLElement;
        // Only prevent if not targeting an input
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          const keyEvent = e as KeyboardEvent;
          addLog(`Prevented keyboard event: ${e.type} ${keyEvent.key}`);
          e.stopPropagation();
        }
      };

      // Add capturing event listeners to steal keyboard events
      document.addEventListener('keydown', preventKeyboardEvents, true);
      document.addEventListener('keyup', preventKeyboardEvents, true);

      setTimeout(() => {
        // Remove event listeners after a few seconds
        document.removeEventListener('keydown', preventKeyboardEvents, true);
        document.removeEventListener('keyup', preventKeyboardEvents, true);
        addLog('Removed temporary keyboard event prevention');
      }, 5000);

    } catch (error: any) {
      addLog(`Error during force disable: ${error.message}`);
      console.error('Failed to disable keyboard capture:', error.message);
    }
  };

  // Try most aggressive approach to enable Unity keyboard capture
  const forceEnableKeyboardCapture = () => {
    addLog('Attempting force enable of Unity keyboard capture');

    try {
      // Try all known methods
      if (window.dispatchReactUnityEvent) {
        window.dispatchReactUnityEvent('KeyboardCaptureRequest', JSON.stringify({ captureKeyboard: true }));
      }

      if (window.unityInstance?.SendMessage) {
        window.unityInstance.SendMessage("WebGLInput", "SetCaptureAllKeyboardInput", "true");
        window.unityInstance.SendMessage("ReactBridge", "HandleEvent", JSON.stringify({
          type: "KeyboardCaptureRequest",
          data: JSON.stringify({ captureKeyboard: true })
        }));
      }

      if (window.ReactUnity?.enableKeyboardCapture) {
        window.ReactUnity.enableKeyboardCapture();
      }

      // Set global flag
      window.unityKeyboardCaptureShouldBeDisabled = false;

      // Direct WebGL input access if available
      if (window.WebGLInput && typeof window.WebGLInput.captureAllKeyboardInput !== 'undefined') {
        window.WebGLInput.captureAllKeyboardInput = true;
        addLog('Direct set WebGLInput.captureAllKeyboardInput = true');
      }

      setKeyboardCaptured(true);
      addLog('Force enable completed');
    } catch (error: any) {
      addLog(`Error during force enable: ${error.message}`);
      console.error('Failed to enable keyboard capture:', error.message);
    }
  };

  // Test modal handlers
  const handleOpenModal = () => {
    addLog('Opening test modal');
    setIsOpen(true);

    // When modal opens, disable Unity keyboard capture
    forceDisableKeyboardCapture();

    // Focus the modal input after a short delay
    setTimeout(() => {
      if (modalInputRef.current) {
        modalInputRef.current.focus();
        addLog('Focused modal input');
      }
    }, 200);
  };

  const handleCloseModal = () => {
    addLog('Closing test modal');
    setIsOpen(false);

    // Re-enable Unity keyboard capture when modal closes
    if (keyboardCaptured) {
      forceEnableKeyboardCapture();
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-md max-w-3xl mx-auto my-4">
      <h2 className="text-lg font-bold mb-2">Unity Keyboard Control Tester</h2>

      {/* Unity Status */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <span className={`badge ${unityDetected ? "badge-success" : "badge-error"}`}>
            Unity: {unityDetected ? "Detected" : "Not Detected"}
          </span>
          <span className={`badge ${unityBridgeDetected ? "badge-success" : "badge-error"}`}>
            Bridge: {unityBridgeDetected ? "Detected" : "Not Detected"}
          </span>
        </div>

        <button
          className="btn btn-primary btn-xs"
          onClick={testUnityConnection}
        >
          🔄 Test Connection
        </button>
      </div>

      {/* Method Selector */}
      <div className="form-control mb-4">
        <label className="label" htmlFor="method-select">
          <span className="label-text text-sm">Communication Method:</span>
        </label>
        <select
          id="method-select"
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          className="select select-sm select-bordered bg-gray-700"
        >
          <option value="all">All Methods (recommended)</option>
          <option value="dispatchEvent">dispatchReactUnityEvent</option>
          <option value="webGLInput">WebGLInput.SetCaptureAllKeyboardInput</option>
          <option value="reactBridge">ReactBridge.HandleEvent</option>
          <option value="reactUnity">ReactUnity helpers</option>
          <option value="globalFlag">Global Flag</option>
        </select>
      </div>

      {/* Control Panel */}
      <div className="flex gap-4 mb-4 items-center">
        <div className="form-control">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Unity Keyboard Capture</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={keyboardCaptured}
              onChange={handleKeyboardCaptureToggle}
            />
          </label>
        </div>

        <div className="tooltip" data-tip="Try all available methods to disable Unity keyboard capture">
          <button className="btn btn-error btn-sm" onClick={forceDisableKeyboardCapture}>
            Force Disable
          </button>
        </div>

        <div className="tooltip" data-tip="Try all available methods to enable Unity keyboard capture">
          <button className="btn btn-success btn-sm" onClick={forceEnableKeyboardCapture}>
            Force Enable
          </button>
        </div>

        <button className="btn btn-sm" onClick={handleOpenModal}>
          Test Modal
        </button>
      </div>

      {/* Test Alert */}
      <div className="alert alert-info mb-4 text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div>
          <div className="font-bold text-sm">Test Instructions</div>
          <div className="text-xs">
            1. Click "Force Disable" then try typing in the inputs below<br />
            2. Click "Force Enable" then try typing in the inputs (text should go to Unity)<br />
            3. Click "Test Modal" to check modal focus behavior
          </div>
        </div>
      </div>

      {/* Test Inputs */}
      <div className="flex flex-col gap-4 mb-4">
        <p className="font-bold text-sm">Test Inputs:</p>

        <input
          type="text"
          placeholder="Type here to test keyboard input"
          ref={testInputRef}
          className="input input-bordered bg-gray-700 focus:bg-gray-600 focus:border-blue-300"
          onClick={() => {
            addLog('Test input clicked, attempting to focus');
            forceDisableKeyboardCapture();
          }}
        />

        <textarea
          placeholder="Try typing in this textarea"
          ref={textareaRef}
          className="textarea textarea-bordered bg-gray-700 focus:bg-gray-600 focus:border-blue-300 text-sm"
          onClick={() => {
            addLog('Textarea clicked, attempting to focus');
            forceDisableKeyboardCapture();
          }}
        />
      </div>

      {/* Debug Logs */}
      <div>
        <div className="flex justify-between mb-2">
          <p className="font-bold text-sm">Debug Logs:</p>
          <button className="btn btn-xs" onClick={clearLogs}>Clear</button>
        </div>

        <div className="bg-black p-2 rounded-md max-h-[200px] overflow-y-auto text-xs font-mono">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <p key={index} className="py-0.5">{log}</p>
            ))
          ) : (
            <p className="text-gray-500">No logs yet</p>
          )}
        </div>
      </div>

      {/* Test Modal */}
      {isOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-gray-800 text-white">
            <h3 className="font-bold text-lg">Test Modal</h3>
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
              onClick={handleCloseModal}
            >
              ✕
            </button>
            <div className="py-4 flex flex-col gap-4">
              <p>This modal helps test keyboard focus handling when dialogs are open.</p>

              <input
                type="text"
                placeholder="Type here in the modal"
                ref={modalInputRef}
                className="input input-bordered bg-gray-700 focus:bg-gray-600 focus:border-blue-300"
              />

              <textarea
                placeholder="Modal textarea for testing"
                className="textarea textarea-bordered bg-gray-700 focus:bg-gray-600 focus:border-blue-300 text-sm"
              />

              <div className="bg-gray-900 p-2 rounded-md">
                <p className="text-sm font-bold mb-1">Current State:</p>
                <div className="flex gap-2">
                  <span className={`badge ${keyboardCaptured ? "badge-success" : "badge-error"}`}>
                    {keyboardCaptured ? "Unity Capturing" : "React Capturing"}
                  </span>
                  <span className="badge badge-info">Modal Open</span>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn btn-primary" onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default TestUnityKeyboardControl;
