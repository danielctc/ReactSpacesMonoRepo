# WebGL Chat System

A React-based chat system designed to replace Unity WebGL chat functionality. This system provides real-time messaging with user avatars, role badges, and seamless keyboard focus management with Unity.

## Features

- **Real-time messaging** via Firebase Firestore
- **User avatars** from Ready Player Me (RPM) URLs
- **Role badges** for space owners and hosts
- **Keyboard focus management** with Unity WebGL
- **Enter key activation** for chat input
- **Unread message counter** when chat is minimized
- **Message grouping** by date and user
- **Guest user support** with fallback avatars

## Components

### WebGLChatWindow
Main chat component that handles the overall chat interface.

**Props:**
- `spaceID` (string): The space identifier for Firebase chat collection
- `isVisible` (boolean): Whether the chat should be visible

### ChatInput
Input component with Enter key handling and Unity keyboard integration.

**Props:**
- `onSendMessage` (function): Callback when a message is sent
- `onFocusChange` (function): Callback when input focus changes
- `placeholder` (string): Input placeholder text
- `disabled` (boolean): Whether input is disabled
- `maxLength` (number): Maximum message length (default: 500)

### ChatMessageList
Message display component with avatars and role badges.

**Props:**
- `messages` (array): Array of message objects
- `currentUserId` (string): Current user's UID for highlighting own messages
- `isLoading` (boolean): Loading state

## Hooks

### useWebGLChat(spaceID)
Main chat functionality hook.

**Returns:**
- `messages`: Array of enriched messages with user profile data
- `messageCount`: Total number of messages
- `sendMessage`: Function to send a new message
- `isLoading`: Loading state
- `error`: Error message if any
- `getRecentMessages`: Function to get recent messages since a timestamp

### useChatKeyboardFocus(isChatInputFocused)
Manages keyboard focus between Unity and chat input.

**Parameters:**
- `isChatInputFocused` (boolean): Whether chat input is currently focused

## Usage

```jsx
import { WebGLChatWindow } from './components/chat';

// In your WebGL component
<WebGLChatWindow 
  spaceID={spaceID}
  isVisible={!showSignInModal && user}
/>
```

## Keyboard Controls

- **Enter**: Activate chat input (when not focused) or send message (when focused)
- **Escape**: Close chat input and return focus to Unity
- **Click outside**: Automatically refocus Unity canvas

## Firebase Structure

Messages are stored in Firestore under:
```
spaces/{spaceID}/chatMessages/{messageId}
```

**Message Format:**
```javascript
{
  id: string,
  uid: string,           // User's Firebase UID
  user: string,          // Display name
  text: string,          // Message content
  timestamp: Date,       // Message timestamp
  rpmURL?: string,       // Ready Player Me avatar URL
  isGuest: boolean,      // Whether user is a guest
  role?: string          // 'owner' or 'host' if applicable
}
```

## Styling

The chat system uses Chakra UI components with a dark theme that matches the existing WebGL interface:
- Semi-transparent backgrounds with blur effects
- White text on dark backgrounds
- Blue accent for current user messages
- Role-specific badge colors (green for owners, purple for hosts)

## Integration with Unity

The chat system automatically manages keyboard focus with Unity WebGL:
- When chat input is focused, Unity keyboard input is blocked
- When chat loses focus, Unity keyboard input is restored
- Uses existing `unityKeyboard.js` utilities for seamless integration

## Dependencies

- React
- Chakra UI
- Firebase Firestore
- Existing shared components and utilities from the project
