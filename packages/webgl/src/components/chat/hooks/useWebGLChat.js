import { useState, useEffect, useCallback, useContext } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { 
  sendMessageToSpaceChat, 
  subscribeToSpaceChatMessages 
} from '@disruptive-spaces/shared/firebase/spaceChatFirestore';
import { getUserProfileData } from '@disruptive-spaces/shared/firebase/userFirestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

export const useWebGLChat = (spaceID) => {
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [enrichedMessages, setEnrichedMessages] = useState([]);

  // Clear messages when spaceID changes
  useEffect(() => {
    setMessages([]);
    setEnrichedMessages([]);
    setError(null);
  }, [spaceID]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!spaceID) {
      Logger.warn('useWebGLChat: No spaceID provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    Logger.log('useWebGLChat: Subscribing to chat messages for space:', spaceID);

    // Set a timeout to stop loading if no response after 10 seconds
    const loadingTimeout = setTimeout(() => {
      Logger.warn('useWebGLChat: Loading timeout reached, stopping loading state');
      setIsLoading(false);
    }, 10000);

    try {
      // Create a custom subscription that loads existing messages first
      const chatRef = collection(db, `spaces/${spaceID}/chatMessages`);
      // Get recent messages (last 50) and listen for new ones
      const chatQuery = query(chatRef, orderBy('timestamp', 'desc'), limit(50));

      const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
        Logger.log('useWebGLChat: Firestore snapshot received, docs:', snapshot.docs.length);
        
        const allMessages = [];
        snapshot.forEach((doc) => {
          const messageData = doc.data();
          allMessages.push({ id: doc.id, ...messageData });
        });
        
        // Sort messages by timestamp (oldest first for display)
        const sortedMessages = allMessages.sort((a, b) => {
          const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return aTime - bTime;
        });

        // Filter messages to only show those from the last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentMessages = sortedMessages.filter(message => {
          const messageTime = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
          return messageTime >= twentyFourHoursAgo;
        });

        Logger.log('useWebGLChat: Setting messages:', recentMessages.length, 'of', sortedMessages.length, 'total (filtered last 24h)');
        setMessages(recentMessages);
        setIsLoading(false);
        clearTimeout(loadingTimeout);
      }, (error) => {
        Logger.error('useWebGLChat: Firestore subscription error:', error);
        setError('Failed to load chat messages');
        setIsLoading(false);
      });

      return () => {
        Logger.log('useWebGLChat: Unsubscribing from chat messages');
        clearTimeout(loadingTimeout);
        unsubscribe();
      };
    } catch (err) {
      Logger.error('useWebGLChat: Error setting up subscription:', err);
      setError('Failed to load chat messages');
      setIsLoading(false);
      clearTimeout(loadingTimeout);
    }
  }, [spaceID]);

  // Enrich messages with user profile data
  useEffect(() => {
    const enrichMessages = async () => {
      if (messages.length === 0) {
        setEnrichedMessages([]);
        return;
      }

      try {
        const enriched = await Promise.all(
          messages.map(async (message) => {
            // Skip enrichment if message already has profile data or is from current user
            if (message.rpmURL !== undefined || !message.uid) {
              return message;
            }

            try {
              const profile = await getUserProfileData(message.uid);
              
              // Determine user role based on groups
              let role = null;
              if (profile.groups) {
                const ownerGroup = `space_${spaceID}_owners`;
                const hostGroup = `space_${spaceID}_hosts`;
                
                if (profile.groups.includes(ownerGroup)) {
                  role = 'owner';
                } else if (profile.groups.includes(hostGroup)) {
                  role = 'host';
                }
              }

              return {
                ...message,
                rpmURL: profile.rpmURL,
                role: role,
                firstName: profile.firstName,
                lastName: profile.lastName
              };
            } catch (profileError) {
              Logger.warn('useWebGLChat: Failed to enrich message with profile data:', profileError);
              return message;
            }
          })
        );

        setEnrichedMessages(enriched);
      } catch (err) {
        Logger.error('useWebGLChat: Error enriching messages:', err);
        // Fallback to non-enriched messages
        setEnrichedMessages(messages);
      }
    };

    enrichMessages();
  }, [messages, spaceID]);

  // Send message function
  const sendMessage = useCallback(async (messageData) => {
    if (!spaceID || !user) {
      throw new Error('Cannot send message: missing spaceID or user');
    }

    if (!messageData.text?.trim()) {
      throw new Error('Cannot send empty message');
    }

    setError(null);

    try {
      Logger.log('useWebGLChat: Sending message:', messageData);
      
      const messageToSend = {
        text: messageData.text.trim(),
        uid: user.uid,
        user: messageData.user || user.Nickname || user.displayName || 'Anonymous',
        timestamp: new Date(),
        rpmURL: messageData.rpmURL || user.rpmURL,
        isGuest: messageData.isGuest || user.isGuest || false
      };

      await sendMessageToSpaceChat(spaceID, messageToSend);
      Logger.log('useWebGLChat: Message sent successfully');
      
    } catch (err) {
      Logger.error('useWebGLChat: Error sending message:', err);
      setError('Failed to send message');
      throw err;
    }
  }, [spaceID, user]);

  // Get message count
  const messageCount = enrichedMessages.length;

  // Get recent messages (for notifications)
  const getRecentMessages = useCallback((since) => {
    const sinceTime = new Date(since);
    return enrichedMessages.filter(msg => {
      const msgTime = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
      return msgTime > sinceTime;
    });
  }, [enrichedMessages]);

  return {
    messages: enrichedMessages,
    messageCount,
    sendMessage,
    isLoading,
    error,
    getRecentMessages
  };
};
