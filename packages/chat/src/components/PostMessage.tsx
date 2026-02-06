import { useState, useContext, KeyboardEvent } from 'react';
import { ChatContext } from '../Chat';

const PostMessage = () => {
  const [text, setText] = useState('');
  const chatContext = useContext(ChatContext);

  if (!chatContext) {
    return null;
  }

  const { isConnected, sendMessage } = chatContext;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !isConnected) return;

    sendMessage(trimmed);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
        className="input input-bordered flex-1"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={!isConnected}
      />
      <button
        className="btn btn-primary"
        onClick={handleSend}
        disabled={!isConnected || !text.trim()}
      >
        Send
      </button>
    </div>
  );
};

export default PostMessage;
