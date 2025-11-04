import React, { useState, useEffect, useContext, useRef } from 'react';
import { subscribeToSpaceChatMessages } from '@disruptive-spaces/shared/firebase/spaceChatFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import Message from './Message';
import { Box } from '@chakra-ui/react';

const Messages = ({ spaceID }) => {
    const [messages, setMessages] = useState([]);
    const { user } = useContext(UserContext);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const unsubscribe = subscribeToSpaceChatMessages(spaceID, (newMessages) => {
            
            setMessages((prevMessages) => [...prevMessages, ...newMessages]);
            Logger.log('Messages updated:', newMessages);
        });

        // Clean up subscription on unmount
        return () => unsubscribe();
    }, [spaceID]);

    useEffect(() => {
        // Scroll to the bottom smoothly when messages change
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <Box className="messages-container" display="flex" flexDirection="column" my="10px" overflowY="auto" maxHeight="80vh">
            {messages.map((message) => {
                const isCurrentUser = message.uid === user?.uid;
                return (
                    <Message
                        key={message.id}
                        name={message.user}
                        timestamp={message.timestamp}
                        text={message.text}
                        isCurrentUser={isCurrentUser}
                    />
                );
            })}
            <div ref={messagesEndRef} />
        </Box>
    );
};

export default Messages;
