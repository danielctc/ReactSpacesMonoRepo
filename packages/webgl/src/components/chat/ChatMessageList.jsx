import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  VStack,
  HStack,
  Text,
  Avatar,
  Box,
  Spinner,
  Badge,
  Tooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast
} from '@chakra-ui/react';
import { FaCrown, FaStar, FaEllipsisV, FaTrash } from 'react-icons/fa';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

const ChatMessage = ({ message, isCurrentUser, spaceID, onMessageDelete }) => {
  const { user } = useContext(UserContext);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.uid) {
        try {
          const isDisruptiveAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
          setIsAdmin(isDisruptiveAdmin);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      }
    };
    
    checkAdminStatus();
  }, [user?.uid]);

  // Handle message deletion
  const handleDeleteMessage = async () => {
    if (!spaceID || !message.id) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `spaces/${spaceID}/chatMessages`, message.id));
      
      toast({
        title: 'Message Deleted',
        description: 'The message has been removed from the chat.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      
      // Call callback if provided
      if (onMessageDelete) {
        onMessageDelete(message.id);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the message. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    
    return date.toLocaleDateString();
  };

  // Get avatar URL (convert .glb to .png thumbnail if needed)
  const getAvatarUrl = (rpmURL) => {
    if (!rpmURL) return null;
    return rpmURL.includes('.glb') 
      ? rpmURL.replace('.glb', '.png?scene=fullbody-portrait-closeupfront&w=640&q=75')
      : rpmURL;
  };

  // Get user initials for fallback
  const getUserInitials = (username) => {
    if (!username) return '?';
    if (username.startsWith('Visitor_')) {
      const number = username.split('_')[1];
      return `V${number ? number.charAt(0) : ''}`;
    }
    return username.charAt(0).toUpperCase();
  };


  return (
    <HStack
      align="flex-start"
      spacing={2}
      px={2}
      py={1}
      borderRadius="md"
      _hover={{ bg: "rgba(255, 255, 255, 0.05)" }}
      width="100%"
      maxWidth="100%"
      position="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="group"
      css={{ boxSizing: 'border-box' }}
    >
      {/* Avatar - Small and compact */}
      <Avatar
        size="xs"
        src={getAvatarUrl(message.rpmURL)}
        name={getUserInitials(message.user)}
        bg="whiteAlpha.300"
        color="white"
        borderWidth="1px"
        borderColor="whiteAlpha.300"
        flexShrink={0}
        mt={0.5}
      />

      {/* Message Content - Inline style */}
      <Box flex={1} minW={0}>
        <Text
          fontSize="xs"
          color="white"
          wordBreak="break-word"
          whiteSpace="pre-wrap"
          lineHeight="1.3"
          display="inline"
          userSelect="text"
          _focus={{ outline: 'none', boxShadow: 'none' }}
          css={{
            '&::selection': {
              background: 'rgba(66, 153, 225, 0.3)'
            }
          }}
        >
          {/* Username with styling */}
          <Text
            as="span"
            fontWeight="bold"
            color={isCurrentUser ? "blue.300" : "green.300"}
            mr={1}
            textShadow="0 1px 2px rgba(0,0,0,0.4)"
          >
            {message.user}
          </Text>
          
          {/* Role badge inline */}
          {message.role && (
            <Text as="span" mr={1}>
              {message.role === 'owner' ? '👑' : message.role === 'host' ? '⭐' : ''}
            </Text>
          )}
          
          {/* Guest badge inline */}
          {message.isGuest && (
            <Text as="span" color="gray.400" fontSize="xs" mr={1}>
              (Guest)
            </Text>
          )}
          
          {/* Message text flows inline */}
          <Text
            as="span"
            color="white"
            textShadow="0 1px 2px rgba(0,0,0,0.4)"
          >
            {message.text}
          </Text>
          
          {/* Timestamp at the end */}
          <Text
            as="span"
            fontSize="xs"
            color="whiteAlpha.500"
            ml={2}
            fontWeight="normal"
          >
            {formatTime(message.timestamp)}
          </Text>
        </Text>
      </Box>

      {/* Admin Menu - Only show for admins on hover */}
      {isAdmin && isHovered && (
        <Box
          position="absolute"
          top="4px"
          right="4px"
          zIndex="1000"
        >
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<FaEllipsisV />}
              size="xs"
              variant="ghost"
              color="white"
              bg="rgba(0, 0, 0, 0.6)"
              _hover={{ bg: "rgba(0, 0, 0, 0.8)" }}
              _active={{ bg: "rgba(0, 0, 0, 0.8)" }}
              borderRadius="full"
              minW="20px"
              h="20px"
              isLoading={isDeleting}
            />
            <MenuList
              bg="rgba(0, 0, 0, 0.9)"
              borderColor="whiteAlpha.300"
              minW="120px"
              zIndex="9999"
              boxShadow="lg"
              border="1px solid rgba(255, 255, 255, 0.2)"
            >
              <MenuItem
                icon={<FaTrash />}
                onClick={handleDeleteMessage}
                bg="transparent"
                color="red.300"
                _hover={{ bg: "red.900" }}
                fontSize="sm"
                isDisabled={isDeleting}
              >
                Delete Message
              </MenuItem>
            </MenuList>
          </Menu>
        </Box>
      )}
    </HStack>
  );
};

const ChatMessageList = ({ messages = [], currentUserId, isLoading = false, spaceID }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  
  // Handle message deletion callback
  const handleMessageDelete = (messageId) => {
    // The message will be automatically removed from the list via the Firebase subscription
    console.log('Message deleted:', messageId);
  };

  // Auto-scroll to bottom when new messages arrive or on initial load
  useEffect(() => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current.scrollIntoView({
          behavior: messages.length <= 1 ? 'auto' : 'smooth',
          block: 'end'
        });
      }, 100);
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'end'
      });
    }
  }, []);

  // Group messages by date for better organization
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentGroup = null;
    
    messages.forEach((message) => {
      const messageDate = message.timestamp?.toDate ? 
        message.timestamp.toDate() : 
        new Date(message.timestamp);
      
      const dateString = messageDate.toDateString();
      
      if (!currentGroup || currentGroup.date !== dateString) {
        currentGroup = {
          date: dateString,
          messages: []
        };
        groups.push(currentGroup);
      }
      
      // Always show avatar for every message now
      currentGroup.messages.push(message);
    });
    
    return groups;
  };

  const messageGroups = groupMessagesByDate(messages);

  if (isLoading && messages.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
        color="whiteAlpha.600"
      >
        <VStack spacing={2}>
          <Spinner size="sm" />
          <Text fontSize="sm">Loading messages...</Text>
        </VStack>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
        color="whiteAlpha.600"
        textAlign="center"
        p={4}
      >
        <VStack spacing={2}>
          <Text fontSize="sm">No messages yet</Text>
          <Text fontSize="xs">Be the first to start the conversation!</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef} 
      width="100%" 
      maxWidth="100%"
      height="100%"
      css={{
        boxSizing: 'border-box',
        '& *:focus': {
          outline: 'none !important',
          boxShadow: 'none !important'
        },
        '& *::selection': {
          background: 'transparent'
        }
      }}
    >
      <VStack spacing={0} align="stretch" width="100%">
        {messageGroups.map((group, groupIndex) => (
          <Box key={group.date}>
            {/* Date separator */}
            {groupIndex > 0 && (
              <Box
                display="flex"
                alignItems="center"
                my={2}
              >
                <Box flex={1} height="1px" bg="whiteAlpha.200" />
                <Text
                  fontSize="xs"
                  color="whiteAlpha.600"
                  px={2}
                  bg="rgba(0, 0, 0, 0.5)"
                  borderRadius="md"
                >
                  {group.date === new Date().toDateString() ? 'Today' : group.date}
                </Text>
                <Box flex={1} height="1px" bg="whiteAlpha.200" />
              </Box>
            )}
            
            {/* Messages for this date */}
            {group.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isCurrentUser={message.uid === currentUserId}
                spaceID={spaceID}
                onMessageDelete={handleMessageDelete}
              />
            ))}
          </Box>
        ))}
        
        {/* Scroll anchor - completely invisible */}
        <div ref={messagesEndRef} style={{ height: '1px', width: '100%' }} />
      </VStack>
    </Box>
  );
};

export default ChatMessageList;
