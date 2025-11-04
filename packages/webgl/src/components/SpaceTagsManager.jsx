import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Text,
  Flex,
  Heading,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Spinner,
  useToast,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { ChevronDownIcon, AddIcon, SettingsIcon } from '@chakra-ui/icons';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import { 
  getAllTags, 
  getSpaceTags, 
  addTagToSpace, 
  removeTagFromSpace,
  initializeDefaultTags
} from '@disruptive-spaces/shared/firebase/tagsFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

/**
 * Component for managing tags assigned to a space
 */
const SpaceTagsManager = ({ spaceID }) => {
  const [availableTags, setAvailableTags] = useState([]);
  const [spaceTags, setSpaceTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializeSuccess, setInitializeSuccess] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { user } = useContext(UserContext);
  
  // Check if user is admin
  const isAdmin = user?.groups && 
    (user.groups.includes('disruptiveAdmin') || user.groups.includes('admin'));

  // Load all tags and space tags on component mount
  useEffect(() => {
    loadTags();
  }, [spaceID]);
  
  const loadTags = async () => {
    setIsLoading(true);
    try {
      // Load all available tags
      let tags = [];
      try {
        tags = await getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        Logger.error('SpaceTagsManager: Error loading available tags:', error);
        setAvailableTags([]);
        toast({
          title: 'Error loading tags',
          description: 'Failed to load available tags. Please try again later.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
      
      // Load tags assigned to this space
      if (spaceID) {
        try {
          const currentSpaceTags = await getSpaceTags(spaceID);
          setSpaceTags(currentSpaceTags);
        } catch (error) {
          Logger.error('SpaceTagsManager: Error loading space tags:', error);
          setSpaceTags([]);
          toast({
            title: 'Error loading space tags',
            description: 'Failed to load this space\'s tags. Please try again later.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      }
    } catch (error) {
      Logger.error('SpaceTagsManager: Error in loadTags:', error);
      toast({
        title: 'Error loading tags',
        description: 'Failed to load tags. Please try again later.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle tag initialization for admins
  const handleInitializeTags = async () => {
    setIsInitializing(true);
    setInitializeSuccess(null);
    
    try {
      const result = await initializeDefaultTags();
      
      setInitializeSuccess(result);
      toast({
        title: 'Tags initialized',
        description: `Successfully created ${result.created} tags. Skipped ${result.skipped} existing tags.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      
      // Reload tags
      await loadTags();
      
    } catch (error) {
      Logger.error('SpaceTagsManager: Error initializing tags:', error);
      setInitializeSuccess(false);
      toast({
        title: 'Error initializing tags',
        description: 'Failed to initialize tags. Please try again later.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Add a tag to the space
  const handleAddTag = async (tagId) => {
    if (!spaceID || !tagId) return;
    
    setIsUpdating(true);
    try {
      await addTagToSpace(spaceID, tagId);
      
      // Find the tag object to add to the UI
      const tagToAdd = availableTags.find(tag => tag.id === tagId);
      if (tagToAdd) {
        setSpaceTags(prev => [...prev, tagToAdd]);
      }
      
      toast({
        title: 'Tag added',
        description: 'Tag has been added to the space.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      Logger.error(`SpaceTagsManager: Error adding tag ${tagId} to space:`, error);
      toast({
        title: 'Error adding tag',
        description: 'Failed to add tag to the space.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove a tag from the space
  const handleRemoveTag = async (tagId) => {
    if (!spaceID || !tagId) return;
    
    setIsUpdating(true);
    try {
      await removeTagFromSpace(spaceID, tagId);
      
      // Remove the tag from the UI
      setSpaceTags(prev => prev.filter(tag => tag.id !== tagId));
      
      toast({
        title: 'Tag removed',
        description: 'Tag has been removed from the space.',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      Logger.error(`SpaceTagsManager: Error removing tag ${tagId} from space:`, error);
      toast({
        title: 'Error removing tag',
        description: 'Failed to remove tag from the space.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Get available tags that aren't already assigned to the space
  const getUnassignedTags = () => {
    const assignedTagIds = spaceTags.map(tag => tag.id);
    return availableTags.filter(tag => !assignedTagIds.includes(tag.id));
  };

  // Check if the dropdown should be disabled
  const isEmpty = getUnassignedTags().length === 0;

  return (
    <Box>
      <Flex mb={3} justifyContent="space-between" alignItems="center">
        <HStack spacing={2} ml="auto">
          {/* Admin actions button */}
          {isAdmin && (
            <Button
              size="xs"
              leftIcon={<SettingsIcon />}
              onClick={onOpen}
              variant="outline"
              colorScheme="purple"
            >
              Admin
            </Button>
          )}
          
          {/* Add tag dropdown */}
          <Menu>
            <MenuButton
              as={Button}
              size="xs"
              leftIcon={<AddIcon />}
              rightIcon={<ChevronDownIcon />}
              isDisabled={isLoading || isUpdating || isEmpty}
            >
              {isEmpty ? 'No Available Tags' : 'Add Tag'}
            </MenuButton>
            <MenuList zIndex={1000} bg="gray.800" borderColor="gray.700" color="white">
              {getUnassignedTags().length > 0 ? (
                getUnassignedTags().map(tag => (
                  <MenuItem 
                    key={tag.id} 
                    onClick={() => handleAddTag(tag.id)}
                    icon={
                      <Box 
                        width="12px" 
                        height="12px" 
                        borderRadius="full" 
                        bg={tag.color || "#888"} 
                      />
                    }
                    _hover={{ bg: "gray.700" }}
                    _focus={{ bg: "gray.700" }}
                    _active={{ bg: "gray.700" }}
                    _focusVisible={{ bg: "gray.700" }}
                    bg="gray.800"
                    color="white"
                  >
                    {tag.name}
                  </MenuItem>
                ))
              ) : (
                <MenuItem isDisabled bg="gray.800" color="gray.400">No available tags to add</MenuItem>
              )}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
      
      {isLoading ? (
        <Flex justify="center" py={4}>
          <Spinner size="sm" color="blue.300" />
        </Flex>
      ) : availableTags.length === 0 ? (
        <Box>
          <Text fontSize="sm" color="red.400" mb={2}>
            No tags have been created in the system yet.
            {isAdmin ? ' Use the Admin button to initialize tags.' : ' Ask an admin to initialize tags.'}
          </Text>
        </Box>
      ) : spaceTags.length === 0 ? (
        <Text fontSize="sm" color="gray.400" fontStyle="italic">
          No tags assigned to this space.
        </Text>
      ) : (
        <Wrap spacing={2}>
          {spaceTags.map(tag => (
            <WrapItem key={tag.id}>
              <Tag 
                size="md" 
                borderRadius="full" 
                variant="subtle" 
                colorScheme="gray"
                boxShadow={`0 0 0 1px ${tag.color || "#888"}`}
              >
                <Box 
                  width="8px" 
                  height="8px" 
                  borderRadius="full" 
                  bg={tag.color || "#888"} 
                  mr={1}
                />
                <TagLabel>{tag.name}</TagLabel>
                <TagCloseButton 
                  onClick={() => handleRemoveTag(tag.id)} 
                  isDisabled={isUpdating}
                />
              </Tag>
            </WrapItem>
          ))}
        </Wrap>
      )}
      
      {/* Admin Modal for initializing tags */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader fontSize="md">Tag System Administration</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" mb={4}>
              Initialize the default tags in your Firestore database.
              This will create a set of predefined tags if they don't already exist.
            </Text>
            
            {initializeSuccess && (
              <Alert status="success" mb={4} borderRadius="md" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  Tags initialized. Created: <b>{initializeSuccess.created}</b>, Skipped: <b>{initializeSuccess.skipped}</b>
                </Text>
              </Alert>
            )}
            
            <Button
              colorScheme="blue"
              onClick={handleInitializeTags}
              isLoading={isInitializing}
              loadingText="Initializing..."
              size="sm"
              width="full"
            >
              Initialize Default Tags
            </Button>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

SpaceTagsManager.propTypes = {
  spaceID: PropTypes.string.isRequired
};

export default SpaceTagsManager; 