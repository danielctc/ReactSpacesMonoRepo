import React, { useState } from 'react';
import {
  TabPanel,
  Text,
  Box,
  Flex,
  Image,
  Button,
  Progress,
  HStack,
  Icon,
  Input,
  Tabs,
  TabList,
  Tab,
  TabPanels,
} from '@chakra-ui/react';
import { FiUpload, FiTrash2, FiImage, FiFilm } from 'react-icons/fi';

/**
 * Background Tab - Manages image and video backgrounds with nested tabs.
 */
const BackgroundTab = ({
  // Image background props
  existingBackground,
  bgPreviewUrl,
  selectedBgFile,
  isBgUploading,
  bgUploadProgress,
  bgFileInputRef,
  handleBgFileChange,
  handleBgUpload,
  handleBgDelete,
  handleBgBrowseClick,
  // Video background props
  existingVideoBackground,
  videoPreviewUrl,
  selectedVideoFile,
  isVideoUploading,
  videoUploadProgress,
  videoFileInputRef,
  handleVideoFileChange,
  handleVideoUpload,
  handleVideoDelete,
  handleVideoBrowseClick,
}) => {
  const [bgTabIndex, setBgTabIndex] = useState(0);

  return (
    <TabPanel p={4} display="flex" flexDirection="column">
      <Text fontSize="sm" fontWeight="600" mb={3} color="white">
        Space Background
      </Text>

      <Tabs variant="soft-rounded" size="sm" index={bgTabIndex} onChange={setBgTabIndex}>
        <TabList mb={4}>
          <Tab
            _selected={{ bg: 'blue.500', color: 'white' }}
            color="gray.400"
            fontSize="xs"
            mr={2}
          >
            <Icon as={FiImage} mr={1} />
            Image
          </Tab>
          <Tab _selected={{ bg: 'blue.500', color: 'white' }} color="gray.400" fontSize="xs">
            <Icon as={FiFilm} mr={1} />
            Video
          </Tab>
        </TabList>

        <TabPanels>
          {/* Image Background Tab */}
          <TabPanel p={0}>
            <Text fontSize="xs" mb={4}>
              Upload an image background for the loading screen.
            </Text>

            {(existingBackground || bgPreviewUrl) && (
              <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={4}>
                {existingBackground && (
                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.200"
                    flex="1"
                  >
                    <Text fontSize="xs" fontWeight="medium" mb={2}>
                      Current Background
                    </Text>
                    <Image
                      src={existingBackground}
                      alt="Background"
                      maxH="120px"
                      objectFit="cover"
                      borderRadius="md"
                      w="100%"
                    />
                  </Box>
                )}

                {bgPreviewUrl && (
                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    bg="whiteAlpha.50"
                    borderColor="blue.200"
                    flex="1"
                  >
                    <Text fontSize="xs" fontWeight="medium" mb={2} color="blue.300">
                      New Background Preview
                    </Text>
                    <Image
                      src={bgPreviewUrl}
                      alt="Preview"
                      maxH="120px"
                      objectFit="cover"
                      borderRadius="md"
                      w="100%"
                    />
                  </Box>
                )}
              </Flex>
            )}

            <Input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBgFileChange}
              display="none"
            />

            {isBgUploading && bgUploadProgress > 0 && (
              <Progress
                value={bgUploadProgress}
                size="sm"
                colorScheme="blue"
                mb={4}
                borderRadius="full"
              />
            )}

            <HStack spacing={3}>
              <Button
                leftIcon={<Icon as={FiUpload} />}
                onClick={handleBgBrowseClick}
                size="sm"
                variant="outline"
                colorScheme="blue"
                isDisabled={isBgUploading}
              >
                Browse
              </Button>

              {selectedBgFile && (
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={handleBgUpload}
                  isLoading={isBgUploading}
                  loadingText="Uploading..."
                >
                  Upload Background
                </Button>
              )}

              {existingBackground && !selectedBgFile && (
                <Button
                  leftIcon={<Icon as={FiTrash2} />}
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  onClick={handleBgDelete}
                  isLoading={isBgUploading}
                >
                  Remove
                </Button>
              )}
            </HStack>

            {selectedBgFile && (
              <Text fontSize="xs" mt={2} color="gray.400">
                Selected: {selectedBgFile.name}
              </Text>
            )}
          </TabPanel>

          {/* Video Background Tab */}
          <TabPanel p={0}>
            <Text fontSize="xs" mb={4}>
              Upload a video background (max 5MB). Supported: MP4, WebM.
            </Text>

            {(existingVideoBackground || videoPreviewUrl) && (
              <Flex direction={{ base: 'column', md: 'row' }} gap={4} mb={4}>
                {existingVideoBackground && (
                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    bg="whiteAlpha.50"
                    borderColor="whiteAlpha.200"
                    flex="1"
                  >
                    <Text fontSize="xs" fontWeight="medium" mb={2}>
                      Current Video
                    </Text>
                    <video
                      src={existingVideoBackground}
                      style={{ maxHeight: '120px', width: '100%', borderRadius: '6px' }}
                      controls
                      muted
                    />
                  </Box>
                )}

                {videoPreviewUrl && (
                  <Box
                    borderWidth="1px"
                    borderRadius="md"
                    p={3}
                    bg="whiteAlpha.50"
                    borderColor="blue.200"
                    flex="1"
                  >
                    <Text fontSize="xs" fontWeight="medium" mb={2} color="blue.300">
                      New Video Preview
                    </Text>
                    <video
                      src={videoPreviewUrl}
                      style={{ maxHeight: '120px', width: '100%', borderRadius: '6px' }}
                      controls
                      muted
                    />
                  </Box>
                )}
              </Flex>
            )}

            <Input
              ref={videoFileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoFileChange}
              display="none"
            />

            {isVideoUploading && videoUploadProgress > 0 && (
              <Progress
                value={videoUploadProgress}
                size="sm"
                colorScheme="blue"
                mb={4}
                borderRadius="full"
              />
            )}

            <HStack spacing={3}>
              <Button
                leftIcon={<Icon as={FiUpload} />}
                onClick={handleVideoBrowseClick}
                size="sm"
                variant="outline"
                colorScheme="blue"
                isDisabled={isVideoUploading}
              >
                Browse
              </Button>

              {selectedVideoFile && (
                <Button
                  colorScheme="blue"
                  size="sm"
                  onClick={handleVideoUpload}
                  isLoading={isVideoUploading}
                  loadingText="Uploading..."
                >
                  Upload Video
                </Button>
              )}

              {existingVideoBackground && !selectedVideoFile && (
                <Button
                  leftIcon={<Icon as={FiTrash2} />}
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  onClick={handleVideoDelete}
                  isLoading={isVideoUploading}
                >
                  Remove
                </Button>
              )}
            </HStack>

            {selectedVideoFile && (
              <Text fontSize="xs" mt={2} color="gray.400">
                Selected: {selectedVideoFile.name} (
                {(selectedVideoFile.size / 1024 / 1024).toFixed(2)} MB)
              </Text>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </TabPanel>
  );
};

export default BackgroundTab;
