import React, { useState, useRef, useEffect } from 'react';
import { BsEmojiSmile } from 'react-icons/bs';
import { FaArrowRight } from 'react-icons/fa';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFocusChange?: (focused: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onFocusChange,
  placeholder = "Press Enter to chat...",
  disabled = false,
  maxLength = 500
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Common emojis for the picker
  const emojis = [
    '😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😮',
    '😢', '😭', '😡', '🤯', '🥳', '🤗', '🙄', '😴',
    '👍', '👎', '👏', '🙌', '👋', '🤝', '💪', '🤞',
    '❤️', '💔', '💯', '🔥', '⭐', '✨', '🎉', '🎊'
  ];

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleBlur();
    }
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      // Keep focus after sending
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  // Handle focus events
  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const newMessage = message + emoji;
    if (newMessage.length <= maxLength) {
      setMessage(newMessage);
      setShowEmojiPicker(false);
      // Keep focus on input after emoji selection
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  // Auto-focus when Enter is pressed globally (when not already focused)
  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Only focus if Enter is pressed and we're not already focused
      // and the target is not an input element
      if (e.key === 'Enter' &&
        !isFocused &&
        !disabled &&
        e.target instanceof HTMLElement &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        !e.target.isContentEditable) {

        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleGlobalKeyPress);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyPress);
    };
  }, [isFocused, disabled]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-1">
        {/* Emoji Button */}
        <div className="dropdown dropdown-top" ref={emojiPickerRef}>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle text-white hover:bg-white/20"
            disabled={disabled}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <BsEmojiSmile />
          </button>
          {showEmojiPicker && (
            <div className="dropdown-content bg-black/90 border border-white/20 rounded-lg p-2 max-w-[280px] z-[9999] mb-1">
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    className="p-1 rounded-md hover:bg-white/20 text-lg text-center min-h-[32px] flex items-center justify-center"
                    onClick={() => handleEmojiSelect(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="input input-sm flex-1 bg-white/5 border border-white/10 text-white placeholder-white/50 focus:bg-white/10 focus:border-white/30"
        />

        {/* Send Button */}
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle text-white hover:bg-white/20"
          onClick={handleSendMessage}
          disabled={disabled || !message.trim()}
        >
          <FaArrowRight />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
