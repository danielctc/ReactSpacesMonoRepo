import React from 'react';
import {
  TabPanel,
  Text,
  VStack,
  HStack,
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Button,
  Switch,
  IconButton,
  Alert,
  AlertIcon,
  AlertDescription,
  Divider,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

/**
 * Custom Tab - Manages Override settings for custom player URLs.
 * Override allows temporary RPM URL replacement for all users in this space.
 */
const CustomTab = ({
  overrideEnabled,
  customPlayers,
  newPlayerUrl,
  setNewPlayerUrl,
  isSavingOverride,
  handleAddCustomPlayer,
  handleRemoveCustomPlayer,
  handleOverrideToggle,
  handleSaveOverrideSettings,
}) => {
  return (
    <TabPanel p={4} display="flex" flexDirection="column">
      <Text fontSize="sm" fontWeight="600" mb={3} color="white">
        Custom Player Override
      </Text>

      <Alert status="info" variant="subtle" borderRadius="md" mb={4} bg="blue.900">
        <AlertIcon />
        <AlertDescription fontSize="xs">
          When enabled, users in this space will use avatars from your custom URL list instead of
          their profile avatars. This only affects this space.
        </AlertDescription>
      </Alert>

      <VStack spacing={4} align="stretch">
        {/* Enable/Disable Toggle */}
        <FormControl display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <FormLabel mb={0} fontSize="sm" color="white">
              Enable Override
            </FormLabel>
            <FormHelperText fontSize="xs" mt={0}>
              {overrideEnabled
                ? 'Custom avatars are active for all users'
                : 'Users use their profile avatars'}
            </FormHelperText>
          </Box>
          <Switch
            colorScheme="blue"
            isChecked={overrideEnabled}
            onChange={handleOverrideToggle}
            isDisabled={isSavingOverride}
          />
        </FormControl>

        <Divider borderColor="whiteAlpha.200" />

        {/* Add Custom Player URL */}
        <FormControl>
          <FormLabel fontSize="xs" color="white">
            Add Custom Avatar URL
          </FormLabel>
          <HStack>
            <Input
              value={newPlayerUrl}
              onChange={(e) => setNewPlayerUrl(e.target.value)}
              placeholder="https://models.readyplayer.me/..."
              size="sm"
              bg="whiteAlpha.100"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: 'whiteAlpha.300' }}
              _focus={{ borderColor: 'blue.300', boxShadow: '0 0 0 1px #63B3ED' }}
              color="white"
              flex="1"
            />
            <IconButton
              icon={<FiPlus />}
              colorScheme="blue"
              size="sm"
              onClick={handleAddCustomPlayer}
              aria-label="Add URL"
            />
          </HStack>
          <FormHelperText fontSize="xs">Ready Player Me avatar URLs (GLB format)</FormHelperText>
        </FormControl>

        {/* Custom Players List */}
        {customPlayers.length > 0 && (
          <Box>
            <Text fontSize="xs" fontWeight="medium" color="gray.400" mb={2}>
              Custom Avatars ({customPlayers.length})
            </Text>
            <VStack spacing={2} align="stretch">
              {customPlayers.map((player, index) => (
                <HStack
                  key={player.id}
                  p={2}
                  bg="whiteAlpha.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="whiteAlpha.100"
                  justify="space-between"
                >
                  <HStack spacing={2} flex="1" overflow="hidden">
                    <Text fontSize="xs" color="gray.400" fontWeight="medium" minW="20px">
                      #{index + 1}
                    </Text>
                    <Text fontSize="xs" color="white" isTruncated title={player.url}>
                      {player.url}
                    </Text>
                  </HStack>
                  <IconButton
                    icon={<FiTrash2 />}
                    colorScheme="red"
                    variant="ghost"
                    size="xs"
                    onClick={() => handleRemoveCustomPlayer(player.id)}
                    aria-label="Remove URL"
                  />
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {customPlayers.length === 0 && (
          <Text fontSize="xs" color="gray.500" fontStyle="italic">
            No custom avatars added. Add URLs above to override user avatars.
          </Text>
        )}

        <Button
          colorScheme="blue"
          size="sm"
          onClick={handleSaveOverrideSettings}
          isLoading={isSavingOverride}
          loadingText="Saving..."
          alignSelf="flex-start"
          mt={2}
        >
          Save Override Settings
        </Button>
      </VStack>
    </TabPanel>
  );
};

export default CustomTab;
