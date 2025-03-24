import React, { useState, useEffect, useRef } from 'react';

/**
 * A simple component that adds a floating debug button
 * This doesn't require any modifications to main.jsx
 */
const UnityDebugButton = () => {
  // State to track Unity status and events
  const [clickEvents, setClickEvents] = useState([]);
  const [focusEvents, setFocusEvents] = useState([]);
  const [keyboardCaptureEvents, setKeyboardCaptureEvents] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unityStatus, setUnityStatus] = useState({
    isLoaded: false,
    isPlayerInstantiated: false,
    unityInstance: null,
    unityCanvas: null,
    keyboardCaptureEnabled: false
  });

  const originalUnityCaptureKeyboard = useRef(null);
  
  // Create and inject the UI
  useEffect(() => {
    // Create container for the debug interface
    const container = document.createElement('div');
    container.id = 'unity-debug-container';
    container.style.position = 'fixed';
    container.style.bottom = '10px';
    container.style.left = '10px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);

    // Create button 
    const button = document.createElement('button');
    button.innerText = 'Unity Debug';
    button.style.backgroundColor = 'red';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.padding = '8px 12px';
    button.style.cursor = 'pointer';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    container.appendChild(button);

    // Create panel container (initially hidden)
    const panel = document.createElement('div');
    panel.style.backgroundColor = 'rgba(0,0,0,0.9)';
    panel.style.color = 'white';
    panel.style.padding = '15px';
    panel.style.borderRadius = '5px';
    panel.style.marginTop = '10px';
    panel.style.width = '600px';
    panel.style.maxHeight = '400px';
    panel.style.overflowY = 'auto';
    panel.style.display = 'none';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.boxShadow = '0 0 15px rgba(0,0,0,0.5)';
    container.appendChild(panel);

    // Track clicks
    const handleClick = (e) => {
      const target = e.target;
      const eventData = {
        timestamp: new Date().toISOString(),
        type: 'click',
        tagName: target.tagName,
        id: target.id || 'none',
        classes: Array.from(target.classList).join(' ') || 'none',
        activeElement: document.activeElement ? {
          tagName: document.activeElement.tagName,
          id: document.activeElement.id || 'none'
        } : 'none'
      };
      setClickEvents(prev => [eventData, ...prev].slice(0, 50));
      updateDebugPanel();
    };

    // Track focus changes
    const handleFocus = (e) => {
      const target = e.target;
      const eventData = {
        timestamp: new Date().toISOString(),
        type: e.type,
        tagName: target.tagName,
        id: target.id || 'none',
        classes: Array.from(target.classList).join(' ') || 'none'
      };
      setFocusEvents(prev => [eventData, ...prev].slice(0, 50));
      updateDebugPanel();
    };

    // Toggle debug panel
    button.addEventListener('click', () => {
      const isCurrentlyOpen = panel.style.display === 'none';
      panel.style.display = isCurrentlyOpen ? 'block' : 'none';
      setIsOpen(isCurrentlyOpen);
      
      // Update the panel immediately when opened
      if (isCurrentlyOpen) {
        updateDebugPanel();
      }
    });

    // Check Unity status
    const checkUnityStatus = () => {
      const newStatus = {
        isLoaded: false,
        isPlayerInstantiated: !!window.isPlayerInstantiated,
        unityInstance: null,
        unityCanvas: null,
        keyboardCaptureEnabled: false
      };
      
      if (window.unityInstance) {
        newStatus.unityInstance = 'window.unityInstance';
        newStatus.isLoaded = true;
      } else if (window.gameInstance) {
        newStatus.unityInstance = 'window.gameInstance';
        newStatus.isLoaded = true;
      }
      
      const webglRoot = document.getElementById('webgl-root');
      if (webglRoot) {
        const canvasInRoot = webglRoot.querySelector('canvas');
        if (canvasInRoot) {
          newStatus.unityCanvas = 'canvas in webgl-root';
        } else {
          newStatus.unityCanvas = 'webgl-root only (no canvas)';
        }
      }
      
      setUnityStatus(newStatus);
      
      // Only update the panel if it's open
      if (isOpen) {
        updateDebugPanel();
      }
    };

    // Intercept keyboard capture calls
    if (window.unityCaptureKeyboard && !originalUnityCaptureKeyboard.current) {
      originalUnityCaptureKeyboard.current = window.unityCaptureKeyboard;
      
      window.unityCaptureKeyboard = async (enable, retryCount = 0) => {
        // Log the call
        const eventData = {
          timestamp: new Date().toISOString(),
          type: 'capture',
          enable: enable,
          retryCount: retryCount,
          activeElement: document.activeElement ? {
            tagName: document.activeElement.tagName,
            id: document.activeElement.id || 'none'
          } : 'none',
          caller: new Error().stack.split('\n')[2]?.trim() || 'unknown'
        };
        
        setKeyboardCaptureEvents(prev => [eventData, ...prev].slice(0, 50));
        updateDebugPanel();
        
        // Call original function
        try {
          return await originalUnityCaptureKeyboard.current(enable, retryCount);
        } catch (error) {
          console.error("Error in unityCaptureKeyboard:", error);
          throw error;
        }
      };
    }

    // Update debug panel
    const updateDebugPanel = () => {
      if (!isOpen) return;
      
      // Clear current content
      panel.innerHTML = '';
      
      // Status section
      const statusSection = document.createElement('div');
      statusSection.style.marginBottom = '15px';
      statusSection.style.padding = '10px';
      statusSection.style.backgroundColor = 'rgba(255,255,255,0.1)';
      statusSection.style.borderRadius = '4px';
      
      const statusTitle = document.createElement('h3');
      statusTitle.innerText = 'Unity Status:';
      statusTitle.style.marginTop = '0';
      statusTitle.style.marginBottom = '5px';
      statusTitle.style.fontSize = '14px';
      statusTitle.style.fontWeight = 'bold';
      statusSection.appendChild(statusTitle);
      
      const statusItems = [
        `Unity Loaded: ${unityStatus.isLoaded ? 'Yes' : 'No'}`,
        `Player Instantiated: ${unityStatus.isPlayerInstantiated ? 'Yes' : 'No'}`,
        `Unity Instance: ${unityStatus.unityInstance || 'Not Found'}`,
        `Unity Canvas: ${unityStatus.unityCanvas || 'Not Found'}`,
        `Keyboard Capture: ${unityStatus.keyboardCaptureEnabled ? 'Enabled' : 'Disabled'}`,
        `Active Element: ${document.activeElement ? `${document.activeElement.tagName}${document.activeElement.id ? '#' + document.activeElement.id : ''}` : 'None'}`
      ];
      
      const statusText = document.createElement('div');
      statusText.innerHTML = statusItems.join('<br>');
      statusText.style.fontSize = '12px';
      statusSection.appendChild(statusText);
      
      panel.appendChild(statusSection);
      
      // Control buttons
      const controlSection = document.createElement('div');
      controlSection.style.marginBottom = '15px';
      controlSection.style.display = 'flex';
      controlSection.style.gap = '8px';
      
      const createButton = (text, onClick, color) => {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.style.backgroundColor = color;
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.padding = '6px 10px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '12px';
        btn.addEventListener('click', onClick);
        return btn;
      };
      
      // Enable keyboard button
      controlSection.appendChild(createButton('Enable KB', () => {
        if (typeof window.unityCaptureKeyboard === 'function') {
          window.unityCaptureKeyboard(true);
        }
      }, 'green'));
      
      // Disable keyboard button
      controlSection.appendChild(createButton('Disable KB', () => {
        if (typeof window.unityCaptureKeyboard === 'function') {
          window.unityCaptureKeyboard(false);
        }
      }, 'red'));
      
      // Focus canvas button
      controlSection.appendChild(createButton('Focus Canvas', () => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          if (canvas.tabIndex === undefined || canvas.tabIndex < 0) {
            canvas.tabIndex = 1;
          }
          canvas.focus();
        }
      }, 'blue'));
      
      // Clear logs button
      controlSection.appendChild(createButton('Clear Logs', () => {
        setClickEvents([]);
        setFocusEvents([]);
        setKeyboardCaptureEvents([]);
        updateDebugPanel();
      }, 'gray'));
      
      panel.appendChild(controlSection);
      
      // Recent events
      const createEventList = (title, events, color) => {
        if (events.length === 0) return null;
        
        const section = document.createElement('div');
        section.style.marginBottom = '15px';
        
        const sectionTitle = document.createElement('h3');
        sectionTitle.innerText = `${title} (${events.length})`;
        sectionTitle.style.margin = '10px 0 5px 0';
        sectionTitle.style.fontSize = '14px';
        sectionTitle.style.fontWeight = 'bold';
        section.appendChild(sectionTitle);
        
        const list = document.createElement('div');
        list.style.backgroundColor = 'rgba(0,0,0,0.3)';
        list.style.maxHeight = '150px';
        list.style.overflowY = 'auto';
        list.style.padding = '5px';
        list.style.borderRadius = '4px';
        
        events.slice(0, 10).forEach(event => {
          const item = document.createElement('div');
          item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
          item.style.padding = '5px 0';
          item.style.fontSize = '11px';
          
          const time = new Date(event.timestamp).toLocaleTimeString();
          let details = '';
          
          if (event.type === 'capture') {
            details = `<span style="color:${event.enable ? 'lightgreen' : 'lightcoral'}">${event.enable ? 'Enable' : 'Disable'}</span> | Active: ${typeof event.activeElement === 'object' ? event.activeElement.tagName + (event.activeElement.id !== 'none' ? '#' + event.activeElement.id : '') : event.activeElement}`;
          } else {
            details = `${event.tagName}${event.id !== 'none' ? '#' + event.id : ''} | ${event.type}`;
          }
          
          item.innerHTML = `<span style="color:${color}">${time}</span> - ${details}`;
          list.appendChild(item);
        });
        
        section.appendChild(list);
        return section;
      };
      
      // Add event sections
      const captureEvents = createEventList('Keyboard Capture Events', keyboardCaptureEvents, 'orange');
      if (captureEvents) panel.appendChild(captureEvents);
      
      const focusEventsList = createEventList('Focus Events', focusEvents, 'lightblue');
      if (focusEventsList) panel.appendChild(focusEventsList);
      
      const clickEventsList = createEventList('Click Events', clickEvents, 'lightgreen');
      if (clickEventsList) panel.appendChild(clickEventsList);
    };
    
    // Set up event listeners and interval
    document.addEventListener('click', handleClick, true);
    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focusout', handleFocus, true);
    
    const statusInterval = setInterval(checkUnityStatus, 1000);
    
    // Initial check
    checkUnityStatus();
    
    // Cleanup function
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('focusout', handleFocus, true);
      clearInterval(statusInterval);
      
      // Remove UI
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      
      // Restore original function
      if (originalUnityCaptureKeyboard.current && window.unityCaptureKeyboard) {
        window.unityCaptureKeyboard = originalUnityCaptureKeyboard.current;
      }
    };
  }, [isOpen]);

  // This component doesn't render anything itself
  return null;
};

export default UnityDebugButton; 