import { format } from 'date-fns';
import type { ChatMessage } from '@disruptive-spaces/shared/types/chat.types';

interface MessageProps {
  message: ChatMessage;
  isOwn: boolean;
}

const Message = ({ message, isOwn }: MessageProps) => {
  const formattedTime = format(new Date(message.timestamp), 'HH:mm');

  return (
    <div className={`chat ${isOwn ? 'chat-end' : 'chat-start'}`}>
      <div className="chat-header">
        {message.nickname}
        <time className="text-xs opacity-50 ml-1">{formattedTime}</time>
      </div>
      <div className={`chat-bubble ${isOwn ? 'chat-bubble-primary' : ''}`}>
        {message.text}
      </div>
    </div>
  );
};

export default Message;
