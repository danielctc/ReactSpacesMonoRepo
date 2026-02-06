import React, { useState, useEffect, useCallback } from 'react';

/**
 * Test page for voice chat
 * NOTE: Simplified test page without Agora SDK references
 * Use VoiceProvider from @disruptive-spaces/webgl/voice-chat for actual voice testing
 */
const VoiceChatTestPage: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [spaceId, setSpaceId] = useState('test');
  const [showTest, setShowTest] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Generate a random user ID if none is provided
  useEffect(() => {
    if (!userId) {
      const randomId = Math.random().toString(36).substring(2, 15);
      setUserId(randomId);
    }
  }, [userId]);

  // Setup console.log override in a separate useEffect
  useEffect(() => {
    // Store original console methods
    const originalConsoleLog = console.log;

    // Override console.log
    console.log = (...args: any[]) => {
      // Call original first
      originalConsoleLog(...args);

      // Then update our debug info
      const logString = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      // Use a callback to avoid issues with stale state
      setDebugInfo(prev => [...prev, logString].slice(-20));
    };

    // Restore on cleanup
    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  const handleStartTest = useCallback(() => {
    setShowTest(true);
    setDebugInfo([]);
  }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Voice Chat Test</h1>

      <div className="alert alert-info mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>
          This test page helps you verify voice chat functionality.
          Use VoiceProvider from @disruptive-spaces/webgl/voice-chat for full testing.
        </span>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        <div>
          <label className="label">
            <span className="label-text">User ID:</span>
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID or leave for random"
            className="input input-bordered w-full"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text">Space ID:</span>
          </label>
          <input
            type="text"
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            placeholder="Enter space ID"
            className="input input-bordered w-full"
          />
        </div>

        <button className="btn btn-primary" onClick={handleStartTest}>
          Start Voice Chat Test
        </button>
      </div>

      {showTest && (
        <div>
          <div className="p-4 bg-base-200 rounded-md mb-8">
            <h2 className="text-xl font-bold mb-4">Instructions</h2>
            <p>1. Import VoiceProvider from @disruptive-spaces/webgl/voice-chat</p>
            <p>2. Wrap your component tree with VoiceProvider</p>
            <p>3. Use useVoiceChat hook to access voice features</p>
            <p>4. Use VoiceButton component for microphone control</p>
            <p className="mt-4 font-bold">Note: You may need to allow microphone access in your browser.</p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Debug Information</h2>
            <div className="p-4 bg-gray-800 text-green-300 rounded-md font-mono text-sm max-h-[300px] overflow-y-auto">
              {debugInfo.length > 0 ? (
                debugInfo.map((log, i) => (
                  <p key={i}>{log}</p>
                ))
              ) : (
                <p>No debug information available yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceChatTestPage;
