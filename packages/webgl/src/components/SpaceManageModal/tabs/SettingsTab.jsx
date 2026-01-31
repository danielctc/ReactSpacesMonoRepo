import React from 'react';
import {
  TabPanel,
  Text,
  VStack,
  HStack,
  Switch,
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FiVolume2, FiMessageCircle, FiUsers } from 'react-icons/fi';

/**
 * Settings Tab - Manages space settings like voice, chat, accessibility.
 */
const SettingsTab = ({
  voiceDisabled,
  textChatDisabled,
  accessibleToAllUsers,
  allowGuestUsers,
  hideGuestSignInButton,
  isUpdatingSettings,
  handleVoiceToggle,
  handleTextChatToggle,
  handleAccessibilityToggle,
  handleGuestUsersToggle,
  handleHideSignInButtonToggle,
}) => {
  return (
    <TabPanel p={4} display="flex" flexDirection="column">
      <Text fontSize="sm" fontWeight="600" mb={3} color="white">
        Space Settings
      </Text>

      <VStack spacing={4} align="stretch">
        {/* Communication Settings */}
        <Box>
          <Text fontSize="xs" fontWeight="medium" color="gray.400" mb={3}>
            Communication
          </Text>

          <VStack spacing={3} align="stretch">
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <HStack spacing={2}>
                <Icon as={FiVolume2} color="gray.400" />
                <Box>
                  <FormLabel mb={0} fontSize="sm" color="white">
                    Voice Chat
                  </FormLabel>
                  <FormHelperText fontSize="xs" mt={0}>
                    {voiceDisabled ? 'Voice chat is disabled' : 'Voice chat is enabled'}
                  </FormHelperText>
                </Box>
              </HStack>
              <Switch
                colorScheme="blue"
                isChecked={!voiceDisabled}
                onChange={handleVoiceToggle}
                isDisabled={isUpdatingSettings}
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <HStack spacing={2}>
                <Icon as={FiMessageCircle} color="gray.400" />
                <Box>
                  <FormLabel mb={0} fontSize="sm" color="white">
                    Text Chat
                  </FormLabel>
                  <FormHelperText fontSize="xs" mt={0}>
                    {textChatDisabled ? 'Text chat is disabled' : 'Text chat is enabled'}
                  </FormHelperText>
                </Box>
              </HStack>
              <Switch
                colorScheme="blue"
                isChecked={!textChatDisabled}
                onChange={handleTextChatToggle}
                isDisabled={isUpdatingSettings}
              />
            </FormControl>
          </VStack>
        </Box>

        <Divider borderColor="whiteAlpha.200" />

        {/* Access Settings */}
        <Box>
          <Text fontSize="xs" fontWeight="medium" color="gray.400" mb={3}>
            Access Control
          </Text>

          <VStack spacing={3} align="stretch">
            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <HStack spacing={2}>
                <Icon as={FiUsers} color="gray.400" />
                <Box>
                  <FormLabel mb={0} fontSize="sm" color="white">
                    Public Access
                  </FormLabel>
                  <FormHelperText fontSize="xs" mt={0}>
                    {accessibleToAllUsers
                      ? 'All registered users can access'
                      : 'Only authorized users can access'}
                  </FormHelperText>
                </Box>
              </HStack>
              <Switch
                colorScheme="blue"
                isChecked={accessibleToAllUsers}
                onChange={handleAccessibilityToggle}
                isDisabled={isUpdatingSettings}
              />
            </FormControl>

            <FormControl display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <FormLabel mb={0} fontSize="sm" color="white">
                  Allow Guest Users
                </FormLabel>
                <FormHelperText fontSize="xs" mt={0}>
                  {allowGuestUsers
                    ? 'Guest users can enter without account'
                    : 'Account required to enter'}
                </FormHelperText>
              </Box>
              <Switch
                colorScheme="blue"
                isChecked={allowGuestUsers}
                onChange={handleGuestUsersToggle}
                isDisabled={isUpdatingSettings}
              />
            </FormControl>

            {allowGuestUsers && (
              <FormControl
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                pl={4}
              >
                <Box>
                  <FormLabel mb={0} fontSize="sm" color="white">
                    Hide Sign-In Button
                  </FormLabel>
                  <FormHelperText fontSize="xs" mt={0}>
                    {hideGuestSignInButton
                      ? 'Sign-in button hidden for guests'
                      : 'Sign-in button visible for guests'}
                  </FormHelperText>
                </Box>
                <Switch
                  colorScheme="blue"
                  isChecked={hideGuestSignInButton}
                  onChange={handleHideSignInButtonToggle}
                  isDisabled={isUpdatingSettings}
                />
              </FormControl>
            )}
          </VStack>
        </Box>
      </VStack>
    </TabPanel>
  );
};

export default SettingsTab;
