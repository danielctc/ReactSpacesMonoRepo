import React, { useState, useEffect, useContext, useRef } from 'react';
import { FaComment } from 'react-icons/fa';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { useWebGLChat } from './hooks/useWebGLChat';
import { useChatKeyboardFocus } from './hooks/useChatKeyboardFocus';
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

interface WebGLChatWindowProps {
  spaceID: string;
  isVisible?: boolean;
}

interface ChatMessage {
  text: string;
  uid: string;
  user: string;
  timestamp: Date;
  rpmURL?: string;
  isGuest?: boolean;
}

const WebGLChatWindow: React.FC<WebGLChatWindowProps> = ({ spaceID, isVisible = true }) => {
  const { user } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [textChatDisabled, setTextChatDisabled] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Chat functionality
  const {
    messages,
    sendMessage,
    isLoading,
    error
  } = useWebGLChat(spaceID);

  // Keyboard focus management
  useChatKeyboardFocus(isInputFocused);

  // Listen for player instantiation (same pattern as ProfileButton)
  useEffect(() => {
    const handlePlayerInstantiated = () => {
      setIsPlayerInstantiated(true);
    };

    window.addEventListener("PlayerInstantiated", handlePlayerInstantiated);

    return () => {
      window.removeEventListener("PlayerInstantiated", handlePlayerInstantiated);
    };
  }, []);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      // Simple unread counter - in a real app you'd track last read timestamp
      const newMessages = messages.filter((msg: any) =>
        msg.timestamp > (localStorage.getItem(`lastReadChat_${spaceID}`) || 0)
      );
      setUnreadCount(newMessages.length);
    } else if (isOpen) {
      setUnreadCount(0);
      // Mark as read when chat is opened
      localStorage.setItem(`lastReadChat_${spaceID}`, Date.now().toString());
    }
  }, [isOpen, messages, spaceID]);

  // Handle sending messages
  const handleSendMessage = async (messageText: string) => {
    if (!user || !messageText.trim()) return;

    try {
      await sendMessage({
        text: messageText.trim(),
        uid: user.uid,
        user: user.Nickname || user.displayName || user.username || 'Anonymous',
        timestamp: new Date(),
        rpmURL: user.rpmURL,
        isGuest: user.isGuest || false
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Handle input focus changes
  const handleInputFocus = (focused: boolean) => {
    setIsInputFocused(focused);
  };

  // Scroll to bottom when chat opens or new messages arrive
  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 150); // Slight delay to ensure content is rendered
    }
  }, [isOpen, messages.length]);

  // Check text chat setting from Firebase
  useEffect(() => {
    const checkTextChatSetting = async () => {
      if (spaceID) {
        try {
          const spaceData = await getSpaceItem(spaceID);
          setTextChatDisabled(spaceData?.textChatDisabled || false);
        } catch (error) {
          console.error('Error checking text chat setting:', error);
          // Default to enabled if we can't check the setting
          setTextChatDisabled(false);
        }
      }
    };

    checkTextChatSetting();
  }, [spaceID]);

  // Listen for text chat setting changes
  useEffect(() => {
    const handleTextChatSettingChanged = (event: any) => {
      if (event.detail && event.detail.spaceId === spaceID) {
        setTextChatDisabled(event.detail.textChatDisabled);

        // If chat is disabled and currently open, close it
        if (event.detail.textChatDisabled && isOpen) {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('SpaceTextChatSettingChanged', handleTextChatSettingChanged);

    return () => {
      window.removeEventListener('SpaceTextChatSettingChanged', handleTextChatSettingChanged);
    };
  }, [spaceID, isOpen]);

  // Don't render if not visible, no user, player not instantiated, or text chat is disabled
  if (!isVisible || !user || !isPlayerInstantiated || textChatDisabled) {
    return null;
  }

  return (
    <div className="absolute bottom-5 left-5 z-[1000] max-w-[350px] min-w-[280px]">
      {/* Chat Toggle Button */}
      {!isOpen && (
        <div className="relative">
          <button
            className="btn btn-lg btn-circle bg-black/70 text-white hover:bg-black/80 border-0"
            onClick={() => setIsOpen(true)}
          >
            <FaComment className="w-5 h-5" />
          </button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 badge badge-error badge-sm min-w-[20px] h-5 flex items-center justify-center text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      )}

      {/* Chat Window - Frameless with subtle background */}
      {isOpen && (
        <div className="bg-black/30 backdrop-blur-lg rounded-md overflow-visible max-w-[350px] min-w-[280px]">
          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="h-[210px] overflow-y-scroll overflow-x-hidden p-2 w-full max-w-full box-border scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          >
            <ChatMessageList
              messages={messages}
              currentUserId={user?.uid}
              isLoading={isLoading}
              spaceID={spaceID}
            />
          </div>

          {/* Input Area */}
          <div className="p-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onFocusChange={handleInputFocus}
                  placeholder="Press Enter to chat..."
                  disabled={isLoading}
                />
              </div>

              {/* Minimize Chat Button */}
              <button
                className="btn btn-sm btn-ghost btn-circle text-white hover:bg-white/20 flex-shrink-0"
                onClick={() => setIsOpen(false)}
              >
                <FaComment />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-2 bg-red-500 text-white text-xs text-center">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebGLChatWindow;
