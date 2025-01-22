import { useContext } from 'react';
import { UserContext } from "@disruptive-spaces/shared/providers/UserProvider";
import { Box, Text } from '@chakra-ui/react';

import Messages from './components/Messages';
import PostMessage from './components/PostMessage';

const Chat = ({ spaceID }) => {
    const { user } = useContext(UserContext);

    if (!user) {
        console.log('No user found, returning login message');
        return (
            <Box>
                <Text>Please log in to view the chat.</Text>
            </Box>
        );
    }

    return (

        <Box>
            <Box
                height="400px"
                overflowY="auto"
                border="1px solid #ccc"
                backgroundColor="tertiaryAlpha.600"
                padding="10px"
            >
                <Messages spaceID={spaceID} />

            </Box>
            <Box mt="8px">
                <PostMessage spaceID={spaceID} />
            </Box>
        </Box>
    );
};

export default Chat;
