import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Box,
  IconButton,
  VStack,
  HStack,
  Text,
  Collapse,
  useDisclosure,
  Badge,
  Tooltip
} from '@chakra-ui/react';
import { ChatIcon, CloseIcon, MinusIcon } from '@chakra-ui/icons';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { useWebGLChat } from './hooks/useWebGLChat';
import { useChatKeyboardFocus } from './hooks/useChatKeyboardFocus';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

const WebGLChatWindow = ({ spaceID, isVisible = true }) => {
  const { user } = useContext(UserContext);
  const { isOpen, onToggle, onClose } = useDisclosure();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Chat functionality
  const {
    messages,
    sendMessage,
    isLoading,
    error
  } = useWebGLChat(spaceID);
  
  // Keyboard focus management
  useChatKeyboardFocus(isInputFocused);
  
  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      // Simple unread counter - in a real app you'd track last read timestamp
      const newMessages = messages.filter(msg => 
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
  const handleSendMessage = async (messageText) => {
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
  const handleInputFocus = (focused) => {
    setIsInputFocused(focused);
  };

  // Don't render if not visible or no user
  if (!isVisible || !user) {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      zIndex="1000"
      maxWidth="350px"
      minWidth="280px"
    >
      {/* Chat Toggle Button */}
      {!isOpen && (
        <Box position="relative">
          <IconButton
            icon={<ChatIcon />}
            aria-label="Open chat"
            size="lg"
            colorScheme="blue"
            bg="rgba(0, 0, 0, 0.7)"
            color="white"
            _hover={{ bg: "rgba(0, 0, 0, 0.8)" }}
            borderRadius="full"
            onClick={onToggle}
          />
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-5px"
              right="-5px"
              colorScheme="red"
              borderRadius="full"
              minW="20px"
              h="20px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      )}

      {/* Chat Window */}
      <Collapse in={isOpen} animateOpacity>
        <Box
          bg="rgba(0, 0, 0, 0.85)"
          backdropFilter="blur(10px)"
          borderRadius="lg"
          border="1px solid rgba(255, 255, 255, 0.1)"
          overflow="hidden"
          boxShadow="xl"
        >
          {/* Chat Header */}
          <HStack
            p={3}
            bg="rgba(255, 255, 255, 0.1)"
            justify="space-between"
            align="center"
          >
            <HStack spacing={2}>
              <ChatIcon color="white" />
              <Text color="white" fontWeight="bold" fontSize="sm">
                Space Chat
              </Text>
              <Badge colorScheme="green" size="sm">
                {messages.length} messages
              </Badge>
            </HStack>
            
            <HStack spacing={1}>
              <Tooltip label="Minimize" placement="top">
                <IconButton
                  icon={<MinusIcon />}
                  size="xs"
                  variant="ghost"
                  color="white"
                  _hover={{ bg: "whiteAlpha.200" }}
                  onClick={onClose}
                />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Chat Content */}
          <VStack spacing={0} align="stretch">
            {/* Messages Area */}
            <Box
              height="300px"
              overflowY="auto"
              p={2}
              css={{
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderRadius: '2px',
                },
              }}
            >
              <ChatMessageList 
                messages={messages} 
                currentUserId={user?.uid}
                isLoading={isLoading}
              />
            </Box>

            {/* Input Area */}
            <Box
              p={2}
              borderTop="1px solid rgba(255, 255, 255, 0.1)"
            >
              <ChatInput
                onSendMessage={handleSendMessage}
                onFocusChange={handleInputFocus}
                placeholder="Press Enter to chat..."
                disabled={isLoading}
              />
            </Box>
          </VStack>

          {/* Error Display */}
          {error && (
            <Box
              p={2}
              bg="red.500"
              color="white"
              fontSize="xs"
              textAlign="center"
            >
              {error}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default WebGLChatWindow;
