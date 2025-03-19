import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Link,
  SimpleGrid,
  Stack,
  Text,
  Flex,
  Tag,
  useColorModeValue,
  HStack,
  Icon,
} from '@chakra-ui/react';
import { FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa';

const ListHeader = ({ children }) => {
  return (
    <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
      {children}
    </Text>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <Box as="footer" bg="gray.50" py={10}>
      <Container maxW="container.xl">
        <Stack
          direction={{ base: 'column', md: 'row' }}
          spacing={4}
          justify="space-between"
          align={{ base: 'center', md: 'center' }}
        >
          <Text>© {currentYear} Disruptive Spaces. All rights reserved.</Text>
          
          <HStack spacing={4}>
            <Link href="https://twitter.com/disruptivespaces" isExternal>
              <Icon as={FaTwitter} boxSize={5} />
            </Link>
            <Link href="https://linkedin.com/company/disruptive-spaces" isExternal>
              <Icon as={FaLinkedin} boxSize={5} />
            </Link>
            <Link href="https://github.com/disruptive-spaces" isExternal>
              <Icon as={FaGithub} boxSize={5} />
            </Link>
          </HStack>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer; 