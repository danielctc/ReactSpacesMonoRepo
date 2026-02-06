import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { createChatService } from '@disruptive-spaces/shared/services/chat-service';
import type { ChatContextValue, ChatMessage } from '@disruptive-spaces/shared/types/chat.types';

import Messages from './components/Messages';
import PostMessage from './components/PostMessage';

export const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProps {
  spaceID: string;
}

const Chat = ({ spaceID }: ChatProps) => {
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [chatService] = useState(() => createChatService());

  useEffect(() => {
    if (!user) return;

    const roomId = spaceID;
    const userId = user.uid;
    const nickname = user.displayName || user.email || 'Anonymous';

    // Set up listeners before connecting
    const unsubscribeMessages = chatService.onMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    const unsubscribeConnection = chatService.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    // Connect to chat
    chatService.connect(roomId, userId, nickname);

    // Clean up on unmount
    return () => {
      unsubscribeMessages();
      unsubscribeConnection();
      chatService.disconnect();
    };
  }, [spaceID, user, chatService]);

  const handleSendMessage = (text: string) => {
    chatService.sendMessage(text);
  };

  if (!user) {
    return (
      <div className="card bg-base-200 shadow-xl p-6">
        <p className="text-base-content">Please log in to view the chat.</p>
      </div>
    );
  }

  const contextValue: ChatContextValue = {
    messages,
    isConnected,
    sendMessage: handleSendMessage
  };

  return (
    <ChatContext.Provider value={contextValue}>
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-4">
          <Messages />
          <PostMessage />
        </div>
      </div>
    </ChatContext.Provider>
  );
};

export default Chat;
