import React, { useState, useRef, useEffect } from 'react';
import {
  Input,
  InputGroup,
  InputRightElement,
  InputLeftElement,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  SimpleGrid,
  Text,
  Box
} from '@chakra-ui/react';
import { ArrowForwardIcon } from '@chakra-ui/icons';
import { BsEmojiSmile } from 'react-icons/bs';

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

  // Common emojis for the picker
  const emojis = [
    '😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😮',
    '😢', '😭', '😡', '🤯', '🥳', '🤗', '🙄', '😴',
    '👍', '👎', '👏', '🙌', '👋', '🤝', '💪', '🤞',
    '❤️', '💔', '💯', '🔥', '⭐', '✨', '🎉', '🎊'
  ];

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

  const handleEmojiSelect = (emoji) => {
    const newMessage = message + emoji;
    if (newMessage.length <= maxLength) {
      setMessage(newMessage);
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
      <InputLeftElement>
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<BsEmojiSmile />}
            size="xs"
            variant="ghost"
            color="white"
            _hover={{ bg: "whiteAlpha.200" }}
            aria-label="Add emoji"
            disabled={disabled}
          />
          <MenuList
            bg="rgba(0, 0, 0, 0.9)"
            borderColor="whiteAlpha.300"
            border="1px solid rgba(255, 255, 255, 0.2)"
            maxW="280px"
            zIndex="9999"
            p={2}
          >
            <SimpleGrid columns={8} spacing={1}>
              {emojis.map((emoji, index) => (
                <Box
                  key={index}
                  as="button"
                  p={1}
                  borderRadius="md"
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={() => handleEmojiSelect(emoji)}
                  fontSize="lg"
                  textAlign="center"
                  minH="32px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  {emoji}
                </Box>
              ))}
            </SimpleGrid>
          </MenuList>
        </Menu>
      </InputLeftElement>

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
        pl="40px"
        pr="40px"
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
