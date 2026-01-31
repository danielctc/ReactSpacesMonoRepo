import React, { useContext, useState, useEffect } from 'react';
import { TabPanel, Box, Text, Spinner, VStack } from '@chakra-ui/react';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';
import AvatarAdminPanel from '../../AvatarAdminPanel';

/**
 * AvatarsTab - Admin panel for managing the global avatar collection.
 * Only visible to disruptiveAdmin users.
 */
const AvatarsTab = () => {
    const { user } = useContext(UserContext);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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
            setIsLoading(false);
        };

        checkAdminStatus();
    }, [user?.uid]);

    if (isLoading) {
        return (
            <TabPanel p={4} minH="400px">
                <VStack justify="center" align="center" h="200px">
                    <Spinner size="lg" color="blue.300" />
                    <Text color="whiteAlpha.600">Checking permissions...</Text>
                </VStack>
            </TabPanel>
        );
    }

    if (!isAdmin) {
        return (
            <TabPanel p={4} minH="400px">
                <Box
                    bg="rgba(255, 0, 0, 0.1)"
                    borderRadius="lg"
                    p={6}
                    textAlign="center"
                    border="1px solid"
                    borderColor="red.500"
                >
                    <Text color="red.300" fontWeight="600" mb={2}>
                        Access Denied
                    </Text>
                    <Text color="whiteAlpha.700" fontSize="sm">
                        Only administrators can manage the avatar collection.
                    </Text>
                </Box>
            </TabPanel>
        );
    }

    return (
        <TabPanel p={0} minH="400px" maxH="70vh" overflowY="auto">
            <AvatarAdminPanel />
        </TabPanel>
    );
};

export default AvatarsTab;
