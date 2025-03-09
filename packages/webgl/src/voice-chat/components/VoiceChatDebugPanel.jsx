import React from 'react';
import useVoiceChat from '../hooks/useVoiceChat';

const VoiceChatDebugPanel = () => {
  // Try to use the voice chat hook, but don't fail if it's not available
  let voiceChatData = null;
  let error = null;
  
  try {
    voiceChatData = useVoiceChat();
  } catch (err) {
    error = err.message;
    // Return null to not show anything when there's an error
    return null;
  }
  
  // If we couldn't get the voice chat data, show an error message
  if (!voiceChatData) {
    return null;
  }
  
  const { 
    isJoined, 
    channel, 
    uid, 
    isVoiceEnabled, 
    microphoneTrack,
    client
  } = voiceChatData;

  const panelStyle = {
    position: 'fixed',
    bottom: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    fontSize: '12px',
    zIndex: 9999,
    maxWidth: '300px',
    fontFamily: 'monospace'
  };

  const getClientState = () => {
    if (!client) return 'Not initialized';
    
    try {
      return {
        connectionState: client.connectionState,
        remoteUsers: Object.keys(client.remoteUsers || {}).length,
        uid: client.uid,
        channelName: client.channelName
      };
    } catch (e) {
      return 'Error getting client state';
    }
  };

  const clientState = getClientState();

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: '0 0 8px 0' }}>Agora Debug Panel</h3>
      <div>
        <strong>Channel:</strong> {channel || 'Not set'}
      </div>
      <div>
        <strong>UID:</strong> {uid || 'Not set'}
      </div>
      <div>
        <strong>Joined:</strong> {isJoined ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Voice Enabled:</strong> {isVoiceEnabled ? 'Yes' : 'No'}
      </div>
      <div>
        <strong>Mic Track:</strong> {microphoneTrack ? 
          `${microphoneTrack.trackMediaType} (${microphoneTrack.muted ? 'Muted' : 'Active'})` : 
          'Not created'}
      </div>
      <div>
        <strong>Client State:</strong> {typeof clientState === 'object' ? 
          <pre style={{ margin: '5px 0' }}>
            {JSON.stringify(clientState, null, 2)}
          </pre> : 
          clientState}
      </div>
    </div>
  );
};

export default VoiceChatDebugPanel; 