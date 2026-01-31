import React from 'react';
import {
  TabPanel,
  Text,
  VStack,
  HStack,
  Box,
  Avatar,
  Badge,
  Button,
  Spinner,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FiAward, FiStar, FiUserMinus } from 'react-icons/fi';

/**
 * Users Tab - Displays space owners, hosts, and banned users.
 */
const UsersTab = ({
  spaceOwners,
  spaceHosts,
  isLoadingUsers,
  bannedUsers,
  unbanningUid,
  handleUnbanUser,
}) => {
  const UserCard = ({ user, roleIcon, roleColor, roleName }) => (
    <HStack
      p={3}
      bg="whiteAlpha.50"
      borderRadius="md"
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      justify="space-between"
    >
      <HStack spacing={3}>
        <Avatar size="sm" src={user.photoURL} name={user.displayName} />
        <Box>
          <Text fontSize="sm" fontWeight="medium" color="white">
            {user.displayName}
          </Text>
          <Text fontSize="xs" color="gray.400">
            {user.email}
          </Text>
        </Box>
      </HStack>
      <Badge colorScheme={roleColor} fontSize="xs">
        <HStack spacing={1}>
          <Icon as={roleIcon} />
          <Text>{roleName}</Text>
        </HStack>
      </Badge>
    </HStack>
  );

  if (isLoadingUsers) {
    return (
      <TabPanel p={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        <Spinner color="blue.300" />
        <Text fontSize="sm" mt={3} color="gray.400">
          Loading users...
        </Text>
      </TabPanel>
    );
  }

  return (
    <TabPanel p={4} display="flex" flexDirection="column">
      <Text fontSize="sm" fontWeight="600" mb={3} color="white">
        Space Users
      </Text>

      <VStack spacing={4} align="stretch">
        {/* Owners Section */}
        <Box>
          <HStack mb={2}>
            <Icon as={FiAward} color="yellow.400" />
            <Text fontSize="xs" fontWeight="medium" color="gray.400">
              Owners ({spaceOwners.length})
            </Text>
          </HStack>
          <VStack spacing={2} align="stretch">
            {spaceOwners.length > 0 ? (
              spaceOwners.map((owner) => (
                <UserCard
                  key={owner.uid}
                  user={owner}
                  roleIcon={FiAward}
                  roleColor="yellow"
                  roleName="Owner"
                />
              ))
            ) : (
              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                No owners assigned
              </Text>
            )}
          </VStack>
        </Box>

        <Divider borderColor="whiteAlpha.200" />

        {/* Hosts Section */}
        <Box>
          <HStack mb={2}>
            <Icon as={FiStar} color="blue.400" />
            <Text fontSize="xs" fontWeight="medium" color="gray.400">
              Hosts ({spaceHosts.length})
            </Text>
          </HStack>
          <VStack spacing={2} align="stretch">
            {spaceHosts.length > 0 ? (
              spaceHosts.map((host) => (
                <UserCard
                  key={host.uid}
                  user={host}
                  roleIcon={FiStar}
                  roleColor="blue"
                  roleName="Host"
                />
              ))
            ) : (
              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                No hosts assigned
              </Text>
            )}
          </VStack>
        </Box>

        <Divider borderColor="whiteAlpha.200" />

        {/* Banned Users Section */}
        <Box>
          <HStack mb={2}>
            <Icon as={FiUserMinus} color="red.400" />
            <Text fontSize="xs" fontWeight="medium" color="gray.400">
              Banned Users ({bannedUsers.length})
            </Text>
          </HStack>
          <VStack spacing={2} align="stretch">
            {bannedUsers.length > 0 ? (
              bannedUsers.map((user) => (
                <HStack
                  key={user.uid}
                  p={3}
                  bg="whiteAlpha.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="red.900"
                  justify="space-between"
                >
                  <HStack spacing={3}>
                    <Avatar size="sm" src={user.photoURL} name={user.displayName} />
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" color="white">
                        {user.displayName}
                      </Text>
                      {user.firstName && user.lastName && (
                        <Text fontSize="xs" color="gray.400">
                          {user.firstName} {user.lastName}
                        </Text>
                      )}
                    </Box>
                  </HStack>
                  <Button
                    size="xs"
                    colorScheme="green"
                    variant="outline"
                    onClick={() => handleUnbanUser(user.uid)}
                    isLoading={unbanningUid === user.uid}
                    loadingText="Unbanning..."
                  >
                    Unban
                  </Button>
                </HStack>
              ))
            ) : (
              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                No banned users
              </Text>
            )}
          </VStack>
        </Box>
      </VStack>
    </TabPanel>
  );
};

export default UsersTab;
