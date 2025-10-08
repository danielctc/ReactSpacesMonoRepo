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
import { getSpaceItem } from '@disruptive-spaces/shared/firebase/spacesFirestore';
import ChatMessageList from './ChatMessageList';
import ChatInput from './ChatInput';

const WebGLChatWindow = ({ spaceID, isVisible = true }) => {
  const { user } = useContext(UserContext);
  const { isOpen, onToggle, onClose } = useDisclosure();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPlayerInstantiated, setIsPlayerInstantiated] = useState(false);
  const [textChatDisabled, setTextChatDisabled] = useState(false);
  const messagesContainerRef = useRef(null);
  
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

  // Scroll to bottom when chat opens or new messages arrive
  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      setTimeout(() => {
        const container = messagesContainerRef.current;
        container.scrollTop = container.scrollHeight;
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
    const handleTextChatSettingChanged = (event) => {
      if (event.detail && event.detail.spaceId === spaceID) {
        console.log('Text chat setting changed:', event.detail.textChatDisabled);
        setTextChatDisabled(event.detail.textChatDisabled);
        
        // If chat is disabled and currently open, close it
        if (event.detail.textChatDisabled && isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener('SpaceTextChatSettingChanged', handleTextChatSettingChanged);
    
    return () => {
      window.removeEventListener('SpaceTextChatSettingChanged', handleTextChatSettingChanged);
    };
  }, [spaceID, isOpen, onClose]);

  // Don't render if not visible, no user, player not instantiated, or text chat is disabled
  if (!isVisible || !user || !isPlayerInstantiated || textChatDisabled) {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom="20px"
      left="20px"
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

      {/* Chat Window - Frameless with subtle background */}
      <Collapse in={isOpen} animateOpacity>
        <Box
          bg="rgba(0, 0, 0, 0.3)"
          backdropFilter="blur(8px)"
          borderRadius="md"
          overflow="visible"
          maxWidth="350px"
          minWidth="280px"
        >
          {/* Messages Area */}
          <Box
            height="210px"
            overflowY="scroll"
            overflowX="hidden"
            p={2}
            width="100%"
            maxWidth="100%"
            css={{
              boxSizing: 'border-box',
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
              },
              '&::-webkit-scrollbar:horizontal': {
                display: 'none',
              },
            }}
            ref={messagesContainerRef}
          >
            <ChatMessageList 
              messages={messages} 
              currentUserId={user?.uid}
              isLoading={isLoading}
              spaceID={spaceID}
            />
          </Box>

          {/* Input Area */}
          <Box p={2}>
            <HStack spacing={2} align="center">
              <Box flex={1}>
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onFocusChange={handleInputFocus}
                  placeholder="Press Enter to chat..."
                  disabled={isLoading}
                />
              </Box>
              
              {/* Minimize Chat Button */}
              <IconButton
                icon={<ChatIcon />}
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
                onClick={onClose}
                aria-label="Minimize chat"
                h="32px"
                w="32px"
                flexShrink={0}
              />
            </HStack>
          </Box>

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
