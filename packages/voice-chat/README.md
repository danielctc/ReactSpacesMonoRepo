# Voice Chat Package

This package provides voice chat functionality for Disruptive Spaces using Agora.io.

## Installation

```bash
npm install @disruptive-spaces/voice-chat
```

## Usage

### 1. Set up environment variables

Add your Agora App ID to your `.env` file:

```
REACT_APP_AGORA_APP_ID=your-agora-app-id
```

### 2. Wrap your component with AgoraProvider

```jsx
import { AgoraProvider } from '@disruptive-spaces/voice-chat';

function App() {
  return (
    <AgoraProvider
      appId={process.env.REACT_APP_AGORA_APP_ID}
      channel="your-channel-name"
      uid="user-id"
      enabled={true}
    >
      <YourComponent />
    </AgoraProvider>
  );
}
```

### 3. Use the VoiceButton component

```jsx
import { VoiceButton } from '@disruptive-spaces/voice-chat';

function YourComponent() {
  return (
    <div>
      <VoiceButton size="md" />
    </div>
  );
}
```

### 4. Use the useVoiceChat hook for custom functionality

```jsx
import { useVoiceChat } from '@disruptive-spaces/voice-chat';

function YourComponent() {
  const { 
    isVoiceEnabled, 
    toggleVoice, 
    mute, 
    unmute, 
    users 
  } = useVoiceChat();

  return (
    <div>
      <button onClick={toggleVoice}>
        {isVoiceEnabled ? 'Mute' : 'Unmute'}
      </button>
      <p>Active speakers: {users.length}</p>
    </div>
  );
}
```

## Configuration

The `AgoraProvider` accepts the following props:

| Prop | Type | Description |
|------|------|-------------|
| appId | string | Your Agora App ID |
| channel | string | Channel name to join |
| token | string | (Optional) Token for authentication |
| uid | string | User ID |
| enabled | boolean | Whether voice chat is enabled |
| config | object | Agora client config |

## Components

### VoiceButton

A button component for toggling voice chat.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| size | string | "md" | Button size |
| tooltipPlacement | string | "top" | Tooltip placement |
| iconOn | string | "🎙️" | Icon when voice is enabled |
| iconOff | string | "🔇" | Icon when voice is disabled |
| colorScheme | string | "green" | Button color scheme |

## Hooks

### useVoiceChat

A hook for accessing voice chat functionality.

```jsx
const {
  isVoiceEnabled,
  isConnected,
  users,
  error,
  toggleVoice,
  mute,
  unmute,
  isUserSpeaking,
  getVolumeLevel
} = useVoiceChat();
```

## Environment Variables

The voice-chat package uses environment variables to store sensitive information like the Agora App ID. To set up the environment variables:

1. Create a `.env` file in the root of your project (or copy from `.env.example`)
2. Add the following variables:

```
# Agora configuration
REACT_APP_AGORA_APP_ID=your_agora_app_id_here
```

3. Replace `your_agora_app_id_here` with your actual Agora App ID

In production, make sure to set these environment variables in your deployment environment (e.g., Vercel, Netlify, etc.). 