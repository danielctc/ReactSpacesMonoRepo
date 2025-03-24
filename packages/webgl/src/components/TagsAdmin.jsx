import React, { useState } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast
} from '@chakra-ui/react';
import { 
  initializeDefaultTags, 
  updateAllSpacesWithTagsField,
  getAllTags
} from '@disruptive-spaces/shared/firebase/tagsFirestore';
import { useUser } from '@disruptive-spaces/shared/providers/UserProvider';

/**
 * Admin component for tags system management
 * Shows controls for initializing tags and updating spaces
 */
const TagsAdmin = () => {
  const [isInitializingTags, setIsInitializingTags] = useState(false);
  const [isUpdatingSpaces, setIsUpdatingSpaces] = useState(false);
  const [tagStats, setTagStats] = useState(null);
  const [spaceStats, setSpaceStats] = useState(null);
  const [error, setError] = useState(null);
  const [tagCount, setTagCount] = useState(null);
  const toast = useToast();
  const { user } = useUser();

  // Check if user is admin, allowing both 'disruptiveAdmin' and 'admin' groups
  const isAdmin = user?.groups && 
    (user.groups.includes('disruptiveAdmin') || user.groups.includes('admin'));

  // Fetch tag count on component mount
  React.useEffect(() => {
    const fetchTagCount = async () => {
      try {
        const tags = await getAllTags();
        setTagCount(tags.length);
      } catch (error) {
        console.error('Error fetching tag count:', error);
      }
    };
    
    fetchTagCount();
  }, [tagStats]);

  const handleInitializeTags = async () => {
    setError(null);
    setIsInitializingTags(true);
    try {
      const stats = await initializeDefaultTags();
      setTagStats(stats);
      toast({
        title: 'Tags initialized successfully',
        description: `Created: ${stats.created}, Skipped: ${stats.skipped}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error initializing tags:', error);
      setError(error.message || 'An error occurred while initializing tags');
      toast({
        title: 'Error initializing tags',
        description: error.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsInitializingTags(false);
    }
  };

  const handleUpdateSpaces = async () => {
    setError(null);
    setIsUpdatingSpaces(true);
    try {
      const stats = await updateAllSpacesWithTagsField();
      setSpaceStats(stats);
      toast({
        title: 'Spaces updated successfully',
        description: `Updated: ${stats.updated}, Skipped: ${stats.skipped}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating spaces:', error);
      setError(error.message || 'An error occurred while updating spaces');
      toast({
        title: 'Error updating spaces',
        description: error.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUpdatingSpaces(false);
    }
  };

  if (!isAdmin) {
    return (
      <Alert status="warning" borderRadius="md">
        <AlertIcon />
        <AlertTitle>Restricted Access</AlertTitle>
        <AlertDescription>
          You do not have permission to access this section.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.900" color="white">
      <Heading size="md" mb={4}>Tag System Administration</Heading>
      
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>Error:</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <VStack align="stretch" spacing={6}>
        <Box>
          <Text fontWeight="bold" mb={2}>1. Initialize Default Tags</Text>
          <Text fontSize="sm" mb={3}>
            This will create the default set of tags in your Firestore database.
            Existing tags will not be modified.
          </Text>
          
          {tagCount !== null && (
            <Text fontSize="sm" mb={3}>
              Current tag count: <Text as="span" fontWeight="bold">{tagCount}</Text>
            </Text>
          )}
          
          <Button
            colorScheme="blue"
            onClick={handleInitializeTags}
            isLoading={isInitializingTags}
            loadingText="Initializing..."
            size="sm"
          >
            Initialize Default Tags
          </Button>
          
          {tagStats && (
            <Alert status="info" mt={2} size="sm" borderRadius="md">
              <AlertIcon />
              <Text fontSize="sm">
                Tags initialized. Created: <b>{tagStats.created}</b>, Skipped: <b>{tagStats.skipped}</b>
              </Text>
            </Alert>
          )}
        </Box>
        
        <Box>
          <Text fontWeight="bold" mb={2}>2. Update Spaces with Tags Field</Text>
          <Text fontSize="sm" mb={3}>
            This will add an empty 'tags' array field to any space documents that don't have one.
            This migration is required for the tagging system to work properly.
          </Text>
          
          <Button
            colorScheme="green"
            onClick={handleUpdateSpaces}
            isLoading={isUpdatingSpaces}
            loadingText="Updating..."
            size="sm"
          >
            Update Spaces
          </Button>
          
          {spaceStats && (
            <Alert status="info" mt={2} size="sm" borderRadius="md">
              <AlertIcon />
              <Text fontSize="sm">
                Spaces updated. Updated: <b>{spaceStats.updated}</b>, Skipped: <b>{spaceStats.skipped}</b>
              </Text>
            </Alert>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default TagsAdmin; 