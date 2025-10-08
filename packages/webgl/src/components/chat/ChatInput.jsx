import React, { useState, useRef, useEffect } from 'react';
import {
  Input,
  InputGroup,
  InputRightElement,
  IconButton
} from '@chakra-ui/react';
import { ArrowForwardIcon } from '@chakra-ui/icons';

const ChatInput = ({ 
  onSendMessage, 
  onFocusChange, 
  placeholder = "Press Enter to chat...", 
  disabled = false,
  maxLength = 500 
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Handle Enter key press
  const handleKeyPress = (e) => {
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
  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  };

  // Auto-focus when Enter is pressed globally (when not already focused)
  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
      // Only focus if Enter is pressed and we're not already focused
      // and the target is not an input element
      if (e.key === 'Enter' && 
          !isFocused && 
          !disabled &&
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

  return (
    <InputGroup size="sm">
      <Input
        ref={inputRef}
        value={message}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        bg="rgba(255, 255, 255, 0.05)"
        border="1px solid rgba(255, 255, 255, 0.1)"
        color="white"
        _placeholder={{ color: 'whiteAlpha.500' }}
        _focus={{
          bg: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.4)"
        }}
        _hover={{
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}
        borderRadius="md"
        pr="40px" // Make room for send button
      />
      
      <InputRightElement>
        <IconButton
          icon={<ArrowForwardIcon />}
          size="xs"
          variant="ghost"
          color="white"
          _hover={{ bg: "whiteAlpha.200" }}
          onClick={handleSendMessage}
          disabled={disabled || !message.trim()}
          aria-label="Send message"
        />
      </InputRightElement>
    </InputGroup>
  );
};

export default ChatInput;
