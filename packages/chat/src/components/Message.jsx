import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

const Message = ({ name, timestamp, text, isCurrentUser }) => {
    console.log('Message props:', { name, timestamp, text, isCurrentUser });

    const formattedTimestamp = timestamp && timestamp.toDate
        ? format(timestamp.toDate(), 'HH:mm')
        : 'Invalid date';

    return (
        <MotionBox
            display="flex"
            flexDirection="column"
            alignItems={isCurrentUser ? 'flex-end' : 'flex-start'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <Box
                w="auto"
                maxW="80%"
                bg={isCurrentUser ? 'secondary.500' : 'primary.200'}
                color={isCurrentUser ? 'white' : 'black'}
                p="10px"
                borderRadius="10px"
                alignSelf={isCurrentUser ? 'flex-end' : 'flex-start'}
                wordBreak="break-word"
            >
                <Text fontWeight="bold">{name}</Text>
                <Text>{text}</Text>
            </Box>
            <Text color="copy.light" fontSize="xs" mt="4px" mx="6px" mb="10px" textAlign={isCurrentUser ? 'right' : 'left'}>
                {formattedTimestamp}
            </Text>
        </MotionBox>
    );
};

Message.propTypes = {
    name: PropTypes.string.isRequired,
    timestamp: PropTypes.object,
    text: PropTypes.string.isRequired,
    isCurrentUser: PropTypes.bool.isRequired,
};

export default Message;
