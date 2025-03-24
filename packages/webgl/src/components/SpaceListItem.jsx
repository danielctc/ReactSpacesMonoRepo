import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Text,
  Image,
  HStack,
  Flex,
  Spacer,
  Icon,
  Tag,
  TagLabel,
  Badge,
  Tooltip,
  useColorModeValue,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { FiUsers, FiStar, FiLock } from 'react-icons/fi';
import { getSpaceTags } from '@disruptive-spaces/shared/firebase/tagsFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

const SpaceListItem = ({ 
  id, 
  name, 
  description, 
  thumbnailUrl, 
  isPrivate, 
  userCount, 
  isHosted, 
  onClick,
  isAccessible
}) => {
  const [tags, setTags] = useState([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  
  // Load tags for this space
  useEffect(() => {
    const loadTags = async () => {
      if (!id) return;
      
      setIsLoadingTags(true);
      try {
        const spaceTags = await getSpaceTags(id);
        setTags(spaceTags);
      } catch (error) {
        Logger.error('SpaceListItem: Error loading tags:', error);
      } finally {
        setIsLoadingTags(false);
      }
    };
    
    loadTags();
  }, [id]);

  // Determine background color based on accessibility
  const bgColor = useColorModeValue(
    isAccessible ? 'white' : 'gray.50',
    isAccessible ? 'gray.800' : 'gray.900'
  );
  
  // Determine border color based on hosted status
  const borderColor = useColorModeValue(
    isHosted ? 'blue.200' : 'gray.200',
    isHosted ? 'blue.700' : 'gray.700'
  );

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="sm"
      p={4}
      cursor="pointer"
      onClick={onClick}
      bg={bgColor}
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: 'md',
        borderColor: isHosted ? 'blue.400' : 'gray.300'
      }}
    >
      <Flex direction={{ base: 'column', md: 'row' }} mb={2}>
        {thumbnailUrl ? (
          <Image 
            borderRadius="md"
            boxSize="80px"
            src={thumbnailUrl} 
            alt={name}
            objectFit="cover"
            mr={{ base: 0, md: 3 }}
            mb={{ base: 2, md: 0 }}
          />
        ) : (
          <Box 
            borderRadius="md"
            boxSize="80px"
            bg="gray.200"
            color="gray.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mr={{ base: 0, md: 3 }}
            mb={{ base: 2, md: 0 }}
          >
            <Text fontSize="xs">No Image</Text>
          </Box>
        )}
        
        <Box flex="1">
          <HStack mb={1}>
            <Text fontWeight="bold" fontSize="md">{name}</Text>
            <Spacer />
            {isPrivate && (
              <Tooltip label="Private Space" placement="top">
                <Icon as={FiLock} color="gray.500" />
              </Tooltip>
            )}
          </HStack>
          
          <Text fontSize="sm" noOfLines={2} mb={2} color="gray.600">
            {description || "No description available"}
          </Text>
          
          {tags.length > 0 && (
            <Wrap spacing={1} mb={2}>
              {tags.slice(0, 3).map((tag) => (
                <WrapItem key={tag.id}>
                  <Tag 
                    size="sm" 
                    borderRadius="full" 
                    variant="subtle" 
                    colorScheme="gray"
                    boxShadow={`0 0 0 1px ${tag.color}`}
                  >
                    <Box 
                      width="6px" 
                      height="6px" 
                      borderRadius="full" 
                      bg={tag.color} 
                      mr={1}
                    />
                    <TagLabel fontSize="xs">{tag.name}</TagLabel>
                  </Tag>
                </WrapItem>
              ))}
              {tags.length > 3 && (
                <WrapItem>
                  <Tag size="sm" borderRadius="full" variant="subtle">
                    <TagLabel fontSize="xs">+{tags.length - 3} more</TagLabel>
                  </Tag>
                </WrapItem>
              )}
            </Wrap>
          )}
          
          <HStack spacing={2}>
            <Tooltip label="Current Users" placement="top">
              <Badge colorScheme="green" variant="subtle">
                <HStack spacing={1}>
                  <Icon as={FiUsers} fontSize="xs" />
                  <Text fontSize="xs">{userCount || 0}</Text>
                </HStack>
              </Badge>
            </Tooltip>
            
            {isHosted && (
              <Tooltip label="Hosted Space" placement="top">
                <Badge colorScheme="blue" variant="subtle">
                  <HStack spacing={1}>
                    <Icon as={FiStar} fontSize="xs" />
                    <Text fontSize="xs">Hosted</Text>
                  </HStack>
                </Badge>
              </Tooltip>
            )}
            
            {!isAccessible && (
              <Tooltip label="You don't have access to this space" placement="top">
                <Badge colorScheme="red" variant="subtle">
                  <HStack spacing={1}>
                    <Icon as={FiLock} fontSize="xs" />
                    <Text fontSize="xs">No Access</Text>
                  </HStack>
                </Badge>
              </Tooltip>
            )}
          </HStack>
        </Box>
      </Flex>
    </Box>
  );
};

SpaceListItem.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  thumbnailUrl: PropTypes.string,
  isPrivate: PropTypes.bool,
  userCount: PropTypes.number,
  isHosted: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  isAccessible: PropTypes.bool
};

SpaceListItem.defaultProps = {
  description: '',
  thumbnailUrl: '',
  isPrivate: false,
  userCount: 0,
  isHosted: false,
  isAccessible: true
};

export default SpaceListItem; 