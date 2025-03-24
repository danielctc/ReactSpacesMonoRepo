import React, { useState, useRef, useEffect } from 'react';
import './InputTestModal.css';

// Simple hook to control Unity keyboard focus
const useModalFocus = (isOpen) => {
  useEffect(() => {
    if (isOpen) {
      // Disable Unity keyboard capture when modal opens
      if (window.unityCaptureKeyboard) {
        window.unityCaptureKeyboard(false);
      }
    } else {
      // Re-enable Unity keyboard capture when modal closes
      if (window.unityFocus) {
        setTimeout(() => {
          window.unityFocus();
        }, 50);
      }
    }
    
    // Cleanup when component unmounts
    return () => {
      if (isOpen && window.unityFocus) {
        window.unityFocus();
      }
    };
  }, [isOpen]);
};

export const InputTestModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [log, setLog] = useState([]);
  const inputRef = useRef(null);
  
  // Use the focus management
  useModalFocus(isOpen);

  const addLog = (message) => {
    setLog(prev => [...prev, `[${new Date().toISOString().substr(11, 8)}] ${message}`]);
  };

  const handleOpen = () => {
    setIsOpen(true);
    addLog('Modal opened');
  };

  const handleClose = () => {
    setIsOpen(false);
    addLog('Modal closed');
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
        addLog('Input focused');
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    addLog(`Unity input management active`);
  }, []);

  const handleKeyDown = (e) => {
    addLog(`Key pressed: ${e.key}`);
  };

  return (
    <div className="input-test-container">
      {!isOpen && (
        <button className="open-modal-button" onClick={handleOpen}>
          Open Test Modal
        </button>
      )}

      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Keyboard Input Test</h2>
            
            <div className="input-section">
              <label>Test Input:</label>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type here to test keyboard input"
              />
            </div>

            <div className="status-section">
              <div className="success-message">✅ Unity input managed by modalFocusManager</div>
            </div>

            <div className="log-section">
              <h3>Event Log:</h3>
              <div className="log-container">
                {log.map((entry, index) => (
                  <div key={index} className="log-entry">{entry}</div>
                ))}
              </div>
            </div>

            <button className="close-button" onClick={handleClose}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}; 