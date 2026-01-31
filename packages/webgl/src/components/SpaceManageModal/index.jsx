import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  Text,
  Icon,
} from '@chakra-ui/react';
import {
  FiInfo,
  FiImage,
  FiCamera,
  FiSettings,
  FiUsers,
  FiVideo,
  FiTool,
} from 'react-icons/fi';

import { useSpaceManage } from './hooks/useSpaceManage';
import {
  DetailsTab,
  LogoTab,
  BackgroundTab,
  SettingsTab,
  UsersTab,
  StreamingTab,
  CustomTab,
} from './tabs';

/**
 * SpaceManageModal - Admin modal for managing space settings.
 * Refactored from 2594 lines to modular components.
 */
const SpaceManageModal = ({ isOpen, onClose }) => {
  const state = useSpaceManage(isOpen);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" backdropFilter="blur(8px)" />
      <ModalContent
        bg="#1a1a1a"
        color="white"
        borderRadius="xl"
        border="1px solid #333"
        maxW="800px"
        maxH="90vh"
        overflow="hidden"
      >
        <ModalHeader
          fontSize="md"
          fontWeight="600"
          pb={1}
          pt={3}
          px={4}
          color="white"
          borderBottom="1px solid"
          borderColor="whiteAlpha.200"
        >
          Manage Space
        </ModalHeader>

        <ModalCloseButton
          color="white"
          bg="rgba(255,255,255,0.1)"
          _hover={{ color: 'gray.400', bg: 'transparent' }}
          borderRadius="full"
          size="sm"
          top={2}
          right={3}
        />

        <ModalBody p={0} display="flex" overflow="hidden">
          <Tabs
            orientation="vertical"
            variant="unstyled"
            index={state.tabIndex}
            onChange={state.setTabIndex}
            display="flex"
            width="100%"
            height="100%"
          >
            <TabList
              bg="rgba(0, 0, 0, 0.2)"
              w="80px"
              py={4}
              borderRight="1px solid"
              borderColor="whiteAlpha.200"
              flexShrink={0}
            >
              <Tab
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={3}
                _selected={{ bg: 'whiteAlpha.100', color: 'blue.300' }}
                _hover={{ bg: 'whiteAlpha.50' }}
              >
                <Icon as={FiInfo} mb={1} />
                <Text fontSize="xs">Details</Text>
              </Tab>
              <Tab
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={3}
                _selected={{ bg: 'whiteAlpha.100', color: 'blue.300' }}
                _hover={{ bg: 'whiteAlpha.50' }}
              >
                <Icon as={FiImage} mb={1} />
                <Text fontSize="xs">Logo</Text>
              </Tab>
              <Tab
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={3}
                _selected={{ bg: 'whiteAlpha.100', color: 'blue.300' }}
                _hover={{ bg: 'whiteAlpha.50' }}
              >
                <Icon as={FiCamera} mb={1} />
                <Text fontSize="xs">Background</Text>
              </Tab>
              <Tab
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={3}
                _selected={{ bg: 'whiteAlpha.100', color: 'blue.300' }}
                _hover={{ bg: 'whiteAlpha.50' }}
              >
                <Icon as={FiSettings} mb={1} />
                <Text fontSize="xs">Settings</Text>
              </Tab>
              <Tab
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={3}
                _selected={{ bg: 'whiteAlpha.100', color: 'blue.300' }}
                _hover={{ bg: 'whiteAlpha.50' }}
              >
                <Icon as={FiUsers} mb={1} />
                <Text fontSize="xs">Users</Text>
              </Tab>
              <Tab
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={3}
                _selected={{ bg: 'whiteAlpha.100', color: 'blue.300' }}
                _hover={{ bg: 'whiteAlpha.50' }}
              >
                <Icon as={FiVideo} mb={1} />
                <Text fontSize="xs">Stream</Text>
              </Tab>
              <Tab
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={3}
                _selected={{ bg: 'whiteAlpha.100', color: 'blue.300' }}
                _hover={{ bg: 'whiteAlpha.50' }}
              >
                <Icon as={FiTool} mb={1} />
                <Text fontSize="xs">Custom</Text>
              </Tab>
            </TabList>

            <TabPanels
              flexGrow={1}
              display="flex"
              flexDirection="column"
              overflowY="auto"
              css={{
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-track': { background: 'rgba(0,0,0,0.1)' },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                },
              }}
            >
              <DetailsTab
                spaceID={state.spaceID}
                spaceName={state.spaceName}
                setSpaceName={state.setSpaceName}
                spaceDescription={state.spaceDescription}
                setSpaceDescription={state.setSpaceDescription}
                isSavingDetails={state.isSavingDetails}
                handleSaveSpaceDetails={state.handleSaveSpaceDetails}
              />

              <LogoTab
                existingLogo={state.existingLogo}
                previewUrl={state.previewUrl}
                selectedFile={state.selectedFile}
                isUploading={state.isUploading}
                uploadProgress={state.uploadProgress}
                fileInputRef={state.fileInputRef}
                handleFileChange={state.handleFileChange}
                handleUpload={state.handleUpload}
                handleDelete={state.handleDelete}
                handleBrowseClick={state.handleBrowseClick}
              />

              <BackgroundTab
                existingBackground={state.existingBackground}
                bgPreviewUrl={state.bgPreviewUrl}
                selectedBgFile={state.selectedBgFile}
                isBgUploading={state.isBgUploading}
                bgUploadProgress={state.bgUploadProgress}
                bgFileInputRef={state.bgFileInputRef}
                handleBgFileChange={state.handleBgFileChange}
                handleBgUpload={state.handleBgUpload}
                handleBgDelete={state.handleBgDelete}
                handleBgBrowseClick={state.handleBgBrowseClick}
                existingVideoBackground={state.existingVideoBackground}
                videoPreviewUrl={state.videoPreviewUrl}
                selectedVideoFile={state.selectedVideoFile}
                isVideoUploading={state.isVideoUploading}
                videoUploadProgress={state.videoUploadProgress}
                videoFileInputRef={state.videoFileInputRef}
                handleVideoFileChange={state.handleVideoFileChange}
                handleVideoUpload={state.handleVideoUpload}
                handleVideoDelete={state.handleVideoDelete}
                handleVideoBrowseClick={state.handleVideoBrowseClick}
              />

              <SettingsTab
                voiceDisabled={state.voiceDisabled}
                textChatDisabled={state.textChatDisabled}
                accessibleToAllUsers={state.accessibleToAllUsers}
                allowGuestUsers={state.allowGuestUsers}
                hideGuestSignInButton={state.hideGuestSignInButton}
                isUpdatingSettings={state.isUpdatingSettings}
                handleVoiceToggle={state.handleVoiceToggle}
                handleTextChatToggle={state.handleTextChatToggle}
                handleAccessibilityToggle={state.handleAccessibilityToggle}
                handleGuestUsersToggle={state.handleGuestUsersToggle}
                handleHideSignInButtonToggle={state.handleHideSignInButtonToggle}
              />

              <UsersTab
                spaceOwners={state.spaceOwners}
                spaceHosts={state.spaceHosts}
                isLoadingUsers={state.isLoadingUsers}
                bannedUsers={state.bannedUsers}
                unbanningUid={state.unbanningUid}
                handleUnbanUser={state.handleUnbanUser}
              />

              <StreamingTab
                streamingEnabled={state.streamingEnabled}
                setStreamingEnabled={state.setStreamingEnabled}
                hlsStreamUrl={state.hlsStreamUrl}
                setHlsStreamUrl={state.setHlsStreamUrl}
                rtmpUrl={state.rtmpUrl}
                setRtmpUrl={state.setRtmpUrl}
                streamKey={state.streamKey}
                setStreamKey={state.setStreamKey}
                isSavingStream={state.isSavingStream}
                playerStatus={state.playerStatus}
                isStreamLoading={state.isStreamLoading}
                handleSaveStreamSettings={state.handleSaveStreamSettings}
              />

              <CustomTab
                overrideEnabled={state.overrideEnabled}
                customPlayers={state.customPlayers}
                newPlayerUrl={state.newPlayerUrl}
                setNewPlayerUrl={state.setNewPlayerUrl}
                isSavingOverride={state.isSavingOverride}
                handleAddCustomPlayer={state.handleAddCustomPlayer}
                handleRemoveCustomPlayer={state.handleRemoveCustomPlayer}
                handleOverrideToggle={state.handleOverrideToggle}
                handleSaveOverrideSettings={state.handleSaveOverrideSettings}
              />
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SpaceManageModal;
