import React, { useState } from 'react';
import { VoiceProvider } from '@disruptive-spaces/webgl/voice-chat';
import VoiceChatDebugPanel from '../components/VoiceChatDebugPanel';
import { UserProvider } from '@disruptive-spaces/shared/providers/UserProvider';

/**
 * Test page for WebGL voice chat
 * NOTE: Uses VoiceProvider from webgl package instead of Agora directly
 */
const WebGLVoiceTest: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [spaceId, setSpaceId] = useState('test');
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    if (!userId || !spaceId) return;
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">WebGL Voice Chat Test</h1>

        {!isConnected ? (
          <div className="card bg-base-200 p-6 shadow-md">
            <div className="flex flex-col gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">User ID</span>
                  <span className="label-text-alt text-error">Required</span>
                </label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter your user ID"
                  className="input input-bordered"
                />
                <label className="label">
                  <span className="label-text-alt">This should be a valid Firebase user ID</span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Space ID</span>
                </label>
                <input
                  type="text"
                  value={spaceId}
                  onChange={(e) => setSpaceId(e.target.value)}
                  placeholder="Enter space ID"
                  className="input input-bordered"
                />
                <label className="label">
                  <span className="label-text-alt">This will be used to create the voice channel name</span>
                </label>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleConnect}
                disabled={!userId || !spaceId}
              >
                Connect
              </button>
            </div>
          </div>
        ) : (
          <UserProvider overrideUserId={userId}>
            <div className="card bg-base-200 p-6 shadow-md">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Voice Chat</h2>
                  <button className="btn btn-error btn-sm" onClick={handleDisconnect}>
                    Disconnect
                  </button>
                </div>

                <div className="divider my-0"></div>

                <div className="flex items-center gap-4 flex-wrap">
                  <span>User ID: {userId}</span>
                  <span>Space: {spaceId}</span>
                  <span>Channel: space-{spaceId}-voice</span>
                </div>

                <VoiceProvider
                  channel={`space-${spaceId}-voice`}
                  userId={userId}
                  enabled={true}
                  startMuted={true}
                >
                  <div className="flex gap-4 items-center mb-4">
                    <button className="btn btn-lg btn-circle">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                    <span>Click to toggle microphone</span>
                  </div>

                  <VoiceChatDebugPanel />
                </VoiceProvider>
              </div>
            </div>
          </UserProvider>
        )}
      </div>
    </div>
  );
};

export default WebGLVoiceTest;
