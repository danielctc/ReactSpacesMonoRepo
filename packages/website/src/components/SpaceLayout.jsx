import { Box, Flex, IconButton, HStack, Link, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { UserProvider } from '@disruptive-spaces/shared/providers/UserProvider';
import { FullScreenProvider } from '@disruptive-spaces/shared/providers/FullScreenProvider';
import HeaderAuthLinks from '@disruptive-spaces/header-auth-links/src/HeaderAuthLinks';

function SpaceLayout({ children, spaceName }) {
  
  
  return (
    <Flex direction="column" minH="100vh" width="100%">
      {/* Minimal header for space page */}
      <Box 
        as="header" 
        py={2} 
        px={4} 
        bg="rgba(0, 0, 0, 0.7)" 
        color="white"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={100}
        backdropFilter="blur(5px)"
        height="60px"
      >
        <Flex justify="space-between" align="center" height="100%">
          <HStack spacing={4}>
            <IconButton
              as={RouterLink}
              to="/spaces"
              icon={<ArrowBackIcon />}
              aria-label="Back to spaces"
              variant="ghost"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
            />
            {spaceName && (
              <Text fontWeight="medium" fontSize="md">
                {spaceName}
              </Text>
            )}
          </HStack>
          
          <UserProvider>
            <FullScreenProvider>
              <HeaderAuthLinks />
            </FullScreenProvider>
          </UserProvider>
        </Flex>
      </Box>
      
      {/* Main content */}
      <Box as="main" flex="1" width="100%">
        {children}
      </Box>
    </Flex>
  );
}

export default SpaceLayout; 