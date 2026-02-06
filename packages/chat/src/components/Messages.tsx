import { useContext, useEffect, useRef } from 'react';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { ChatContext } from '../Chat';
import Message from './Message';

const Messages = () => {
  const { user } = useContext(UserContext);
  const chatContext = useContext(ChatContext);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatContext?.messages]);

  if (!chatContext) {
    return null;
  }

  const { messages } = chatContext;

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 border border-base-300 rounded-lg bg-base-100 mb-4">
        <p className="text-base-content/60">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="h-96 overflow-y-auto border border-base-300 rounded-lg bg-base-100 p-4 mb-4">
      <div className="flex flex-col space-y-2">
        {messages.map((message) => {
          const isOwn = message.userId === user?.uid;
          return (
            <Message
              key={message.id}
              message={message}
              isOwn={isOwn}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default Messages;
