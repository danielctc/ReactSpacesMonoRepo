import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Heading,
  Flex,
  Grid,
  GridItem,
  VStack,
  HStack,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { getAuth } from 'firebase/auth';
import AboutPageEditor from './AboutPageEditor';
import HomePageEditor from './HomePageEditor';

// Try to import TagsAdmin, but don't fail if it can't be loaded
const TagsAdminLazy = lazy(() => 
  import('@disruptive-spaces/webgl/src/components/TagsAdmin')
    .catch(() => ({ default: () => 
      <Alert status="error">
        <AlertIcon />
        Unable to load TagsAdmin component
      </Alert> 
    }))
);

const TagsAdminWithFallback = () => (
  <Suspense fallback={<Spinner />}>
    <TagsAdminLazy />
  </Suspense>
);

// Check if user is an admin by checking if they have the disruptiveAdmin group
const useIsAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // Check if user is logged in
        if (!auth.currentUser) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Fetch user's custom claims to check for admin role
        const token = await auth.currentUser.getIdTokenResult();
        const userGroups = token.claims.groups || [];
        
        setIsAdmin(userGroups.includes('disruptiveAdmin'));
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [auth.currentUser]);

  return { isAdmin, loading };
};

const WebsiteManager = () => {
  const [activePage, setActivePage] = useState('homepage');
  const { isAdmin, loading: checkingAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Redirect non-admins
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, checkingAdmin, navigate]);

  if (checkingAdmin) {
    return (
      <Container maxW="container.xl" py={10}>
        <Flex justify="center" align="center" h="50vh">
          <Spinner size="xl" />
        </Flex>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxW="container.xl" py={10}>
        <Alert status="error">
          <AlertIcon />
          You don't have permission to access this page
        </Alert>
      </Container>
    );
  }

  const renderContent = () => {
    switch (activePage) {
      case 'homepage':
        return <HomePageEditor />;
      case 'about':
        return <AboutPageEditor />;
      case 'tags':
        return <TagsAdminWithFallback />;
      default:
        return <HomePageEditor />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Website Content Manager</title>
      </Helmet>
      
      <Container maxW="container.xl" py={10}>
        <Heading as="h1" mb={6}>Website Content Manager</Heading>
        
        <Grid templateColumns="250px 1fr" gap={6}>
          {/* Sidebar Navigation */}
          <GridItem>
            <VStack 
              align="stretch" 
              spacing={0} 
              bg={bgColor} 
              borderRadius="md" 
              borderWidth="1px"
              borderColor={borderColor}
              overflow="hidden"
            >
              <Button 
                variant="ghost" 
                justifyContent="flex-start" 
                py={4}
                borderBottomWidth="1px"
                borderRadius="0"
                colorScheme={activePage === 'homepage' ? 'blue' : 'gray'}
                bg={activePage === 'homepage' ? 'blue.50' : 'transparent'}
                onClick={() => setActivePage('homepage')}
              >
                Homepage
              </Button>
              <Button 
                variant="ghost" 
                justifyContent="flex-start" 
                py={4}
                borderBottomWidth="1px"
                borderRadius="0"
                colorScheme={activePage === 'about' ? 'blue' : 'gray'}
                bg={activePage === 'about' ? 'blue.50' : 'transparent'}
                onClick={() => setActivePage('about')}
              >
                About Page
              </Button>
              <Button 
                variant="ghost" 
                justifyContent="flex-start" 
                py={4}
                borderRadius="0"
                colorScheme={activePage === 'tags' ? 'blue' : 'gray'}
                bg={activePage === 'tags' ? 'blue.50' : 'transparent'}
                onClick={() => setActivePage('tags')}
              >
                Tags Management
              </Button>
              {/* Add more page buttons here */}
            </VStack>
          </GridItem>
          
          {/* Content Area */}
          <GridItem
            bg="white"
            p={6}
            borderRadius="md"
            borderWidth="1px"
            borderColor={borderColor}
          >
            {renderContent()}
          </GridItem>
        </Grid>
      </Container>
    </>
  );
};

export default WebsiteManager; 