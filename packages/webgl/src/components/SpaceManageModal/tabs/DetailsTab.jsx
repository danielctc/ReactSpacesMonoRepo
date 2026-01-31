import React from 'react';
import {
  TabPanel,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import SpaceTagsManager from '../../SpaceTagsManager';

/**
 * Details Tab - Manages space name, description, and tags.
 */
const DetailsTab = ({
  spaceID,
  spaceName,
  setSpaceName,
  spaceDescription,
  setSpaceDescription,
  isSavingDetails,
  handleSaveSpaceDetails,
}) => {
  return (
    <TabPanel p={4} display="flex" flexDirection="column">
      <Text fontSize="sm" fontWeight="600" mb={3} color="white">
        Space Details
      </Text>

      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel fontSize="xs" color="white">
            Space Name
          </FormLabel>
          <Input
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="Enter space name"
            size="sm"
            bg="whiteAlpha.100"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: 'whiteAlpha.300' }}
            _focus={{ borderColor: 'blue.300', boxShadow: '0 0 0 1px #63B3ED' }}
            color="white"
            maxLength={100}
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="xs" color="white">
            Description
          </FormLabel>
          <Textarea
            value={spaceDescription}
            onChange={(e) => setSpaceDescription(e.target.value)}
            placeholder="Enter space description"
            size="sm"
            bg="whiteAlpha.100"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: 'whiteAlpha.300' }}
            _focus={{ borderColor: 'blue.300', boxShadow: '0 0 0 1px #63B3ED' }}
            rows={4}
            resize="vertical"
            maxLength={500}
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="xs" color="white">
            Space Tags
          </FormLabel>
          <Box
            p={3}
            bg="whiteAlpha.50"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="md"
          >
            {spaceID ? (
              <SpaceTagsManager spaceID={spaceID} />
            ) : (
              <Alert status="warning" variant="subtle" borderRadius="md">
                <AlertIcon />
                <AlertTitle fontSize="sm">Space ID missing</AlertTitle>
                <AlertDescription fontSize="xs">
                  Unable to load tags without a valid space ID.
                </AlertDescription>
              </Alert>
            )}
          </Box>
        </FormControl>

        <Button
          colorScheme="blue"
          size="sm"
          onClick={handleSaveSpaceDetails}
          isLoading={isSavingDetails}
          loadingText="Saving..."
          alignSelf="flex-start"
          mt={2}
        >
          Save Details
        </Button>
      </VStack>
    </TabPanel>
  );
};

export default DetailsTab;
